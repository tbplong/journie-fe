import { retimedRouting } from './edit'
import { placeName, placeNameOf } from './placeText'
import { poiById, poisByCity } from './pois'
import { scorePoi } from './scoring'
import { isAvoided } from './tags'
import { MAX_NIGHTLIFE, MAX_STOPS, retimeDay, solveDay, tripCost, visitSlot } from './solver'
import { addDays, weekdayOf } from './time'
import type { Disruption, Poi, Stop, Trip, Violation } from './types'

/**
 * Dynamic incremental replanning (report §1.4.2):
 *   I' = argmax_I [ Utility(I) − λ · ChangeCost(I, I_old) ]
 * Utility is the sum of Eq. (3) scores, ChangeCost charges for dropped, added, shifted and
 * re-ordered stops. λ trades the best possible plan against keeping what the traveler already knows.
 */

export type ReplanOption = {
  id: 'keep' | 'balanced' | 'fresh' | 'custom'
  lambda: number
  stops: Stop[]
  kept: string[]
  dropped: string[]
  added: string[]
  utility: number
  changeCost: number
  objective: number
  endTime: number
  travelMin: number
  nodes: number
}

export type ReplanResult = {
  /** Original remaining stops re-timed under the disruption, with whatever now breaks. */
  baseline: { stops: Stop[]; violations: Violation[]; utility: number; endTime: number }
  options: ReplanOption[]
  completed: Stop[]
  now: number
}

export type LambdaSpec = { id: ReplanOption['id']; lambda: number }

export const LAMBDAS: LambdaSpec[] = [
  { id: 'keep', lambda: 2.6 },
  { id: 'balanced', lambda: 0.9 },
  { id: 'fresh', lambda: 0.12 },
]

const DROP_COST = 14
const LOCKED_DROP_COST = 60
const ADD_COST = 4
const MOVE_COST = 2.5
const SHIFT_PER_MIN = 1 / 12
/** Lunch and dinner hours as the backend's meal windows have them (journie-be `routing/config/rules.yaml`), ends excluded. */
const LUNCH_FROM = 11 * 60
const LUNCH_UNTIL = 14 * 60
const DINNER_FROM = 17 * 60 + 30
const DINNER_UNTIL = 20 * 60 + 30

export function splitDay(stops: Stop[], now: number) {
  const completed = stops.filter((stop) => stop.end <= now || stop.start <= now)
  const remaining = stops.filter((stop) => !completed.includes(stop))
  return { completed, remaining }
}

function changeCost(oldIds: string[], oldStarts: Map<string, number>, locked: Set<string>, ids: string[], starts: number[], closed?: string) {
  let cost = 0
  const newPos = new Map(ids.map((id, i) => [id, i]))
  oldIds.forEach((id, oldIndex) => {
    const pos = newPos.get(id)
    if (pos === undefined) {
      if (id !== closed) cost += locked.has(id) ? LOCKED_DROP_COST : DROP_COST
      return
    }
    cost += Math.abs(starts[pos] - (oldStarts.get(id) ?? 0)) * SHIFT_PER_MIN + Math.abs(pos - oldIndex) * MOVE_COST
  })
  for (const id of ids) if (!oldStarts.has(id)) cost += ADD_COST
  return cost
}

export function replanDay(trip: Trip, dayIndex: number, now: number, disruption: Disruption, lambdas: LambdaSpec[] = LAMBDAS): ReplanResult {
  const day = trip.days[dayIndex]
  const { completed, remaining } = splitDay(day.stops, now)
  const last = completed[completed.length - 1]
  const origin = last ? poiById[last.poiId] : undefined
  const delay = disruption.kind === 'delay' ? disruption.minutes : 0
  // The live clock ticks in fractions of a minute; a plan starting off the minute would save starts and waits like 49.6
  const resumeAt = Math.round(Math.max(now, last?.end ?? now) + delay)
  const congestion = disruption.kind === 'traffic' ? 1.75 : 1
  const rainWindow = disruption.kind === 'weather' ? { from: now, until: disruption.until } : undefined
  const closedId = disruption.kind === 'closure' ? disruption.poiId : undefined
  const rainy = trip.rainy || disruption.kind === 'weather'
  const date = addDays(trip.startDate, dayIndex)
  const weekday = weekdayOf(date)

  const ctx = {
    interests: trip.interests ?? {},
    keywords: trip.keywords ?? [],
    perStopBudget: trip.budget / Math.max(1, trip.days.length * MAX_STOPS[trip.pace]),
    rainy,
  }
  const scoreOf = (poi: Poi) => scorePoi(poi, ctx).score

  const usedElsewhere = new Set(trip.days.flatMap((d) => d.stops.map((stop) => stop.poiId)))
  const avoid = new Set(trip.avoidTags)
  // A place this browser has not loaded cannot be planned around, so a new plan leaves it out (it shows as dropped)
  const oldRemaining = remaining.filter((stop) => stop.poiId !== closedId && stop.poiId in poiById)
  // A day keeps its limit of bars, so a new option only offers the ones it still has room for
  let barsLeft = (trip.nightsPerDay ?? MAX_NIGHTLIFE) - day.stops.filter((stop) => stop.poiId !== closedId && poiById[stop.poiId]?.evening).length
  const alternatives = poisByCity(trip.city)
    .filter((poi) => !usedElsewhere.has(poi.id) && poi.id !== closedId && !isAvoided(poi, avoid) && visitSlot(poi, resumeAt, poi.visit, weekday)?.fits)
    .sort((a, b) => Number(rainy && b.indoor) - Number(rainy && a.indoor) || scoreOf(b) - scoreOf(a))
    .filter((poi) => !poi.evening || barsLeft-- > 0)
    .slice(0, 4)

  // A place already in the day keeps the stay the traveler set on it
  const candidates = [...oldRemaining.map((stop) => ({ ...poiById[stop.poiId], visit: stop.visit })), ...alternatives]
  const scores = new Map(candidates.map((poi) => [poi.id, scoreOf(poi)]))
  const locked = new Set(oldRemaining.filter((stop) => stop.locked).map((stop) => stop.poiId))
  const oldIds = remaining.map((stop) => stop.poiId)
  const oldStarts = new Map(remaining.map((stop) => [stop.poiId, stop.start]))

  // A sit-down meal the plan has inside lunch or dinner hours (the backend's meal windows) is not pulled out of them by a new plan
  const mealFloor = (stop: Stop) => {
    if (poiById[stop.poiId]?.cat !== 'food') return undefined
    if (stop.start >= DINNER_FROM && stop.start < DINNER_UNTIL) return DINNER_FROM
    if (stop.start >= LUNCH_FROM && stop.start < LUNCH_UNTIL) return LUNCH_FROM
    return undefined
  }
  const floors = new Map(oldRemaining.flatMap((stop) => {
    const at = mealFloor(stop)
    return at === undefined ? [] : [[stop.poiId, at] as const]
  }))
  // If nothing changes, no stop starts earlier than the plan has it: a meal held for its window, a rest after lunch, an evening start
  const kept = new Map(oldRemaining.map((stop) => [stop.uid, stop.start] as const))

  const spentBefore = tripCost(trip.days.map((d) => ({ ...d, stops: d.index === dayIndex ? completed : d.stops })))

  // What the old plan looks like if nothing changes.
  const baselineBase = retimeDay(
    oldRemaining.map((stop) => ({ ...stop })),
    { city: trip.city, dayStart: resumeAt, dayEnd: trip.dayEnd, transport: trip.transport, congestion, date, floors: kept },
  )
  const baselineViolations = [...baselineBase.violations]
  if (rainWindow) {
    for (const stop of baselineBase.stops) {
      const poi = poiById[stop.poiId]
      if (!poi.indoor && stop.start >= rainWindow.from && stop.start < rainWindow.until) {
        baselineViolations.push({ uid: stop.uid, kind: 'closed', detail: `${poi.name} ngoài trời, đang mưa lớn`, detailEn: `${placeName(poi.name, 'en')} is outdoors and it is raining hard` })
      }
    }
  }
  if (closedId) {
    const stop = remaining.find((s) => s.poiId === closedId)
    if (stop) baselineViolations.push({ uid: stop.uid, kind: 'closed', detail: `${placeNameOf(closedId, 'vi')} đóng cửa đột xuất`, detailEn: `${placeNameOf(closedId, 'en')} has closed unexpectedly` })
  }
  const baseline = {
    stops: baselineBase.stops,
    violations: baselineViolations,
    utility: baselineBase.stops.reduce((sum, stop) => sum + (scores.get(stop.poiId) ?? 0) * 100, 0),
    endTime: baselineBase.stops[baselineBase.stops.length - 1]?.end ?? resumeAt,
  }

  const options: ReplanOption[] = []
  const seen = new Set<string>()
  // The "keep" option weighs dropping a meal the plan holds in lunch or dinner hours like dropping a pinned place, so new stops
  // taken in a closed place's time do not push the dinner out. It still counts against the day's meal limit, and is not pinned
  const withMeals = new Set([...locked, ...floors.keys()])
  for (const { id, lambda } of lambdas) {
    const heavy = id === 'keep' ? withMeals : locked
    const solved = solveDay({
      city: trip.city,
      candidates,
      scores,
      dayStart: resumeAt,
      dayEnd: trip.dayEnd,
      maxStops: Math.min(MAX_STOPS.fast, Math.max(oldRemaining.length + 1, 2)),
      transport: trip.transport,
      budgetLeft: Math.max(0, trip.budget - spentBefore),
      mustInclude: locked,
      origin,
      resume: true,
      congestion,
      rainWindow,
      extra: (ids, starts) => -lambda * changeCost(oldIds, oldStarts, heavy, ids, starts, closedId),
      date,
      floors,
    })
    if (!solved.feasible) continue
    const stops = solved.stops
    const ids = stops.map((stop) => stop.poiId)
    const signature = ids.join('|')
    if (id !== 'custom' && seen.has(signature)) continue
    seen.add(signature)
    const cost = changeCost(oldIds, oldStarts, heavy, ids, stops.map((stop) => stop.start), closedId)
    options.push({
      id,
      lambda,
      stops,
      kept: ids.filter((poiId) => oldStarts.has(poiId)),
      dropped: oldIds.filter((poiId) => !ids.includes(poiId)),
      added: ids.filter((poiId) => !oldStarts.has(poiId)),
      utility: solved.utility,
      changeCost: cost,
      objective: solved.utility - lambda * cost,
      endTime: stops[stops.length - 1]?.end ?? resumeAt,
      travelMin: solved.travelMin,
      nodes: solved.nodes,
    })
  }

  return { baseline, options, completed, now }
}

export function applyReplan(trip: Trip, dayIndex: number, completed: Stop[], option: ReplanOption): Trip {
  const days = trip.days.map((day) => (day.index === dayIndex ? { ...day, stops: [...completed, ...option.stops] } : day))
  // The version stays the one the change started from: the save sends it so the backend can spot a stale copy (409)
  return { ...trip, days, routing: retimedRouting(trip, dayIndex, days) }
}

export const disruptionMeta: Record<Disruption['kind'], { vi: string; en: string }> = {
  traffic: { vi: 'Kẹt xe', en: 'Traffic jam' },
  closure: { vi: 'Điểm đóng cửa', en: 'Venue closed' },
  weather: { vi: 'Mưa lớn', en: 'Heavy rain' },
  delay: { vi: 'Trễ lịch', en: 'Running late' },
}
