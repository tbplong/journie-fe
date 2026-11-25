import { cardOf } from './catalog'
import { ApiError, postJson } from './http'
import { dayWindowError } from './errorText'
import { haversineKm, rideCost, travelLeg } from '../domain/geo'
import { isDayTimed, stopsCap } from '../domain/planner'
import { cityById, poiById } from '../domain/pois'
import type { PoiCard } from '../domain/retrieval'
import { MAX_CAFES, MAX_SAME_KIND, PACE_LIMITS, isMuseum, isReligious, newUid, retimeDay, tripCost, visitSlot } from '../domain/solver'
import { addDays, DAY_MINUTES, dayWindowProblem, fmtTime, weekdayOf } from '../domain/time'
import type { Day, Poi, RoutingInfo, Stop, Trip, Violation } from '../domain/types'

/**
 * The backend planner (journie-be `POST /routing/days` and `POST /routing`, docs/routing-frontend.md).
 * `/routing/days` splits the trip's places over its days (opening days, one area per day, at most two cafés a day...);
 * `/routing` orders each day and times it with road travel. Both take the same request; `pins` fix a place to a day.
 */

type Leg = { mode: 'walk' | 'ride'; distance_km: number; minutes: number }
type Unscheduled = { poi: PoiCard; reason: string }
type Meta = { travel_source: 'osrm' | 'estimated' }
type DaysResponse = {
  days: { date: string; places: PoiCard[]; busy_minutes: number; capacity_minutes: number }[]
  unscheduled: Unscheduled[]
  open_dates: Record<string, string[]>
  warnings: string[]
  meta: Meta
}
type RoutingResponse = {
  days: { date: string; stops: { poi: PoiCard; start: string; leave: string; wait_minutes: number; visit_minutes: number; leg: Leg }[] }[]
  unscheduled: Unscheduled[]
  warnings: string[]
  meta: Meta
}

/** The solver runs up to 6 s and road lookup up to 3 s; 20 s leaves room for a slow database (docs/routing-frontend.md). */
const TIMEOUT_MS = 20_000
const MAX_PLACES = 50
const LAST_MINUTE = 23 * 60 + 59 // a day ending at midnight is sent as ending the same day

const dateOf = (trip: Trip, index: number) => addDays(trip.startDate, index)

/** The backend reads only `id` and returns the card as sent, so a place whose card is not in memory (after a reload) is sent as a minimal valid card. */
function cardFor(poiId: string): PoiCard {
  const card = cardOf(poiId)
  if (card) return card
  const poi = poiById[poiId]
  return {
    id: poiId, name: poi.name, kind: poi.cat, category: null, ward: poi.area || null, address: poi.address || null, lat: poi.lat, lon: poi.lng,
    score: 0, score_parts: {}, reasons: [], flags: [], price_raw: null, opening_hours_raw: poi.hours || null, website: poi.website || null, phone: poi.phone || null,
  }
}

/**
 * The request both endpoints take. A trip the backend would refuse (no place, more than 50, a place twice or unknown, a day that ends
 * before it starts) throws an `ApiError` with status 0 instead, as nothing was sent.
 */
function request(trip: Trip, pinned: (stop: Stop) => boolean) {
  const stops = trip.days.flatMap((day) => day.stops.map((stop) => ({ stop, date: dateOf(trip, day.index) })))
  const ids = new Set(stops.map(({ stop }) => stop.poiId))
  // A day past midnight (a 09:00–03:00 day ends at 1620) is sent as the clock it ends at, "03:00"; the trip then ends on the next date
  const overnight = trip.dayEnd > DAY_MINUTES
  const dayEnd = overnight ? trip.dayEnd : Math.min(trip.dayEnd, LAST_MINUTE)
  if (!stops.length) throw new ApiError('no-places', 'The trip has no places')
  if (stops.length > MAX_PLACES) throw new ApiError('too-many-places', `The trip has more than ${MAX_PLACES} places`)
  if (ids.size !== stops.length || stops.some(({ stop }) => !poiById[stop.poiId])) throw new ApiError('invalid-trip', 'A place is listed twice or is unknown')
  const problem = dayWindowProblem(trip.dayStart, dayEnd, trip.days.length)
  if (problem) throw dayWindowError(problem, trip.days.length)
  // Each card carries the stop's length, so one the traveler changed is timed as set
  const cards = stops.map(({ stop }) => ({ ...cardFor(stop.poiId), visit_minutes: stop.visit }))
  const city = cityById[trip.city]
  return {
    places: cards,
    must_visit_ids: trip.mustInclude.filter((id) => ids.has(id)),
    start: { lat: city.lat, lon: city.lng },
    start_at: `${trip.startDate}T${fmtTime(trip.dayStart)}`,
    end_at: `${dateOf(trip, trip.days.length - (overnight ? 0 : 1))}T${fmtTime(dayEnd)}`,
    day_start: fmtTime(trip.dayStart),
    day_end: fmtTime(dayEnd),
    pins: stops.filter(({ stop }) => pinned(stop)).map(({ stop, date }) => ({ id: stop.poiId, date })),
  }
}

const unscheduled = (list: Unscheduled[]) => list.map((u) => ({ poiId: u.poi.id, name: u.poi.name, reason: u.reason }))

/** Keeps what the traveler set on a place already in the trip (its uid, lock and stay); a new place starts from its card. */
function stopFor(trip: Trip, old: Map<string, Stop>, poiId: string): Stop {
  return old.get(poiId) ?? { uid: newUid(), poiId, start: 0, end: 0, visit: poiById[poiId].visit, travelMin: 0, travelKm: 0, travelCost: 0, mode: 'walk', wait: 0, locked: trip.mustInclude.includes(poiId) }
}
const stopsOf = (trip: Trip) => new Map(trip.days.flatMap((day) => day.stops).map((stop) => [stop.poiId, stop]))
const isFree = (trip: Trip, stop: Stop) => !stop.locked && !trip.mustInclude.includes(stop.poiId)

const isFoodStop = (stop: Stop) => poiById[stop.poiId]?.cat === 'food' || poiById[stop.poiId]?.cat === 'cafe'
/** Food or café stops right after another one. */
const foodPairs = (stops: Stop[]) => stops.filter((stop, at) => at > 0 && isFoodStop(stop) && isFoodStop(stops[at - 1])).length

/**
 * Where a stop moved to another day goes in its order: before the day's evening out, not next to a food or café stop when it is one and
 * the day has such a place, and where it adds the least distance. At the end, a dinner moved to a day that ends with one made two meals in a row.
 */
function insertAt(stops: Stop[], stop: Stop): number {
  const at = (index: number): Poi | undefined => (stops[index] ? poiById[stops[index].poiId] : undefined)
  const poi = poiById[stop.poiId] as Poi | undefined
  const evening = stops.findIndex((other) => poiById[other.poiId]?.evening)
  const last = poi?.evening || evening < 0 ? stops.length : evening
  const km = (a: Poi | undefined, b: Poi | undefined) => (a && b ? haversineKm(a, b) : 0)
  const added = (index: number) => km(at(index - 1), poi) + km(poi, at(index)) - km(at(index - 1), at(index))
  const crowded = (index: number) => isFoodStop(stop) && [index - 1, index].some((near) => !!stops[near] && isFoodStop(stops[near]))
  const options = Array.from({ length: last + 1 }, (_, index) => index)
  const tidy = options.filter((index) => !crowded(index))
  return (tidy.length ? tidy : options).reduce((best, index) => (added(index) < added(best) ? index : best))
}

/** Two food or café stops in a row the day could keep apart: the second is taken out and put back where `insertAt` would, while that leaves fewer such pairs. */
function untangle(stops: Stop[]): Stop[] {
  let order = stops
  for (let at = 1; at < order.length; at += 1) {
    if (!isFoodStop(order[at]) || !isFoodStop(order[at - 1])) continue
    const rest = order.filter((_, index) => index !== at)
    const next = [...rest]
    next.splice(insertAt(rest, order[at]), 0, order[at])
    if (foodPairs(next) >= foodPairs(order)) continue
    order = next
    at = 0
  }
  return order
}

/**
 * The backend balances days by busy time and has no pace (its museum cap is the widest pace's): a day over the pace's museums, then a day
 * over the trip's stops per day, hands its last free stops to days with room where they are open.
 */
function keepPace(trip: Trip, placed: Stop[][], openDates: Record<string, string[]>) {
  const cap = stopsCap(trip)
  const limits = PACE_LIMITS[trip.pace]
  const cafes = (stops: Stop[]) => stops.filter((stop) => poiById[stop.poiId]?.cat === 'cafe').length
  const museum = (stop: Stop) => !!poiById[stop.poiId] && isMuseum(poiById[stop.poiId])
  const museums = (stops: Stop[]) => stops.filter(museum).length
  const religious = (stop: Stop) => !!poiById[stop.poiId] && isReligious(poiById[stop.poiId])
  const openOn = (stop: Stop, day: number) => openDates[stop.poiId]?.includes(dateOf(trip, day)) ?? true
  // A day over the pace's museums hands its last free one to a day with room below the cap
  placed.forEach((stops, from) => {
    for (let at = stops.length - 1; at >= 0 && museums(stops) > limits.museums; at -= 1) {
      const stop = stops[at]
      if (!museum(stop) || !isFree(trip, stop)) continue
      const room = placed
        .map((_, day) => day)
        .filter((day) => day !== from && placed[day].length < cap && museums(placed[day]) < limits.museums && openOn(stop, day))
        .sort((a, b) => placed[a].length - placed[b].length)[0]
      if (room === undefined) continue
      stops.splice(at, 1)
      placed[room].splice(insertAt(placed[room], stop), 0, stop)
    }
  })
  // First without taking a day's meal to a day that has as many (a day keeps its lunch); then, for a day still over, as before: the stop limit comes first
  for (const keepMeals of [true, false]) {
    placed.forEach((stops, from) => {
      for (let at = stops.length - 1; at >= 0 && stops.length > cap; at -= 1) {
        const stop = stops[at]
        if (!isFree(trip, stop) || poiById[stop.poiId]?.evening) continue
        const room = placed
          .map((_, day) => day)
          .filter((day) => day !== from && placed[day].length < cap && openOn(stop, day) && (poiById[stop.poiId]?.cat !== 'cafe' || cafes(placed[day]) < MAX_CAFES) && (!museum(stop) || museums(placed[day]) < limits.museums) && (!religious(stop) || placed[day].filter(religious).length < limits.religious))
          .filter((day) => !keepMeals || !isMeal(stop) || meals(placed[day]) < meals(stops))
          .sort((a, b) => placed[a].length - placed[b].length)[0]
        if (room === undefined) continue
        stops.splice(at, 1)
        placed[room].splice(insertAt(placed[room], stop), 0, stop)
      }
    })
  }
}

const isMeal = (stop: Stop) => poiById[stop.poiId]?.cat === 'food'
const meals = (stops: Stop[]) => stops.filter(isMeal).length
/** A day changed from `before` to `after` that gained food stops in a row or lost its last sit-down meal. */
const untidy = (before: Stop[], after: Stop[]) => foodPairs(after) > foodPairs(before) || (meals(before) > 0 && meals(after) === 0)

/**
 * Road legs cost more than the device's plan assumed: while the trip is over its budget, the free stop whose removal saves the most goes, a bar
 * last. Cutting only the fullest days (or at least not the thinnest), and not between two food stops or a day's last meal, leaves no day thin
 * or without a meal; that way stands unless it drops more stops than the plain one. `retime` gives a day's stops once one is removed, or null
 * when the day would then break its hours.
 */
function keepBudget(trip: Trip, days: Day[], retime: (stops: Stop[], day: Day) => Stop[] | null) {
  const drop = (way: 'even' | 'fair' | 'plain') => {
    let kept = days
    while (tripCost(kept) > trip.budget) {
      const without = (evening: boolean) =>
        kept.flatMap((day) =>
          day.stops
            .filter((stop) => isFree(trip, stop) && !!poiById[stop.poiId]?.evening === evening)
            .flatMap((stop) => {
              const stops = retime(day.stops.filter((s) => s.uid !== stop.uid), day)
              return stops ? [{ from: day, untidy: untidy(day.stops, stops), days: kept.map((other) => (other.index === day.index ? { ...other, stops } : other)) }] : []
            }),
        )
      let options = without(false).length ? without(false) : without(true)
      if (!options.length) break
      if (way !== 'plain') {
        if (options.some((option) => !option.untidy)) options = options.filter((option) => !option.untidy)
        const most = Math.max(...options.map((option) => option.from.stops.length))
        const least = Math.min(...kept.map((day) => day.stops.length))
        const fair = options.filter((option) => (way === 'even' ? option.from.stops.length === most : option.from.stops.length > least))
        if (fair.length) options = fair
      }
      kept = options.reduce((best, next) => (tripCost(next.days) < tripCost(best.days) ? next : best)).days
    }
    return kept
  }
  const ways = [drop('even'), drop('fair'), drop('plain')]
  // A way that ran out of stops it may drop while still over budget loses to one that did not; then the most stops kept, the evener way first
  const score = (list: Day[]) => (tripCost(list) <= trip.budget ? 1000 : 0) + list.reduce((sum, day) => sum + day.stops.length, 0)
  return ways.reduce((best, way) => (score(way) > score(best) ? way : best))
}

/** Whether a day of `stops` may take `stop` within the day limits the planner keeps (cafés, museums at the pace, a pagoda or church, markets, parks). */
function hasRoom(trip: Trip, stops: Stop[], stop: Stop) {
  const poi = poiById[stop.poiId]
  if (!poi) return false
  const count = (kind: (other: Poi) => boolean) => stops.filter((other) => !!poiById[other.poiId] && kind(poiById[other.poiId])).length
  if (poi.cat === 'cafe' && count((other) => other.cat === 'cafe') >= MAX_CAFES) return false
  if (isMuseum(poi) && count(isMuseum) >= PACE_LIMITS[trip.pace].museums) return false
  if (isReligious(poi) && count(isReligious) >= PACE_LIMITS[trip.pace].religious) return false
  return !SAME_KIND.some((tag) => poi.tags.includes(tag) && count((other) => other.tags.includes(tag)) >= MAX_SAME_KIND)
}
const SAME_KIND = ['market', 'park']
/** A day this many stops short of the fullest one takes a stop from it. */
const EVEN_GAP = 2
/** shortcut: the backend starts a day with the ride from the city centre and keeps its own rest, so its times run later than the device's; a moved
 * stop must end this long before its place closes, or the backend may not fit it (a pagoda open until noon). Drop once both share one timing. */
const CLOSE_MARGIN = 30
/** The moved stop, as `timed` places it, ends `CLOSE_MARGIN` before its place closes that day. */
function roomBeforeClose(trip: Trip, timed: Stop[], moved: Stop, dayIndex: number) {
  const stop = timed.find((s) => s.uid === moved.uid)
  const poi = poiById[moved.poiId]
  if (!stop || !poi) return true
  const slot = visitSlot(poi, stop.start, stop.visit, weekdayOf(dateOf(trip, dayIndex)))
  return !slot || slot.close - stop.end >= CLOSE_MARGIN
}
/** A moved stop is at most this far (straight line) from some stop of the day taking it: the backend keeps one area per day. */
const NEAR_KM = 5
const LUNCH_FROM = 11 * 60
const LUNCH_UNTIL = 14 * 60

/**
 * The backend's split and the budget's cuts can leave a day with far fewer stops than the others (5,5,2,6,4): while a day has `EVEN_GAP`
 * fewer than the fullest, a fullest day hands the thinnest a free stop where it is open that day, within its limits, its hours and the budget.
 * A meal moves only to a day with two fewer, so each keeps its own. The move that keeps both days tidy goes first, a meal to a day without
 * one, then the one that costs least. Few stops is not a light day: an excursion (a long visit 30 km out, then dinner) is full in time, and
 * `/routing` re-orders a day, so a city stop added to it costs the ride out again. A day takes a stop only near one of its own, and only
 * if with it it is no busier than the day giving it was.
 */
function keepEven(trip: Trip, days: Day[], openDates: Record<string, string[]>, time: (stops: Stop[], index: number) => { stops: Stop[]; violations: Violation[] }) {
  const broken = (stops: Stop[], index: number) => new Set(time(stops, index).violations.map((v) => `${v.uid}:${v.kind}`))
  const ahead = (a: number[], b: number[]) => {
    const at = a.findIndex((value, i) => value !== b[i])
    return at >= 0 && a[at] < b[at]
  }
  const city = cityById[trip.city]
  // Visits and rides, with the ride out from the city centre that the backend counts too (an excursion's longest)
  const busy = (stops: Stop[]) => {
    const first = stops[0] && poiById[stops[0].poiId]
    return (first ? travelLeg(city, first, trip.transport, city).min : 0) + stops.reduce((sum, stop) => sum + stop.visit + stop.travelMin, 0)
  }
  const near = (stop: Stop, stops: Stop[]) => !stops.length || stops.some((other) => !!poiById[other.poiId] && haversineKm(poiById[stop.poiId], poiById[other.poiId]) <= NEAR_KM)
  // A day with no meal that runs into lunch with three stops takes a meal or nothing: a fourth would carry it past lunch with nothing to eat
  const lunchless = (stops: Stop[]) => meals(stops) === 0 && stops.length >= 3 && stops.some((stop) => stop.start < LUNCH_UNTIL && stop.end > LUNCH_FROM)
  let kept = days
  for (;;) {
    const most = Math.max(...kept.map((day) => day.stops.length))
    const moves = kept
      .filter((to) => to.stops.length <= most - EVEN_GAP)
      .flatMap((to) => kept.filter((from) => from.stops.length === most).flatMap((from) => from.stops.map((stop) => ({ from, to, stop }))))
      .filter(({ from, to, stop }) => isFree(trip, stop) && !poiById[stop.poiId]?.evening && (openDates[stop.poiId]?.includes(dateOf(trip, to.index)) ?? true) && hasRoom(trip, to.stops, stop) && (isMeal(stop) ? meals(to.stops) + 2 <= meals(from.stops) : !lunchless(to.stops)) && near(stop, to.stops))
      .flatMap(({ from, to, stop }) => {
        const into = [...to.stops]
        into.splice(insertAt(into, stop), 0, stop)
        const had = broken(to.stops, to.index)
        const timed = time(into, to.index)
        if (!timed.violations.every((v) => had.has(`${v.uid}:${v.kind}`)) || busy(timed.stops) > busy(from.stops) || !roomBeforeClose(trip, timed.stops, stop, to.index)) return []
        const left = time(from.stops.filter((s) => s.uid !== stop.uid), from.index).stops
        const next = kept.map((day) => (day.index === from.index ? { ...day, stops: left } : day.index === to.index ? { ...day, stops: timed.stops } : day))
        const cost = tripCost(next)
        const rank = [to.stops.length, Number(untidy(from.stops, left) || foodPairs(timed.stops) > foodPairs(to.stops)), Number(meals(to.stops) > 0 || !isMeal(stop)), cost]
        return cost <= trip.budget ? [{ rank, next }] : []
      })
    if (!moves.length) return kept
    kept = moves.reduce((best, move) => (ahead(move.rank, best.rank) ? move : best)).next
  }
}

/**
 * Asks the backend how to split the trip's places over its days. With `pinLocked`, locked places stay on their day (the "Suggest again"
 * case); the first split sends no pins, so the backend may move a must-visit place to a day it is open. Throws an `ApiError` on failure.
 */
export async function routeDraft(trip: Trip, pinLocked = true): Promise<Trip> {
  // The bars stay on the day they were dealt to: to the backend a second bar on a day is only a warning
  const body = request(trip, (stop) => (pinLocked && stop.locked) || !!poiById[stop.poiId]?.evening)
  const res = await postJson<DaysResponse>('/routing/days', body, TIMEOUT_MS)
  const old = stopsOf(trip)
  const oldDay = new Map(trip.days.flatMap((day) => day.stops.map((stop) => [stop.poiId, day.index] as const)))
  const timing = { city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: trip.transport }
  const placed = res.days.map((day) => day.places.filter((card) => poiById[card.id]).map((card) => stopFor(trip, old, card.id)))
  // A place the backend could not fit stays where it was (listed under "not scheduled"), so it is sent again next time instead of vanishing
  for (const u of res.unscheduled) {
    const stop = old.get(u.poi.id)
    if (stop) placed[Math.min(oldDay.get(u.poi.id) ?? 0, placed.length - 1)]?.push(stop)
  }
  keepPace(trip, placed, res.open_dates)
  // A draft shows no hours, but the device still times it so moving and editing keep working as before
  const time = (stops: Stop[], index: number) => retimeDay(stops, { ...timing, date: dateOf(trip, index) })
  const retime = (stops: Stop[], index: number) => time(stops, index).stops
  const budgeted = keepBudget(trip, placed.map((stops, index): Day => ({ index, stops: retime(stops, index) })), (stops, day) => retime(stops, day.index))
  const sameAsAnswer = (day: Day) => day.stops.length === res.days[day.index].places.length && day.stops.every((stop) => res.days[day.index].places.some((card) => card.id === stop.poiId))
  // A day the answer's order no longer holds (a stop moved or cut) is put back in a tidy order, so the draft does not list two meals in a row,
  // unless the new order's rides take the trip over its budget
  const even = keepEven(trip, budgeted, res.open_dates, time)
  const days = even.reduce((list, day) => {
    if (sameAsAnswer(day)) return list
    const next = list.map((other) => (other.index === day.index ? { ...other, stops: retime(untangle(other.stops), other.index) } : other))
    return tripCost(next) <= Math.max(trip.budget, tripCost(list)) ? next : list
  }, even)
  const routing: RoutingInfo = {
    unscheduled: unscheduled(res.unscheduled),
    warnings: res.warnings,
    openDates: res.open_dates,
    load: res.days.map((day, index) => ({ busy: sameAsAnswer(days[index]) ? day.busy_minutes : days[index].stops.reduce((sum, stop) => sum + stop.visit + stop.travelMin, 0), capacity: day.capacity_minutes })),
    travelSource: res.meta.travel_source,
  }
  return { ...trip, days, routing }
}

/**
 * Times the trip on the backend with every place pinned to its current day, so only the order within a day and the hours change.
 * When some place does not fit, the trip comes back unchanged with those places in `routing.unscheduled`. Throws an `ApiError` on failure.
 */
export async function routeSchedule(trip: Trip): Promise<Trip> {
  const body = request(trip, () => true)
  const res = await postJson<RoutingResponse>('/routing', body, TIMEOUT_MS)
  // Some place does not fit its day: keep the draft (nothing is dropped) with the reasons, for the traveler to move or remove it
  if (res.unscheduled.length) return { ...trip, routing: { ...trip.routing, unscheduled: unscheduled(res.unscheduled), warnings: res.warnings, travelSource: res.meta.travel_source } }
  const old = stopsOf(trip)
  const ride = trip.transport === 'taxi' ? 'taxi' : 'bike'
  // Times come with +07:00 and are shown as Saigon time, so the clock part of the string is read as is
  const minutes = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))
  const keptDates = new Set<string>()
  const timedDays: Day[] = res.days.map((day, index) => {
    const stops: Stop[] = day.stops
      .filter((s) => poiById[s.poi.id])
      .map((s, i) => {
        // The first leg runs from the city centre, not from where the traveler stays: it is not shown, but the first start keeps it (retimeDay does too)
        const leg = i === 0 ? { mode: 'walk' as const, distance_km: 0, minutes: 0 } : s.leg
        const mode = leg.mode === 'walk' ? 'walk' : ride
        return {
          ...stopFor(trip, old, s.poi.id),
          start: minutes(s.start),
          end: minutes(s.leave),
          visit: s.visit_minutes,
          wait: i === 0 ? 0 : s.wait_minutes,
          travelMin: leg.minutes,
          travelKm: leg.distance_km,
          travelCost: mode === 'walk' ? 0 : rideCost(leg.distance_km, mode),
          mode,
        }
      })
    // `/routing` may order a day differently when another day changes, so a day that still has the backend's hours and the same places stays as it is
    const kept = trip.days[index]?.stops
    const same = !!kept && kept.length === stops.length && stops.every((stop) => kept.some((had) => had.poiId === stop.poiId))
    if (!isDayTimed(trip, index) || !same) return { index, stops }
    keptDates.add(dateOf(trip, index))
    return trip.days[index]
  })
  // The backend walks only under 1 km: a walking trip keeps its order but is timed on foot, unless that would break the day's opening hours
  const days = trip.transport !== 'walk' ? timedDays : timedDays.map((day) => {
    // The backend's hours stand as floors: a meal held for its window, a rest after lunch and an evening start are kept, and a slower walk only pushes later
    const floors = new Map(day.stops.map((stop) => [stop.uid, stop.start] as const))
    const walked = retimeDay(day.stops, { city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: 'walk', date: dateOf(trip, day.index), floors })
    return walked.violations.length ? day : { ...day, stops: walked.stops }
  })
  // The road legs can cost more than the draft's estimate: a trip over its budget drops stops as the draft does. The rest of the day keeps the
  // backend's hours (a stop is not started earlier than it had), and a removal after which the day breaks opening hours it kept is not made
  const legsOf = (day: Day) => ({ city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: trip.transport, date: dateOf(trip, day.index), legsFrom: day.stops })
  const budgeted = keepBudget(trip, days, (stops, day) => {
    const had = new Set(retimeDay(day.stops, legsOf(day)).violations.map((v) => `${v.uid}:${v.kind}`))
    const timed = retimeDay(stops, legsOf(day))
    return timed.violations.every((v) => had.has(`${v.uid}:${v.kind}`)) ? timed.stops : null
  })
  // The answer's dated warnings describe its own order of each day, so a kept day keeps the warnings it had
  const onKeptDay = (warning: string) => keptDates.has(warning.slice(warning.lastIndexOf(':') + 1))
  const warnings = [...res.warnings.filter((w) => !onKeptDay(w)), ...(trip.routing?.warnings ?? []).filter(onKeptDay)]
  return { ...trip, days: budgeted, scheduled: true, routing: { unscheduled: unscheduled(res.unscheduled), warnings, openDates: trip.routing?.openDates, travelSource: res.meta.travel_source, timed: true } }
}
