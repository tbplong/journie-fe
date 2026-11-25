import { travelLeg } from './geo'
import { related } from './intentFromExtraction'
import { placeName } from './placeText'
import { isDayTimed, isScheduled } from './planner'
import { cityById, poiById } from './pois'
import { EVENING_START, newUid, planSlot, retimeDay, tripCost } from './solver'
import { addDays, fmtMinutes, fmtTime, weekdayOf } from './time'
import type { Day, Poi, RoutingInfo, Stop, Trip, Violation } from './types'

/**
 * Manual edits follow the flow in report §2.2.2: apply the change, re-time the day, validate the
 * hard constraints, and only accept the result when nothing breaks.
 */
export type EditResult = { trip: Trip; ok: true } | { ok: false; violations: Violation[] }

/**
 * What the backend said about the trip once day `dayIndex` is re-timed on the device (an edit or a live replan) and the days are `days`:
 * that day loses the backend's hours, the load and its dated warnings, and a place no longer in the trip is no longer "not scheduled".
 */
export function retimedRouting(trip: Trip, dayIndex: number, days: Day[]): RoutingInfo | undefined {
  const routing = trip.routing
  if (!routing) return undefined
  const date = addDays(trip.startDate, dayIndex)
  const inTrip = new Set(days.flatMap((day) => day.stops.map((stop) => stop.poiId)))
  return {
    ...routing,
    timed: false,
    timedDays: days.map((_, index) => index !== dayIndex && isDayTimed(trip, index)),
    load: undefined,
    warnings: routing.warnings.filter((w) => !w.endsWith(`:${date}`)),
    unscheduled: routing.unscheduled.filter((u) => inTrip.has(u.poiId)),
  }
}

/** A bar put before the day's other stops waits for the evening and pushes them past closing: the one reason to give is the bar's. */
function eveningFirst(stops: Stop[], created: Violation[]): Violation[] | undefined {
  const at = stops.findIndex((stop, index) => poiById[stop.poiId]?.evening && stops.slice(index + 1).some((later) => !poiById[later.poiId]?.evening))
  if (at < 0 || !created.every((v) => stops.findIndex((stop) => stop.uid === v.uid) > at)) return undefined
  const name = poiById[stops[at].poiId].name
  const from = fmtTime(EVENING_START)
  return [{ uid: stops[at].uid, kind: 'closed', detail: `${name} chỉ xếp từ ${from}, nên không đặt trước các điểm ban ngày được`, detailEn: `${placeName(name, 'en')} starts from ${from} at the earliest, so it cannot go before the daytime stops` }]
}

function commitDay(trip: Trip, dayIndex: number, stops: Stop[]): EditResult {
  const options = { city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: trip.transport, date: addDays(trip.startDate, dayIndex), legsFrom: trip.days[dayIndex].stops }
  const { stops: timed, violations } = retimeDay(stops, options)
  // A draft shows no hours and the backend orders its days when scheduling, so only the budget blocks an edit there. On a scheduled day
  // only what the edit itself breaks blocks it: a backend-planned day may not fit the device's slower travel estimate and must stay editable
  if (isScheduled(trip)) {
    const had = new Set(retimeDay(trip.days[dayIndex].stops, options).violations.map((v) => `${v.uid}:${v.kind}`))
    const created = violations.filter((v) => !had.has(`${v.uid}:${v.kind}`))
    if (created.length) return { ok: false, violations: eveningFirst(timed, created) ?? created }
  }
  const days = trip.days.map((day) => (day.index === dayIndex ? { ...day, stops: timed } : day))
  const next: Trip = { ...trip, days, routing: retimedRouting(trip, dayIndex, days) }
  if (tripCost(next.days) > trip.budget * 1.0001 && tripCost(next.days) > tripCost(trip.days)) {
    return {
      ok: false,
      violations: [{ uid: timed[0]?.uid ?? '', kind: 'budget', detail: `Chi phí vượt ngân sách ${new Intl.NumberFormat('vi-VN').format(trip.budget)} VND`, detailEn: `Cost exceeds the ${new Intl.NumberFormat('en-US').format(trip.budget)} VND budget` }],
    }
  }
  return { ok: true, trip: next }
}

export const reorderDay = (trip: Trip, dayIndex: number, order: Stop[]) => commitDay(trip, dayIndex, order)

export const changeDuration = (trip: Trip, dayIndex: number, uid: string, delta: number) =>
  commitDay(
    trip,
    dayIndex,
    trip.days[dayIndex].stops.map((stop) => (stop.uid === uid ? { ...stop, visit: Math.min(360, Math.max(15, stop.visit + delta)) } : stop)),
  )

export function removeStop(trip: Trip, dayIndex: number, uid: string): EditResult {
  const result = commitDay(
    trip,
    dayIndex,
    trip.days[dayIndex].stops.filter((stop) => stop.uid !== uid),
  )
  // A removed place is no longer a must-visit, or it would come back locked when added again
  const poiId = trip.days[dayIndex].stops.find((stop) => stop.uid === uid)?.poiId
  if (!result.ok) return result
  // Nor does the request it was named in bring it back at the next edit
  const name = poiId ? poiById[poiId]?.name : undefined
  const named = (text: string) => !!name && related(text, name)
  const unnamed = <T extends { field: string; value: string }>(list: T[]) => list.filter((atom) => atom.field !== 'must_visit' || !named(atom.value))
  const e = result.trip.extraction
  const extraction = e && { ...e, must_visit: e.must_visit.filter((text) => !named(text)), hard_constraints: unnamed(e.hard_constraints), soft_constraints: unnamed(e.soft_constraints) }
  return { ok: true, trip: { ...result.trip, extraction, mustInclude: result.trip.mustInclude.filter((id) => id !== poiId) } }
}

export function toggleLock(trip: Trip, dayIndex: number, uid: string): Trip {
  const stops = trip.days[dayIndex].stops.map((stop) => (stop.uid === uid ? { ...stop, locked: !stop.locked } : stop))
  const locked = stops.find((stop) => stop.uid === uid)?.locked
  const poiId = stops.find((stop) => stop.uid === uid)?.poiId
  return {
    ...trip,
    mustInclude: poiId ? (locked ? [...new Set([...trip.mustInclude, poiId])] : trip.mustInclude.filter((id) => id !== poiId)) : trip.mustInclude,
    days: trip.days.map((day) => (day.index === dayIndex ? { ...day, stops } : day)),
  }
}

export function addStop(trip: Trip, dayIndex: number, poiId: string): EditResult {
  const poi = poiById[poiId]
  const onDay = trip.days.find((day) => day.stops.some((stop) => stop.poiId === poiId))
  if (onDay) {
    return { ok: false, violations: [{ uid: '', kind: 'duplicate', detail: `${poi.name} đã có trong Ngày ${onDay.index + 1}`, detailEn: `${placeName(poi.name, 'en')} is already on Day ${onDay.index + 1}` }] }
  }
  const stop: Stop = {
    uid: newUid(),
    poiId,
    start: 0,
    end: 0,
    visit: poi.visit,
    travelMin: 0,
    travelKm: 0,
    travelCost: 0,
    mode: 'walk',
    wait: 0,
    locked: false,
  }
  const stops = trip.days[dayIndex].stops
  const insertAt = (at: number) => commitDay(trip, dayIndex, [...stops.slice(0, at), stop, ...stops.slice(at)])
  const overBudget = (result: EditResult) => !result.ok && result.violations.some((v) => v.kind === 'budget')
  const appended = insertAt(stops.length)
  if (appended.ok || !isScheduled(trip) || overBudget(appended)) return appended
  // Too late at the end of a scheduled day: try the first free gap it fits in while open, without moving the stop after it.
  // Where the hours would fit but the money does not, the budget is the reason given
  let budget: EditResult | undefined
  const city = cityById[trip.city]
  const weekday = weekdayOf(addDays(trip.startDate, dayIndex))
  for (let at = 0; at < stops.length; at += 1) {
    const before = stops[at - 1]
    const from = before ? poiById[before.poiId] : undefined
    const next = poiById[stops[at].poiId] as Poi | undefined
    // A gap beside a place this browser has not loaded cannot be measured
    if (!next || (before && !from)) continue
    const arrive = before && from ? before.end + travelLeg(from, poi, trip.transport, city).min : trip.dayStart
    const slot = planSlot(poi, arrive, poi.visit, weekday)
    if (!slot?.fits || slot.start + poi.visit + travelLeg(poi, next, trip.transport, city).min > stops[at].start) continue
    const inGap = insertAt(at)
    if (inGap.ok) return inGap
    if (overBudget(inGap)) budget ??= inGap
  }
  // No gap either: the latest position where the later stops may shift but nothing breaks, so the fewest stops move
  for (let at = stops.length - 1; at >= 0; at -= 1) {
    const shifted = insertAt(at)
    if (shifted.ok) return shifted
    if (overBudget(shifted)) budget ??= shifted
  }
  return budget ?? appended
}

/** The toast's note when adding to day `dayIndex` pushed its other stops later (a draft shows no hours, so never there). */
export function shiftNote(before: Trip, after: Trip, dayIndex: number): [string, string] | undefined {
  if (!isScheduled(before)) return undefined
  const was = new Map(before.days[dayIndex].stops.map((stop) => [stop.uid, stop.start]))
  const later = Math.max(0, ...after.days[dayIndex].stops.map((stop) => stop.start - (was.get(stop.uid) ?? stop.start)))
  return later ? [` · các điểm sau lùi ${fmtMinutes(later)}`, ` · later stops move ${fmtMinutes(later, false)} later`] : undefined
}

export const usedPoiIds = (trip: Trip) => new Set(trip.days.flatMap((day) => day.stops.map((stop) => stop.poiId)))

/** Stop-level diff between two versions of a day, for the "review the new itinerary" step. */
export function diffDay(before: Stop[], after: Stop[]) {
  const beforeIds = before.map((stop) => stop.poiId)
  const afterIds = after.map((stop) => stop.poiId)
  return {
    added: after.filter((stop) => !beforeIds.includes(stop.poiId)),
    removed: before.filter((stop) => !afterIds.includes(stop.poiId)),
    kept: after.filter((stop) => beforeIds.includes(stop.poiId)),
  }
}
