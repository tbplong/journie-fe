/**
 * Evaluation of Journie for the paper. Two parts, both calling the app's own code against the real backend:
 *
 *  A. Extraction (`POST /chat`, Gemini): does the model read days, budget, interests, exclusions and must-visit names
 *     the way a person labelled them? Scored against `queries.jsonl`.
 *  B. Itinerary: given a correct reading of each query, does retrieval + the planner (`generateItinerary`) keep the hard
 *     constraints, compared with the same retrieved places packed in the backend's order without the planner?
 *
 * No Node APIs here: `run.mjs` bundles this file, reads the data and writes the results.
 */
import { extractConstraints } from '../src/api/extraction'
import { ApiError } from '../src/api/http'
import { retrievePlaces, takePlaces } from '../src/api/catalog'
import { buildInput, generateItinerary, type PlanRequest } from '../src/api/planner'
import { BLANK_EXTRACTION, type Constraint, type Extraction, type ExtractionResponse } from '../src/domain/extraction'
import { forRetrieval, intentFromExtraction, isExclusion } from '../src/domain/intentFromExtraction'
import { stopsCap, type PlanInput } from '../src/domain/planner'
import { normalize, poiById } from '../src/domain/pois'
import { MAX_MEALS, retimeDay } from '../src/domain/solver'
import { isAvoided } from '../src/domain/tags'
import { addDays } from '../src/domain/time'
import type { Day, Stop } from '../src/domain/types'

export type Gold = { days?: number | null; budget?: number | null; interests?: string[]; avoid?: string[]; must?: string[] }
export type Query = { id: string; group: string; text: string; gold: Gold }
export type Raw = { id: string; response?: ExtractionResponse; error?: string; ms: number; attempts: number }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0
}
/** 95% Wilson score interval for k successes in n trials. */
const wilson = (k: number, n: number): [number, number] => {
  if (!n) return [0, 0]
  const z = 1.96
  const p = k / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const a = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return [round((c - a) / d), round((c + a) / d)]
}

/* ───────── A. extraction ───────── */

const RETRYABLE = new Set(['llm-rate-limited', 'llm-upstream-error', 'llm-timeout', 'timeout', 'network'])
const ATTEMPTS = 4

/** Calls `/chat` for every query, one at a time (the model's free tier is rate limited), retrying temporary failures. */
export async function collect(queries: Query[], log: (line: string) => void, pauseMs = 2500): Promise<Raw[]> {
  const out: Raw[] = []
  for (const [index, query] of queries.entries()) {
    let raw: Raw = { id: query.id, error: 'not-run', ms: 0, attempts: 0 }
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const t0 = performance.now()
      try {
        const response = await extractConstraints(query.text)
        raw = { id: query.id, response, ms: Math.round(performance.now() - t0), attempts: attempt }
        break
      } catch (error) {
        const code = error instanceof ApiError ? error.code : 'unknown'
        raw = { id: query.id, error: code, ms: Math.round(performance.now() - t0), attempts: attempt }
        if (!RETRYABLE.has(code) || attempt === ATTEMPTS) break
        await sleep(error instanceof ApiError && error.retryAfter ? error.retryAfter * 1000 : 6000 * attempt)
      }
    }
    log(`[${index + 1}/${queries.length}] ${query.id} ${raw.error ?? 'ok'} ${raw.ms}ms (attempts ${raw.attempts})`)
    out.push(raw)
    await sleep(pauseMs)
  }
  return out
}

const norm = (text: string) => normalize(text).replace(/\s+/g, ' ').trim()
/** The same string once accents, case, spacing and the English/Vietnamese names of coffee and seafood are ignored: "haisan" = "hải sản" = "seafood", "cafe" = "cà phê". */
const squash = (text: string) => norm(text).replace(/\b(ca phe|coffee)\b/g, 'cafe').replace(/\b(hai san|seafood)\b/g, 'haisan').replace(/ /g, '')
/** Two phrases name the same thing when one contains the other (accents and case ignored): "hải sản" ~ "các món hải sản". */
const sameText = (a: string, b: string) => {
  const x = norm(a)
  const y = norm(b)
  return (x.length >= 2 && y.length >= 2 && (x.includes(y) || y.includes(x))) || (Math.min(squash(a).length, squash(b).length) >= 4 && (squash(a).includes(squash(b)) || squash(b).includes(squash(a))))
}
const uniq = (list: string[]) => [...new Map(list.map((item) => [norm(item), item])).values()]

/** What the model said, read the way the app reads it: an exclusion filed under another field still counts as one. */
function predicted(e: Extraction) {
  const atoms: Constraint[] = [...e.hard_constraints, ...e.soft_constraints]
  return {
    days: e.duration_days,
    budget: e.budget_vnd,
    interests: uniq(e.interests.map((item) => item.toLowerCase())),
    avoid: uniq([...e.avoid, ...atoms.filter(isExclusion).map((atom) => atom.value)]),
    must: uniq([...e.must_visit, ...atoms.filter((atom) => atom.field === 'must_visit' && atom.operator !== 'exclude').map((atom) => atom.value)]),
  }
}

type SetCount = { n: number; tp: number; fp: number; fn: number; exact: number }
const blankSet = (): SetCount => ({ n: 0, tp: 0, fp: 0, fn: 0, exact: 0 })
function addSet(into: SetCount, gold: string[], pred: string[], same: (a: string, b: string) => boolean) {
  const tp = gold.filter((g) => pred.some((p) => same(g, p))).length
  const fp = pred.filter((p) => !gold.some((g) => same(g, p))).length
  const fn = gold.length - tp
  into.n++
  into.tp += tp
  into.fp += fp
  into.fn += fn
  if (!fp && !fn) into.exact++
  return { tp, fp, fn }
}
const setReport = (c: SetCount) => {
  const precision = c.tp + c.fp ? c.tp / (c.tp + c.fp) : 1
  const recall = c.tp + c.fn ? c.tp / (c.tp + c.fn) : 1
  return { queries: c.n, tp: c.tp, fp: c.fp, fn: c.fn, precision: round(precision), recall: round(recall), f1: round(precision + recall ? (2 * precision * recall) / (precision + recall) : 0), exactMatch: round(c.n ? c.exact / c.n : 0) }
}

export function scoreExtraction(queries: Query[], raws: Raw[]) {
  const byId = new Map(raws.map((raw) => [raw.id, raw]))
  const scalar = { days: { stated: [0, 0], absent: [0, 0] }, budget: { stated: [0, 0], absent: [0, 0] } } as Record<'days' | 'budget', Record<'stated' | 'absent', [number, number]>>
  const sets = { interests: blankSet(), avoid: blankSet(), must: blankSet() }
  // The same exclusions and names as the app shows them on the review screen (chips), after its own reading of the model's answer
  const appSets = { avoid: blankSet(), must: blankSet() }
  const misses: { id: string; text: string; field: string; gold: unknown; predicted: unknown }[] = []
  const failed: { id: string; error: string }[] = []
  const times: number[] = []
  let attempts = 0

  for (const query of queries) {
    const raw = byId.get(query.id)
    if (!raw) continue
    attempts += raw.attempts
    if (!raw.response) {
      failed.push({ id: query.id, error: raw.error ?? 'unknown' })
      continue
    }
    times.push(raw.ms)
    const pred = predicted(raw.response.extraction)
    for (const field of ['days', 'budget'] as const) {
      const gold = query.gold[field]
      if (gold === undefined) continue
      const bucket = scalar[field][gold === null ? 'absent' : 'stated']
      bucket[0]++
      if (pred[field] === gold) bucket[1]++
      else misses.push({ id: query.id, text: query.text, field, gold, predicted: pred[field] })
    }
    const chips = intentFromExtraction(raw.response).chips
    const shown = { avoid: chips.filter((c) => c.field === 'avoid').flatMap((c) => [c.vi, c.en]), must: chips.filter((c) => c.field === 'must').flatMap((c) => [c.vi, c.en]) }
    for (const field of ['avoid', 'must'] as const) {
      const gold = query.gold[field]
      if (gold === undefined) continue
      // Each chip is a vi/en pair of one thing: count it once by keeping the Vietnamese text
      const { fp, fn } = addSet(appSets[field], gold, shown[field].filter((_, index) => index % 2 === 0), sameText)
      if (fp || fn) misses.push({ id: query.id, text: query.text, field: `${field} (as the app reads it)`, gold, predicted: shown[field].filter((_, index) => index % 2 === 0) })
    }
    const same = (field: 'interests' | 'avoid' | 'must') => (field === 'interests' ? (a: string, b: string) => norm(a) === norm(b) : sameText)
    for (const field of ['interests', 'avoid', 'must'] as const) {
      const gold = query.gold[field]
      if (gold === undefined) continue
      const { fp, fn } = addSet(sets[field], gold, pred[field], same(field))
      if (fp || fn) misses.push({ id: query.id, text: query.text, field, gold, predicted: pred[field] })
    }
  }

  const acc = ([n, ok]: [number, number]) => ({ n, correct: ok, accuracy: n ? round(ok / n) : null })
  return {
    queries: queries.length,
    answered: times.length,
    failed,
    callsPerQuery: round(attempts / Math.max(1, raws.length), 2),
    latencyMs: { mean: Math.round(mean(times)), p50: percentile(times, 0.5), p95: percentile(times, 0.95) },
    days: { stated: acc(scalar.days.stated), absent: acc(scalar.days.absent) },
    budget: { stated: acc(scalar.budget.stated), absent: acc(scalar.budget.absent) },
    interests: setReport(sets.interests),
    avoid: setReport(sets.avoid),
    mustVisit: setReport(sets.must),
    asTheAppReadsIt: { avoid: setReport(appSets.avoid), mustVisit: setReport(appSets.must) },
    misses,
  }
}

/* ───────── B. itinerary ───────── */

const PACES = ['slow', 'balanced', 'fast'] as const
const MODES = ['walk', 'bike', 'taxi'] as const
const FIRST_DAY = '2026-11-23'

/** A gold reading as the backend would return it, so the scenario runs through the app's own code path. */
function goldExtraction(query: Query, days: number, budget: number): Extraction {
  const g = query.gold
  const atom = (field: Constraint['field'], operator: Constraint['operator']) => (value: string): Constraint => ({ field, operator, value })
  return {
    ...BLANK_EXTRACTION,
    destination: 'Ho Chi Minh City',
    duration_days: days,
    budget_vnd: budget,
    interests: g.interests ?? [],
    avoid: g.avoid ?? [],
    must_visit: g.must ?? [],
    hard_constraints: [...(g.avoid ?? []).map(atom('avoid', 'exclude')), ...(g.must ?? []).map(atom('must_visit', 'include'))],
    soft_constraints: (g.interests ?? []).map(atom('interests', 'prefer')),
  }
}

type Metrics = {
  stops: number
  fullness: number
  closed: number
  overtime: number
  closedDay: number
  overBudget: boolean
  avoided: number
  mealDays: number
  duplicates: number
  mustMissing: number
  mustTotal: number
  interestHit: number | null
  travelMin: number
  waitMin: number
  costVnd: number
  hardOk: boolean
}

function measure(days: Day[], input: PlanInput, pinned: string[], interestCats: string[]): Metrics {
  const weekday0 = new Date(`${input.startDate}T00:00:00Z`).getUTCDay()
  const avoid = new Set(input.avoidTags)
  const ids: string[] = []
  const m: Metrics = { stops: 0, fullness: 0, closed: 0, overtime: 0, closedDay: 0, overBudget: false, avoided: 0, mealDays: 0, duplicates: 0, mustMissing: 0, mustTotal: pinned.length, interestHit: null, travelMin: 0, waitMin: 0, costVnd: 0, hardOk: false }
  let hits = 0
  days.forEach((day, di) => {
    // The same clock and travel model for both systems: stops are laid out in their order and checked against opening hours and the day window
    const { stops, violations } = retimeDay(day.stops, { city: input.city, dayStart: input.dayStart, dayEnd: input.dayEnd, transport: input.transport })
    m.closed += violations.filter((v) => v.kind === 'closed').length
    m.overtime += violations.filter((v) => v.kind === 'overtime').length
    let meals = 0
    for (const stop of stops) {
      const poi = poiById[stop.poiId]
      ids.push(poi.id)
      m.stops++
      m.costVnd += poi.cost + stop.travelCost
      m.travelMin += stop.travelMin
      m.waitMin += stop.wait
      if (poi.closedDays.includes((weekday0 + di) % 7)) m.closedDay++
      if (isAvoided(poi, avoid)) m.avoided++
      if (poi.cat === 'food') meals++
      if (interestCats.includes(poi.cat)) hits++
    }
    if (meals > MAX_MEALS) m.mealDays++
  })
  m.overBudget = m.costVnd > input.budget
  m.duplicates = ids.length - new Set(ids).size
  m.mustMissing = pinned.filter((id) => !ids.includes(id)).length
  m.fullness = round(m.stops / (Math.max(1, days.length) * stopsCap(input)))
  m.interestHit = interestCats.length && m.stops ? round(hits / m.stops) : null
  m.hardOk = !m.closed && !m.overtime && !m.closedDay && !m.overBudget && !m.avoided && !m.mealDays && !m.duplicates
  return m
}

const blankStop = (poiId: string): Stop => ({ uid: poiId, poiId, start: 0, end: 0, visit: poiById[poiId].visit, travelMin: 0, travelKm: 0, travelCost: 0, mode: 'walk', wait: 0, locked: false })

export type ScenarioRow = {
  id: string
  text: string
  days: number
  budget: number
  pace: string
  transport: string
  solverStatus?: string
  plannerMs?: number
  planner?: Metrics
  baseline?: Metrics
  error?: string
}

export async function runItinerary(queries: Query[], log: (line: string) => void): Promise<ScenarioRow[]> {
  const rows: ScenarioRow[] = []
  for (const [i, query] of queries.entries()) {
    const days = query.gold.days ?? [1, 2, 3][i % 3]
    const budget = query.gold.budget ?? days * [1_000_000, 1_500_000, 2_000_000][Math.floor(i / 3) % 3]
    const pace = PACES[i % 3]
    const transport = MODES[Math.floor(i / 3) % 3]
    const row: ScenarioRow = { id: query.id, text: query.text, days, budget, pace, transport }
    try {
      const extraction = goldExtraction(query, days, budget)
      const intent = intentFromExtraction({ extraction })
      const request: PlanRequest = {
        text: query.text,
        userId: 'eval',
        profile: { userId: 'eval', name: 'eval', about: '', pace: 'balanced', interests: {}, dietary: [], transport: 'bike', alerts: { traffic: true, weather: true, closure: true, delay: true }, saved: [] },
        overrides: { days, budget, pace, transport, startDate: addDays(FIRST_DAY, i % 7) },
      }
      const input = buildInput(request, intent)
      const cats = Object.keys(input.interests).filter((cat) => (input.interests as Record<string, number>)[cat] > 0)

      // Baseline: the places the backend returned, in its order, cut into days without the planner
      const found = takePlaces(await retrievePlaces(forRetrieval(extraction), { limit: 20 }))
      const pinned = found.pinned.map((poi) => poi.id)
      const order = [...pinned, ...found.candidates.map((poi) => poi.id).filter((id) => !pinned.includes(id))]
      const cap = stopsCap(input)
      const n = Math.min(input.days, 7)
      const naive: Day[] = Array.from({ length: n }, (_, index) => ({ index, stops: order.slice(index * cap, (index + 1) * cap).map(blankStop) }))
      row.baseline = measure(naive, input, pinned, cats)

      const report = await generateItinerary(request, intent)
      row.solverStatus = report.trip.solver.status
      row.plannerMs = report.trip.solver.ms
      row.planner = measure(report.trip.days, input, pinned, cats)
    } catch (error) {
      row.error = error instanceof ApiError ? error.code : error instanceof Error ? error.message : 'unknown'
    }
    log(`[${i + 1}/${queries.length}] ${query.id} ${row.error ?? `planner ${row.planner?.hardOk ? 'ok' : 'VIOLATION'} · baseline ${row.baseline?.hardOk ? 'ok' : 'violation'}`}`)
    rows.push(row)
  }
  return rows
}

function summarize(list: Metrics[]) {
  const n = list.length
  const rate = (f: (m: Metrics) => boolean) => round(n ? list.filter(f).length / n : 0)
  const withMust = list.filter((m) => m.mustTotal > 0)
  const withInterest = list.filter((m) => m.interestHit !== null)
  const ok = list.filter((m) => m.hardOk).length
  return {
    scenarios: n,
    allHardConstraintsKept: { count: ok, rate: round(n ? ok / n : 0), ci95: wilson(ok, n) },
    scenariosWith: {
      closedAtVisit: rate((m) => m.closed > 0),
      pastDayEnd: rate((m) => m.overtime > 0),
      closedThatWeekday: rate((m) => m.closedDay > 0),
      overBudget: rate((m) => m.overBudget),
      avoidedPlace: rate((m) => m.avoided > 0),
      moreThanMaxMealsADay: rate((m) => m.mealDays > 0),
      duplicatePlace: rate((m) => m.duplicates > 0),
    },
    mustVisitCoverage: withMust.length ? round(mean(withMust.map((m) => 1 - m.mustMissing / m.mustTotal))) : null,
    mustVisitScenarios: withMust.length,
    interestHitRate: withInterest.length ? round(mean(withInterest.map((m) => m.interestHit ?? 0))) : null,
    interestScenarios: withInterest.length,
    stopsPerScenario: round(mean(list.map((m) => m.stops)), 1),
    fullness: round(mean(list.map((m) => m.fullness))),
    travelMinPerStop: round(mean(list.map((m) => (m.stops ? m.travelMin / m.stops : 0))), 1),
    waitMinPerStop: round(mean(list.map((m) => (m.stops ? m.waitMin / m.stops : 0))), 1),
    spendOfBudget: null as number | null,
  }
}

export function scoreItinerary(rows: ScenarioRow[]) {
  const ok = rows.filter((row) => row.planner && row.baseline)
  const planner = summarize(ok.map((row) => row.planner!))
  const baseline = summarize(ok.map((row) => row.baseline!))
  const spend = (pick: (row: ScenarioRow) => Metrics | undefined) => round(mean(ok.map((row) => (pick(row)!.costVnd / row.budget))))
  planner.spendOfBudget = spend((row) => row.planner)
  baseline.spendOfBudget = spend((row) => row.baseline)
  const ms = ok.map((row) => row.plannerMs ?? 0)
  return {
    scenarios: rows.length,
    failed: rows.filter((row) => row.error).map((row) => ({ id: row.id, error: row.error })),
    planner,
    baseline,
    pairedHardConstraints: {
      plannerOnly: ok.filter((row) => row.planner!.hardOk && !row.baseline!.hardOk).length,
      baselineOnly: ok.filter((row) => !row.planner!.hardOk && row.baseline!.hardOk).length,
      both: ok.filter((row) => row.planner!.hardOk && row.baseline!.hardOk).length,
      neither: ok.filter((row) => !row.planner!.hardOk && !row.baseline!.hardOk).length,
    },
    plannerMs: { mean: Math.round(mean(ms)), p50: percentile(ms, 0.5), p95: percentile(ms, 0.95) },
    solverStatus: Object.fromEntries([...new Set(ok.map((row) => row.solverStatus))].map((status) => [status, ok.filter((row) => row.solverStatus === status).length])),
  }
}
