import { cityById, poiById } from './pois'
import { haversineKm, travelLeg } from './geo'
import { placeName } from './placeText'
import { DAY_MINUTES, fmtClock, weekdayOf } from './time'
import type { CityId, Day, Pace, Poi, Stop, TransportPref, Violation } from './types'

/**
 * Orienteering-with-time-windows solver (report §5.7, §6.3.3).
 *
 * The production backend uses OR-Tools CP-SAT. This is a faithful in-browser stand-in: an exact
 * depth-first search with branch-and-bound over the ordered subsets of a candidate set, honouring
 * the same hard constraints (opening windows, travel time, day window, budget, mandatory POIs).
 * Because it enumerates every feasible ordering of the candidates, a single-day result is OPTIMAL
 * for the modelled objective; multi-day plans are decomposed day by day and reported FEASIBLE.
 */

export const MAX_STOPS: Record<Pace, number> = { slow: 4, balanced: 6, fast: 8 }
const TRAVEL_PENALTY = 0.22
const WAIT_PENALTY = 0.12
/** Longest sensible wait for a venue to open (minutes); longer plans are rejected. */
const MAX_WAIT = 75
const MEAL_BONUS = 7
/** Most sit-down meals in a day, and the least time between two of them (minutes, start to start): nobody eats five times or twice in a row. */
export const MAX_MEALS = 3
/** Evening venues (bars, pubs, clubs) the planner picks for one day: one evening out. Places the traveler names are not counted. */
export const MAX_NIGHTLIFE = 1
/** Cafés the planner picks for one day, as the backend's `day_max` rule has it. Places the traveler names are not counted. */
export const MAX_CAFES = 2
/**
 * What a new plan's own picks may hold in one day at each pace: cafés and heavy stops above these cost score points, museum-type stops
 * (museums, galleries) above `museums` are not picked, and `meals` is how many sit-down meals a day should have. The backend has no pace
 * and uses the widest values (journie-be `routing/config/rules.yaml`, rules-v4).
 */
export type DayLimits = { cafes: number; museums: number; heavy: number; meals: number; religious: number }
// `religious`: pagodas, temples and churches a day ("không 3 chùa một ngày"): one on a slow or balanced day, two on a fast day of eight stops
export const PACE_LIMITS: Record<Pace, DayLimits> = {
  slow: { cafes: 1, museums: 1, heavy: 1, meals: 1, religious: 1 },
  balanced: { cafes: 2, museums: 2, heavy: 2, meals: 2, religious: 1 },
  fast: { cafes: 2, museums: 2, heavy: 3, meals: 2, religious: 2 },
}
/** Score points a day loses for each heavy stop and each café over its limit. */
const HEAVY_PENALTY = 20
const CAFE_PENALTY = 20
/** Score points a day loses for a missing first and second sit-down meal. */
const MISSING_MEAL = [40, 30]
/** A day that starts after this has no breakfast: two sit-down meals at most. */
const BREAKFAST_UNTIL = 9 * 60 + 30
/** A museum-type stop (a museum or a gallery: both carry the `museum` tag). */
export const isMuseum = (poi: Poi) => poi.tags.includes('museum')
/** A pagoda, temple, shrine or church: the planner picks `PACE_LIMITS[pace].religious` a day at most (the backend's `day_max` is the widest), since a city's culture places are mostly pagodas. */
export const isReligious = (poi: Poi) => poi.tags.includes('temple') || poi.tags.includes('church')
/** Pagodas or churches a day when the pace is not known (an edit's own picks). */
export const MAX_RELIGIOUS = 1
/** A place this far from the city centre is an excursion (Cầu Vàng, 26 km out in the Bà Nà hills): the traveler adds it, the planner does not pick it. */
const EXCURSION_KM = 15
/** Kinds of place the planner picks at most `MAX_SAME_KIND` of in one day (the backend's `day_max` for markets and parks). */
const SAME_KIND_TAGS = ['market', 'park']
export const MAX_SAME_KIND = 2
/** An evening venue is not started before this, as the backend's `not_before` rule has it (journie-be `routing/config/rules.yaml`). */
export const EVENING_START = 18 * 60

/** `visitSlot` for the planner: an evening venue is never started before the evening, so one that cannot be visited then does not fit. */
export function planSlot(poi: Poi, arrive: number, visit: number, weekday: number | undefined, through?: number) {
  return visitSlot(poi, poi.evening ? Math.max(arrive, EVENING_START) : arrive, visit, weekday, through)
}
const MEAL_GAP = 150
const NODE_LIMIT = 300_000
/** The first stop of a day without an origin is reached for free on the device. */
const FREE_HOP = { km: 0, min: 0, cost: 0, mode: 'walk' as const }
/** shortcut: a fixed guess at the backend's first leg (city centre to the first stop, ride at 20 km/h); use the real leg if the planner ever gets an origin. */
const FIRST_LEG_ALLOWANCE = 20
/** shortcut: minutes a new plan's own pick ends before its place closes, for the backend's later timing; drop once both share one timing. */
const CLOSE_SLACK = 20

export type DayProblem = {
  city: CityId
  candidates: Poi[]
  scores: Map<string, number>
  dayStart: number
  dayEnd: number
  maxStops: number
  transport: TransportPref
  budgetLeft: number
  mustInclude: Set<string>
  /** Where the traveler stands when the plan starts (replanning), else the first stop is free. */
  origin?: { lat: number; lng: number }
  /** The traveler is already out at `dayStart` (replanning): the first stop's wait counts and is limited even without an origin. */
  resume?: boolean
  /** Multiplier on motorised legs (traffic). */
  congestion?: number
  /** Outdoor venues may not be *started* inside [from, until) (heavy rain). */
  rainWindow?: { from: number; until: number }
  /** Extra objective term evaluated on a complete sequence (replanning change cost). */
  extra?: (poiIds: string[], starts: number[]) => number
  /** The day's date (ISO), so visits fall in that weekday's opening intervals; without it, in each place's summary window. */
  date?: string
  /** A new plan's own picks: at most `MAX_CAFES` cafés, and no two food or café stops in a row while another kind of place still fits. */
  varied?: boolean
  /** With `varied`: the day's limits at the trip's pace (`PACE_LIMITS`): a museum cap, no two museums in a row while another place fits, and costs for heavy stops, cafés and missing meals. */
  limits?: DayLimits
  /**
   * Stops of the trip being edited: the meal and café limits, which are for the planner's own picks, do not drop them. The places the edit
   * adds keep those limits, counting these, and the `varied` order rules (meals in meal hours, no two food or café stops in a row).
   */
  kept?: ReadonlySet<string>
  /** When set, `kept` stops are not limited by money and the other places may spend this much in all (an edit adding to a trip). */
  freshBudgetLeft?: number
  /** Earliest start per place id (minutes): a meal the plan holds for its window is not started before it, and that wait is not limited. */
  floors?: ReadonlyMap<string, number>
}

export type DayResult = {
  stops: Stop[]
  objective: number
  nodes: number
  complete: boolean
  utility: number
  travelMin: number
  feasible: boolean
}

let uidCounter = 0
export const newUid = () => `s${Date.now().toString(36)}${(uidCounter++).toString(36)}`

const isFoodStop = (poi: Poi) => poi.cat === 'food' || poi.cat === 'cafe'
const isSitDown = (poi: Poi) => poi.cat === 'food'
const isCafe = (poi: Poi) => poi.cat === 'cafe'

const isMealSlot = (poi: Poi, start: number) =>
  (poi.cat === 'food' || poi.tags.includes('street-food')) &&
  ((start >= 660 && start < 840) || (start >= 1050 && start < 1230))

/**
 * A place's opening intervals on a weekday (0 = Sunday); without a weekday, or when its hours are unknown, its summary window.
 * `through` is the minute the day runs to: past midnight (1620 is 03:00) the place keeps the next weekday's hours a day later on the
 * clock, so a 24/7 place stays open and a phở shop opening at 05:00 opens at 1740 (on a day that runs that late). Only known hours count
 * then: a place whose hours are unknown is not taken to be open in the small hours.
 */
export const windowsOn = (poi: Poi, weekday?: number, through?: number): [number, number][] => {
  const own = (weekday === undefined ? undefined : poi.windows?.[weekday]) ?? [[poi.open, poi.close]]
  if (through === undefined || through <= DAY_MINUTES || !poi.windows) return own
  const next = weekday === undefined ? [[poi.open, poi.close] as [number, number]] : poi.windows[(weekday + 1) % 7]
  // Only the next day's hours that open before the day ends: a place that is shut until the next evening stays shut, not "open tomorrow".
  // Each day's hours end by midnight, so the next day's follow on; a place open across midnight is one interval
  const after = next.map(([open, close]): [number, number] => [open + DAY_MINUTES, close + DAY_MINUTES]).filter(([open]) => open < through)
  return [...own, ...after].reduce<[number, number][]>((out, [open, close]) => {
    const last = out[out.length - 1]
    if (last && open <= last[1]) last[1] = Math.max(last[1], close)
    else out.push([open, close])
    return out
  }, [])
}

/**
 * When a visit of `visit` minutes arriving at `arrive` starts: in the first interval still open long enough, so arriving during a
 * lunch break means waiting for the afternoon. When none is, the interval it runs over (`fits` false); null when the place is closed that day.
 */
export function visitSlot(poi: Poi, arrive: number, visit: number, weekday?: number, through?: number): { start: number; close: number; fits: boolean } | null {
  const windows = windowsOn(poi, weekday, through)
  if (!windows.length) return null
  for (const [open, close] of windows) if (Math.max(arrive, open) + visit <= close) return { start: Math.max(arrive, open), close, fits: true }
  const [open, close] = windows.find((window) => window[1] > arrive) ?? windows[windows.length - 1]
  return { start: Math.max(arrive, open), close, fits: false }
}

export function solveDay(problem: DayProblem): DayResult {
  const { candidates, scores, dayStart, dayEnd, maxStops, transport, budgetLeft, mustInclude, origin } = problem
  const city = cityById[problem.city]
  const congestion = problem.congestion ?? 1
  const weekday = problem.date ? weekdayOf(problem.date) : undefined
  const n = candidates.length
  const unitScore = candidates.map((poi) => (scores.get(poi.id) ?? 0) * 100)
  const sortedDesc = [...unitScore].sort((a, b) => b - a)
  const mustIdx = candidates.map((poi, i) => (mustInclude.has(poi.id) ? i : -1)).filter((i) => i >= 0)

  let best: { obj: number; seq: number[]; starts: number[]; utility: number; travel: number } = {
    obj: -Infinity,
    seq: [],
    starts: [],
    utility: 0,
    travel: 0,
  }
  let nodes = 0
  let complete = true

  // Cache leg estimates: (from index or -1 for origin) × to index.
  const legCache = new Map<number, ReturnType<typeof travelLeg>>()
  const leg = (from: number, to: number) => {
    const key = (from + 1) * 64 + to
    let value = legCache.get(key)
    if (!value) {
      const a = from < 0 ? origin : candidates[from]
      value = a ? travelLeg(a, candidates[to], transport, city, congestion) : { km: 0, min: 0, cost: 0, mode: 'walk' as const }
      legCache.set(key, value)
    }
    return value
  }

  const seq: number[] = []
  const starts: number[] = []
  const used: boolean[] = new Array(n).fill(false)
  const mealStarts: number[] = []
  let cafes = 0
  let museums = 0
  let heavies = 0
  const limits = problem.varied ? problem.limits : undefined
  const maxMeals = dayStart > BREAKFAST_UNTIL ? Math.min(MAX_MEALS, 2) : MAX_MEALS
  // The trip's own stops not yet placed in the current order, of one kind
  const keptAt = problem.kept ? candidates.flatMap((poi, i) => (problem.kept!.has(poi.id) ? [i] : [])) : []
  const keptLeft = (kind: (poi: Poi) => boolean) => keptAt.reduce((count, j) => count + (!used[j] && kind(candidates[j]) ? 1 : 0), 0)
  // Places of one kind already in the current order
  const placed = (kind: (poi: Poi) => boolean) => seq.reduce((count, j) => count + (kind(candidates[j]) ? 1 : 0), 0)

  /** Candidate `i` as the next stop after `last`, or null when it cannot be reached and visited in time and within the money. */
  const reach = (i: number, time: number, last: number, spent: number, fresh: number) => {
    const poi = candidates[i]
    if (problem.varied && !mustInclude.has(poi.id) && haversineKm(city, poi) > EXCURSION_KM) return null
    const hop = seq.length === 0 && !origin ? FREE_HOP : leg(last, i)
    const arrive = time + hop.min
    const floor = problem.floors?.get(poi.id) ?? 0
    const slot = planSlot(poi, Math.max(arrive, floor), poi.visit, weekday, dayEnd)
    if (!slot?.fits) return null
    // The backend times the first leg from the city centre; a new plan's own first pick must still fit after it
    if (problem.varied && hop === FREE_HOP && !mustInclude.has(poi.id) && !planSlot(poi, Math.max(arrive + FIRST_LEG_ALLOWANCE, floor), poi.visit, weekday, dayEnd)?.fits) return null
    const start = slot.start
    const end = start + poi.visit
    if (end > dayEnd) return null
    // A new plan's own pick ends a little before its place closes: the backend's day runs later than the device's (its ride out, its rest)
    if (problem.varied && !mustInclude.has(poi.id) && !poi.evening && slot.close - end < CLOSE_SLACK) return null
    // An evening venue closes the day whenever the day's other places end: the hours before it opens are the traveler's own
    if (!(seq.length === 0 && !origin && !problem.resume) && !poi.evening && floor <= arrive && !problem.kept?.has(poi.id) && start - arrive > MAX_WAIT) return null
    if (problem.rainWindow && !poi.indoor && start >= problem.rainWindow.from && start < problem.rainWindow.until) return null
    const price = poi.cost + hop.cost
    const broke = problem.freshBudgetLeft === undefined ? spent + price > budgetLeft : !problem.kept?.has(poi.id) && fresh + price > problem.freshBudgetLeft
    // Time spent until a floor (a meal held for its window) is the traveler's own, not waiting
    return broke ? null : { hop, arrive, start, end, price, idle: start - Math.max(arrive, floor) }
  }

  const evaluate = (utility: number, travel: number, wait: number, meals: number) => {
    if (!mustIdx.every((i) => used[i])) return
    let obj = utility - TRAVEL_PENALTY * travel - WAIT_PENALTY * wait + MEAL_BONUS * meals
    if (limits) {
      obj -= HEAVY_PENALTY * Math.max(0, heavies - limits.heavy) + CAFE_PENALTY * Math.max(0, cafes - limits.cafes)
      for (let k = mealStarts.length; k < limits.meals; k += 1) obj -= MISSING_MEAL[Math.min(k, MISSING_MEAL.length - 1)]
    }
    if (problem.extra) obj += problem.extra(seq.map((i) => candidates[i].id), starts)
    if (obj > best.obj + 1e-9) best = { obj, seq: [...seq], starts: [...starts], utility, travel }
  }

  const dfs = (time: number, last: number, spent: number, fresh: number, utility: number, travel: number, wait: number, lunch: boolean, dinner: boolean) => {
    if (nodes++ > NODE_LIMIT) {
      complete = false
      return
    }
    evaluate(utility, travel, wait, (lunch ? 1 : 0) + (dinner ? 1 : 0))
    if (seq.length >= maxStops) return

    // Optimistic bound: best remaining scores plus both meal bonuses, ignoring all penalties.
    let bound = utility + 2 * MEAL_BONUS
    for (let k = 0, taken = 0; k < sortedDesc.length && taken < maxStops - seq.length; k += 1, taken += 1) bound += sortedDesc[k]
    // `extra` is a pure penalty (<= 0), so the optimistic bound stays valid with it.
    if (bound <= best.obj) return

    // Whether a place that is neither food nor a bar could come next (worked out once, when a second food stop in a row is considered)
    let otherNext: boolean | undefined
    let otherThanMuseum: boolean | undefined
    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue
      const poi = candidates[i]
      const step = reach(i, time, last, spent, fresh)
      if (!step) continue
      const { hop, start, end, price, idle } = step
      // A place the traveler insisted on is never dropped for the meal limit
      const sitDown = poi.cat === 'food'
      // The plan's own pick: in a new plan anything not insisted on, in an edit a place the trip did not have. It keeps the day's meal and café
      // limits counting the trip's own stops still to come, so a new café put before two kept ones does not make three
      const ownPick = !mustInclude.has(poi.id) && (problem.varied || (problem.kept !== undefined && !problem.kept.has(poi.id)))
      if (sitDown && !mustInclude.has(poi.id) && !problem.kept?.has(poi.id) && (mealStarts.length + keptLeft(isSitDown) >= maxMeals || (mealStarts.length > 0 && start - mealStarts[mealStarts.length - 1] < MEAL_GAP))) continue
      if (ownPick && poi.cat === 'cafe' && cafes + keptLeft(isCafe) >= MAX_CAFES) continue
      // A varied day: one pagoda or church, two markets or parks, counting the places already on it
      if (ownPick && isReligious(poi) && placed(isReligious) + keptLeft(isReligious) >= (problem.limits?.religious ?? MAX_RELIGIOUS)) continue
      const kind = SAME_KIND_TAGS.find((tag) => poi.tags.includes(tag))
      const ofKind = (other: Poi) => !!kind && other.tags.includes(kind)
      if (ownPick && kind && placed(ofKind) + keptLeft(ofKind) >= MAX_SAME_KIND) continue
      if (ownPick) {
        // A sit-down place the plan picks is a meal: breakfast, or inside the lunch or dinner window, while another kind of place still fits
        if (sitDown && !problem.kept?.has(poi.id) && start >= BREAKFAST_UNTIL && !isMealSlot(poi, start)) {
          otherNext ??= candidates.some((other, j) => !used[j] && !isFoodStop(other) && !other.evening && !!reach(j, time, last, spent, fresh))
          if (otherNext) continue
        }
        if (limits && isMuseum(poi) && museums >= limits.museums) continue
        if (limits && last >= 0 && isMuseum(poi) && isMuseum(candidates[last])) {
          otherThanMuseum ??= candidates.some((other, j) => !used[j] && !isMuseum(other) && !other.evening && !!reach(j, time, last, spent, fresh))
          if (otherThanMuseum) continue
        }
        if (last >= 0 && isFoodStop(poi) && isFoodStop(candidates[last])) {
          otherNext ??= candidates.some((other, j) => !used[j] && !isFoodStop(other) && !other.evening && !!reach(j, time, last, spent, fresh))
          if (otherNext) continue
        }
      }

      const meal = isMealSlot(poi, start)
      used[i] = true
      seq.push(i)
      starts.push(start)
      if (sitDown) mealStarts.push(start)
      if (poi.cat === 'cafe') cafes += 1
      if (isMuseum(poi)) museums += 1
      if (poi.heavy) heavies += 1
      dfs(
        end,
        i,
        spent + price,
        fresh + (problem.kept?.has(poi.id) ? 0 : price),
        utility + unitScore[i],
        travel + hop.min,
        wait + (seq.length === 1 && !origin && !problem.resume ? 0 : idle),
        lunch || (meal && start < 900),
        dinner || (meal && start >= 900),
      )
      if (poi.heavy) heavies -= 1
      if (isMuseum(poi)) museums -= 1
      if (poi.cat === 'cafe') cafes -= 1
      if (sitDown) mealStarts.pop()
      starts.pop()
      seq.pop()
      used[i] = false
      if (!complete) return
    }
  }

  dfs(dayStart, -1, 0, 0, 0, 0, 0, false, false)

  const feasible = best.obj > -Infinity
  const stops = feasible ? buildStops(best.seq.map((i) => candidates[i]), problem) : []
  return {
    stops,
    objective: feasible ? best.obj : 0,
    nodes,
    complete,
    utility: best.utility,
    travelMin: best.travel,
    feasible,
  }
}

/** Turn an ordered list of POIs into timed stops, recomputing legs and waits from `problem`. */
function buildStops(order: Poi[], problem: DayProblem): Stop[] {
  const city = cityById[problem.city]
  const weekday = problem.date ? weekdayOf(problem.date) : undefined
  let time = problem.dayStart
  let prev: { lat: number; lng: number } | undefined = problem.origin
  return order.map((poi, index) => {
    const hop = prev ? travelLeg(prev, poi, problem.transport, city, problem.congestion ?? 1) : { km: 0, min: 0, cost: 0, mode: 'walk' as const }
    const arrive = time + hop.min
    const start = planSlot(poi, Math.max(arrive, problem.floors?.get(poi.id) ?? 0), poi.visit, weekday, problem.dayEnd)?.start ?? arrive
    const stop: Stop = {
      uid: newUid(),
      poiId: poi.id,
      start,
      end: start + poi.visit,
      visit: poi.visit,
      travelMin: hop.min,
      travelKm: Math.round(hop.km * 10) / 10,
      travelCost: hop.cost,
      mode: hop.mode,
      wait: index === 0 && !problem.origin ? 0 : start - arrive,
      locked: problem.mustInclude.has(poi.id),
    }
    time = stop.end
    prev = poi
    return stop
  })
}

/* ───────── manual edits: re-time a day and validate hard constraints ───────── */

export type RetimeOptions = {
  city: CityId
  dayStart: number
  dayEnd: number
  transport: TransportPref
  congestion?: number
  /** The day's date (ISO), so each place is checked against that weekday's hours; without it, against its summary window. */
  date?: string
  /**
   * The day as stored: two places still next to each other (either way round) keep the leg it has between them (the backend's road time)
   * instead of a new estimate, and a place still first keeps the time it was reached.
   */
  legsFrom?: Stop[]
  /** Earliest start per stop uid (minutes): a stop is not started before it. The backend's own hours when a fresh answer is re-timed on foot. */
  floors?: ReadonlyMap<string, number>
}

/**
 * Re-time stops in their new order. Used after a drag, a duration change or an insert; the
 * returned violations drive the "validate edit" step of the editing flow (report §2.2.2).
 */
export function retimeDay(stops: Stop[], options: RetimeOptions): { stops: Stop[]; violations: Violation[] } {
  const city = cityById[options.city]
  const weekday = options.date ? weekdayOf(options.date) : undefined
  const violations: Violation[] = []
  const legs = options.legsFrom ?? []
  const pairs = legs.slice(1).map((stop, i) => [legs[i].poiId, stop.poiId, stop] as const)
  // The pair as stored wins over the same pair reversed
  const stored = new Map([...pairs.map(([a, b, stop]) => [`${b}>${a}`, stop] as const), ...pairs.map(([a, b, stop]) => [`${a}>${b}`, stop] as const)])
  // A backend-timed day starts with the ride from the city centre, which is not stored as a leg; keeping the arrival keeps that ride
  // Both lists can be empty (a day with no stops): undefined === undefined must not read legs[0].
  const first = legs[0] && stops[0] && legs[0].poiId === stops[0].poiId ? legs[0].start - legs[0].wait : options.dayStart
  let time = Math.max(options.dayStart, first)
  let prev: Poi | undefined
  // A stop is not started earlier than the stored day had it, unless it was moved forward: a stored stop that was before it now comes after it
  const storedAt = new Map(legs.map((stop, index) => [stop.uid, index] as const))
  const nowAt = new Map(stops.map((stop, index) => [stop.uid, index] as const))
  const floorOf = (stop: Stop, index: number): number => {
    const given = options.floors?.get(stop.uid)
    if (given !== undefined) return given
    const at = storedAt.get(stop.uid)
    if (at === undefined) return 0
    for (let k = 0; k < at; k += 1) {
      const pos = nowAt.get(legs[k].uid)
      if (pos !== undefined && pos > index) return 0
    }
    return legs[at].start
  }
  // Stops before the first change keep their stored times and legs while those still hold, so a backend-timed day does not drift
  // by a rounded minute; from the first change (or a stored time that no longer fits) on, the day is timed again
  let unchanged = true
  const next = stops.map((stop, index) => {
    const poi = poiById[stop.poiId] as Poi | undefined
    if (!poi) {
      // A place this browser has not loaded keeps its stored times, and the next leg is not measured from it
      unchanged = false
      prev = undefined
      time = Math.max(time, stop.end)
      return stop
    }
    const had = legs[index]
    const hadSlot = unchanged && had?.uid === stop.uid && had.visit === stop.visit && had.start >= time ? visitSlot(poi, had.start, had.visit, weekday, options.dayEnd) : null
    unchanged = !!hadSlot?.fits && hadSlot.start === had.start && had.end <= options.dayEnd
    if (unchanged) {
      time = had.end
      prev = poi
      return { ...stop, start: had.start, end: had.end, wait: had.wait, travelMin: had.travelMin, travelKm: had.travelKm, travelCost: had.travelCost, mode: had.mode }
    }
    const kept = prev && stored.get(`${prev.id}>${poi.id}`)
    const hop = kept
      ? { km: kept.travelKm, min: kept.travelMin, cost: kept.travelCost, mode: kept.mode }
      : prev ? travelLeg(prev, poi, options.transport, city, options.congestion ?? 1) : { km: 0, min: 0, cost: 0, mode: 'walk' as const }
    const arrive = time + hop.min
    const slot = planSlot(poi, Math.max(arrive, floorOf(stop, index)), stop.visit, weekday, options.dayEnd)
    const start = slot?.start ?? arrive
    const end = start + stop.visit
    if (!slot) {
      violations.push({ uid: stop.uid, kind: 'closed', detail: `${poi.name} không mở cửa ngày này`, detailEn: `${placeName(poi.name, 'en')} is closed that day` })
    } else if (!slot.fits) {
      violations.push({
        uid: stop.uid,
        kind: 'closed',
        detail: `${poi.name} ${slot.close >= start ? 'đóng cửa' : 'đã đóng'} lúc ${fmtClock(slot.close)}`,
        detailEn: `${placeName(poi.name, 'en')} ${slot.close >= start ? 'closes' : 'closed'} at ${fmtClock(slot.close, false)}`,
      })
    }
    if (end > options.dayEnd) {
      violations.push({
        uid: stop.uid,
        kind: 'overtime',
        detail: `${fmtClock(end)} vượt giờ kết thúc ${fmtClock(options.dayEnd)}`,
        detailEn: `${fmtClock(end, false)} is past the ${fmtClock(options.dayEnd, false)} day end`,
      })
    }
    time = end
    prev = poi
    return {
      ...stop,
      start,
      end,
      travelMin: hop.min,
      travelKm: kept ? kept.travelKm : Math.round(hop.km * 10) / 10,
      travelCost: hop.cost,
      mode: hop.mode,
      wait: index === 0 ? 0 : start - arrive,
    }
  })
  return { stops: next, violations }
}

// A saved trip can name a place the catalogue has not loaded (yet)
export const dayCost = (day: Day) =>
  day.stops.reduce((sum, stop) => sum + (poiById[stop.poiId]?.cost ?? 0) + stop.travelCost, 0)

export const tripCost = (days: Day[]) => days.reduce((sum, day) => sum + dayCost(day), 0)
