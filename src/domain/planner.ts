import { cityById, poiById, poisByCity } from './pois'
import { scorePoi, type ScoreContext } from './scoring'
import { EVENING_START, MAX_CAFES, MAX_MEALS, MAX_NIGHTLIFE, MAX_STOPS, PACE_LIMITS, isMuseum, isReligious, newUid, planSlot, solveDay, tripCost, visitSlot } from './solver'
import { isAvoided } from './tags'
import { addDays } from './time'
import { nameTrip } from './tripText'
import type { CityId, Day, Interests, Pace, Poi, SolverStatus, Stop, TransportPref, Trip } from './types'

export type PlanInput = {
  userId: string
  request: string
  city: CityId
  days: number
  startDate: string
  budget: number
  dayStart: number
  dayEnd: number
  pace: Pace
  transport: TransportPref
  interests: Interests
  keywords: string[]
  avoidTags: string[]
  mustInclude: string[]
  rainy: boolean
  title?: string
  /** Backend fit per place id for this request; see `ScoreContext.fit`. */
  fit?: ReadonlyMap<string, number>
  /** Place ids of each interest section the backend returned, best first; every section gets its turn when places are picked. */
  sections?: string[][]
  /** Stops per day the traveler chose; without it the pace decides. */
  stopsPerDay?: number
  /** The days being edited: they seed the grouping, so places the edit does not touch stay on their day. */
  previous?: Day[]
  /** The stops-per-day limit of the trip being edited: a day grows past what it has only when the edit raises this. */
  previousCap?: number
  /** The budget of the trip being edited: an edit that lowers it may drop stops to fit, any other keeps them. */
  previousBudget?: number
  /** Places the plan must make room for without making them mandatory (what an edit asks to add). */
  prefer?: string[]
  /** Evening venues a day the traveler asked for ("3 quán bar mỗi đêm"); without it `MAX_NIGHTLIFE`. */
  nightsPerDay?: number
  /** Avoid keys (as `avoidTags`) of a kind of place the traveler wants less of ("bớt chùa lại"): one a day at most, a must-visit aside. */
  fewer?: string[]
}

/** The budget a trip starts with when neither the form nor the request names one. */
export const DEFAULT_BUDGET = 2_000_000

export const stopsCap = (input: Pick<PlanInput, 'pace' | 'stopsPerDay'>) => input.stopsPerDay ?? MAX_STOPS[input.pace]

const CANDIDATES_PER_DAY = 9
/** Restaurants a day's candidate list keeps: a day holds `MAX_MEALS`, and more would crowd out everything else the traveler could do. */
const FOOD_CANDIDATES = MAX_MEALS + 2
const CAFE_CANDIDATES = MAX_CAFES + 1
/** A stop of the trip being edited outranks any set of other places a day could hold (scores are 0..1), so an edit only changes what it touches. */
const INCUMBENT_BONUS = 10
/** Minutes allowed for getting to a place the plan must hold, when working out how many of them a day can take. */
const FORCED_TRAVEL = 20

/** A plan, and the must-visit places (ids) no day of the trip could hold. */
export type PlannedTrip = Trip & { unplaced: string[] }

export function scoreContext(input: Pick<PlanInput, 'interests' | 'keywords' | 'budget' | 'days' | 'pace' | 'stopsPerDay' | 'rainy' | 'fit'>): ScoreContext {
  return {
    interests: input.interests,
    keywords: input.keywords,
    perStopBudget: input.budget / Math.max(1, input.days * stopsCap(input)),
    rainy: input.rainy,
    fit: input.fit,
  }
}

/** `ranked` reordered so every interest section gets its turn: the best place of each in turn, then the next best, then whatever is left. */
function interleave(ranked: Poi[], sections: string[][] | undefined): Poi[] {
  if (!sections || sections.length < 2) return ranked
  const byId = new Map(ranked.map((poi) => [poi.id, poi]))
  const position = new Map(ranked.map((poi, index) => [poi.id, index]))
  const lists = sections.map((ids) => ids.filter((id) => byId.has(id)).sort((a, b) => position.get(a)! - position.get(b)!))
  const out: Poi[] = []
  const seen = new Set<string>()
  for (;;) {
    let added = false
    for (const list of lists) {
      const id = list.find((candidate) => !seen.has(candidate))
      if (id === undefined) continue
      seen.add(id)
      out.push(byId.get(id)!)
      added = true
    }
    if (!added) break
  }
  return [...out, ...ranked.filter((poi) => !seen.has(poi.id))]
}

type Point = { lat: number; lng: number }

/**
 * K-means on coordinates; deterministic so plans are reproducible. It starts from `seeds` when given (group i stays day i, empty
 * groups included), otherwise from farthest-first centres.
 */
function cluster(items: Poi[], k: number, seeds?: Point[]): Poi[][] {
  if (!seeds && (k <= 1 || items.length <= k)) return k <= 1 ? [items] : items.map((item) => [item])
  const centers: Point[] = seeds ? seeds.map((seed) => ({ ...seed })) : [{ lat: items[0].lat, lng: items[0].lng }]
  while (centers.length < k) {
    if (!items.length) {
      centers.push({ ...centers[0] })
      continue
    }
    let far = items[0]
    let farD = -1
    for (const item of items) {
      const d = Math.min(...centers.map((c) => (c.lat - item.lat) ** 2 + (c.lng - item.lng) ** 2))
      if (d > farD) {
        farD = d
        far = item
      }
    }
    centers.push({ lat: far.lat, lng: far.lng })
  }
  let groups: Poi[][] = []
  // Given centres are the edited trip's own days: one pass puts each place with its nearest day instead of letting the days drift
  for (let round = 0; round < (seeds ? 1 : 8); round += 1) {
    groups = centers.map(() => [])
    for (const item of items) {
      let bi = 0
      let bd = Infinity
      centers.forEach((c, i) => {
        const d = (c.lat - item.lat) ** 2 + (c.lng - item.lng) ** 2
        if (d < bd) {
          bd = d
          bi = i
        }
      })
      groups[bi].push(item)
    }
    groups.forEach((group, i) => {
      if (!group.length) return
      centers[i] = {
        lat: group.reduce((s, g) => s + g.lat, 0) / group.length,
        lng: group.reduce((s, g) => s + g.lng, 0) / group.length,
      }
    })
  }
  return seeds ? groups : groups.filter((g) => g.length)
}

const centreOf = (places: Poi[], fallback: Point): Point =>
  places.length ? { lat: places.reduce((s, p) => s + p.lat, 0) / places.length, lng: places.reduce((s, p) => s + p.lng, 0) / places.length } : { lat: fallback.lat, lng: fallback.lng }

/** Weekdays (0 = Sunday) a trip starting on `startDate` and lasting `days` days passes through. */
export function tripWeekdays(startDate: string, days: number): number[] {
  const first = new Date(`${startDate}T00:00:00Z`).getUTCDay()
  return Array.from({ length: Math.min(days, 7) }, (_, i) => (first + i) % 7)
}

/** Plans a trip from `candidates` (the places retrieved for the request); without them it plans from every known place in the city. */
export function planTrip(input: PlanInput, candidates?: Poi[]): PlannedTrip {
  const t0 = performance.now()
  const city = cityById[input.city]
  const maxStops = stopsCap(input)
  const ctx = scoreContext(input)
  const avoid = new Set(input.avoidTags)
  const fewer = new Set(input.fewer)

  const weekdays = tripWeekdays(input.startDate, input.days)
  // A place shut one day of the week can still go on another day of the trip
  const open = (poi: Poi) => weekdays.some((day) => !poi.closedDays.includes(day))
  const pool = (candidates ?? poisByCity(input.city)).filter((poi) => input.mustInclude.includes(poi.id) || (!isAvoided(poi, avoid) && open(poi)))
  const incumbent = new Set(input.previous?.flatMap((day) => day.stops.map((stop) => stop.poiId)))
  const scores = new Map(pool.map((poi) => [poi.id, scorePoi(poi, ctx).score + (incumbent.has(poi.id) ? INCUMBENT_BONUS : 0)]))
  const ranked = interleave([...pool].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)), input.sections)

  const inPool = (id: string) => pool.some((poi) => poi.id === id)
  const must = new Set(input.mustInclude.filter(inPool))
  // Mandatory and preferred places are scheduled first; only the mandatory ones are marked as such in the result
  const forced = new Set([...must, ...(input.prefer ?? []).filter(inPool)])
  const days = Math.max(1, Math.min(input.days, 7))
  // One evening out a day: a bar the traveler did not name never fills a day list. Those the request matched are dealt out below,
  // `nightCap` to a day; a bar of the trip being edited goes back to its day under the same limit.
  const night = (poi: Poi) => !!poi.evening
  const keptNight = (poi: Poi) => must.has(poi.id)
  const nightCap = input.nightsPerDay ?? MAX_NIGHTLIFE
  const askedNight = (poi: Poi) => (input.fit ? (input.fit.get(poi.id) ?? 0) > 0 : (input.interests.nightlife ?? 0) > 0.5)
  // What an edit asks to add comes first; a preferred bar is dealt to a day like the others instead of being grouped by area
  const preferred = [...forced].map((id) => poiById[id]).filter((poi) => night(poi) && !keptNight(poi))
  preferred.forEach((poi) => forced.delete(poi.id))
  const preferredIds = new Set(preferred.map((poi) => poi.id))
  // By id: a catalog reload can hand back a new object for a place already in the list
  const nights = [...new Map([...preferred, ...ranked.filter((poi) => night(poi) && !keptNight(poi) && incumbent.has(poi.id)), ...ranked.filter((poi) => night(poi) && !keptNight(poi) && askedNight(poi))].map((poi) => [poi.id, poi])).values()].slice(0, days * nightCap + 3)
  const dealt = new Set<string>()
  // How long the trip being edited stays at each place (the traveler's or the backend's length, not the category's)
  const stays = new Map(input.previous?.flatMap((day) => day.stops.map((stop) => [stop.poiId, stop.visit] as const)))
  const homeAt = new Map(input.previous?.flatMap((day) => day.stops.map((stop, at) => [stop.poiId, at] as const)))
  // The day each place of the trip being edited is on
  const homeDay = new Map(input.previous?.flatMap((day) => day.stops.map((stop) => [stop.poiId, day.index] as const)))
  const daytime = ranked.filter((poi) => !night(poi) || keptNight(poi))
  // A locked place of the trip being edited stays as the traveler left it: same day, same time, same length. The rest is planned around it.
  const pins = new Map<string, { day: number; stop: Stop }>()
  // Unless new dates put it on a day it is shut: then it is placed like any other must-visit, or the edit is refused
  for (const day of input.previous ?? []) {
    if (day.index >= days) continue
    for (const stop of day.stops) {
      // A stop after midnight is open by the next weekday's hours, which only the day's end lets visitSlot see
      if (stop.locked && must.has(stop.poiId) && visitSlot(poiById[stop.poiId], stop.start, stop.visit, weekdays[day.index], input.dayEnd)?.fits) pins.set(stop.poiId, { day: day.index, stop })
    }
  }
  // Spread a small pool over the days instead of front-loading the first one.
  const dayCap = days > 1 ? Math.min(maxStops, Math.max(2, Math.ceil(pool.length / days))) : maxStops

  let groups: Poi[][]
  if (days === 1) {
    groups = [daytime.slice(0, CANDIDATES_PER_DAY)]
    for (const id of forced) if (!groups[0].some((poi) => poi.id === id)) groups[0].push(poiById[id])
    for (const poi of pool) if (incumbent.has(poi.id) && (!night(poi) || keptNight(poi)) && !groups[0].includes(poi)) groups[0].push(poi)
  } else {
    const top = daytime.slice(0, Math.min(daytime.length, days * maxStops + 2))
    for (const id of forced) if (!top.some((poi) => poi.id === id)) top.push(poiById[id])
    // The sections take turns, so the cut can drop a place the trip already has; an edit keeps all of them
    for (const poi of pool) if (incumbent.has(poi.id) && (!night(poi) || keptNight(poi)) && !top.includes(poi)) top.push(poi)
    // A longer trip keeps its days and gains new ones; a shorter one keeps the days that remain
    const seeds = input.previous?.length ? input.previous.slice(0, days).map((day) => centreOf(day.stops.flatMap((stop) => poiById[stop.poiId] ?? []), city)) : undefined
    const byScore = (a: Poi, b: Poi) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)
    const sum = (group: Poi[]) => group.reduce((s, p) => s + (scores.get(p.id) ?? 0), 0)
    // An edited trip keeps each of its places on its day; only new places go to the nearest day
    const keptDay = new Map(seeds ? input.previous!.slice(0, days).flatMap((day, index) => day.stops.map((stop) => [stop.poiId, index] as const)) : [])
    groups = cluster(top.filter((poi) => !keptDay.has(poi.id)), days, seeds)
    top.forEach((poi) => keptDay.has(poi.id) && groups[keptDay.get(poi.id)!].push(poi))
    groups.forEach((group) => group.sort(byScore))
    // Without a trip to keep, the best group goes first; an edited trip keeps its days in order
    if (!seeds) groups.sort((a, b) => sum(b) - sum(a))
    while (groups.length < days) groups.push([])
  }
  // Grouping and ordering may have put a locked place elsewhere; it goes back to its own day
  if (pins.size) {
    groups = groups.map((group) => group.filter((poi) => !pins.has(poi.id)))
    pins.forEach((pin, id) => groups[pin.day].push(poiById[id]))
  }

  // A place the plan must hold goes to a day it is open, and a day takes no more of them than its hours can hold
  const canVisit = (poi: Poi, day: number) => {
    const slot = planSlot(poi, input.dayStart, poi.visit, weekdays[day])
    return !!slot?.fits && slot.start + poi.visit <= input.dayEnd
  }
  const unplaced: string[] = []
  const load = Array.from({ length: days }, () => 0)
  pins.forEach((pin, id) => (load[pin.day] += poiById[id].visit + FORCED_TRAVEL))
  const settled = new Set<string>()
  for (let day = 0; day < days; day += 1) {
    for (const poi of [...groups[day]]) {
      if (!forced.has(poi.id) || pins.has(poi.id) || settled.has(poi.id)) continue
      settled.add(poi.id)
      const need = poi.visit + FORCED_TRAVEL
      const fits = (d: number) => canVisit(poi, d) && load[d] + need <= input.dayEnd - input.dayStart
      const target = fits(day) ? day : load.map((_, d) => d).filter(fits).sort((a, b) => load[a] - load[b])[0]
      if (target === undefined) {
        forced.delete(poi.id)
        if (must.has(poi.id)) {
          groups[day].splice(groups[day].indexOf(poi), 1)
          unplaced.push(poi.id)
        }
        continue
      }
      load[target] += need
      if (target !== day) {
        groups[day].splice(groups[day].indexOf(poi), 1)
        groups[target].push(poi)
      }
    }
  }

  // Each day short of its evening out gets the asked-for bar nearest its other places; the plan makes room for it like a preferred place
  const distance = (poi: Poi, at: Point) => (poi.lat - at.lat) ** 2 + (poi.lng - at.lng) ** 2
  // Only a bar still open after the evening starts and before the day ends on that weekday is dealt to the day
  const fitsEvening = (poi: Poi, day: number) => {
    const slot = planSlot(poi, EVENING_START, poi.visit, weekdays[day])
    return !!slot?.fits && slot.start + poi.visit <= input.dayEnd
  }
  groups.slice(0, days).forEach((group, day) => {
    const centre = centreOf(group.filter((poi) => !night(poi)), city)
    let have = group.filter(night).length
    for (; have < nightCap; have += 1) {
      // A bar the trip already has on another day stays for that day
      const open = nights.filter((poi) => fitsEvening(poi, day) && (!homeDay.has(poi.id) || homeDay.get(poi.id) === day || homeDay.get(poi.id)! >= days))
      if (!open.length) break
      // A bar that opens by 19:00 leaves no empty hours before it; one that opens later is taken only when no other is open
      const soon = open.filter((poi) => (planSlot(poi, EVENING_START, poi.visit, weekdays[day])?.start ?? Infinity) <= EVENING_START + 60)
      // What the edit asks for first, in its order; then the bar this day had; then the one nearest the day's other places
      const pick = open.find((poi) => preferredIds.has(poi.id)) ?? open.find((poi) => homeDay.get(poi.id) === day) ?? (soon.length ? soon : open).reduce((best, poi) => (distance(poi, centre) < distance(best, centre) ? poi : best))
      nights.splice(nights.indexOf(pick), 1)
      group.push(pick)
      forced.add(pick.id)
      dealt.add(pick.id)
    }
  })

  let totalNodes = 0
  let allComplete = true
  let objective = 0
  let spent = 0
  const used = new Set<string>()
  const result: Day[] = []
  // Must-visit places a day could not hold, offered to the days after it
  let carried: Poi[] = []
  // An edit that does not cut the budget keeps the trip's stops whatever they cost, and a place it adds cannot spend the money a later
  // day's own stops need
  const keptCost = Array.from({ length: days }, (_, day) => (input.previous?.[day]?.stops ?? []).filter((stop) => inPool(stop.poiId)).reduce((sum, stop) => sum + poiById[stop.poiId].cost + stop.travelCost, 0))
  const keptStay = !!input.previous && input.budget >= (input.previousBudget ?? input.budget)
  // What the places the edit adds may spend in all: the budget beyond what the trip's own stops cost
  let freshLeft = input.budget - keptCost.reduce((sum, cost) => sum + cost, 0)

  groups.slice(0, days).forEach((group, index) => {
    for (const poi of carried) if (canVisit(poi, index) && !group.includes(poi)) group.push(poi)
    // A day's own cluster first, then the nearest unused POIs from anywhere, so no day is left thin.
    // Mandatory stops go first so the cap on candidates never cuts them off (it did once a pool held more than a day's worth).
    let foods = 0
    let cafes = 0
    let museums = 0
    let religious = 0
    // The day's limits at the trip's pace; a new plan's own picks keep to them, an edit keeps what the trip has
    const limits = PACE_LIMITS[input.pace]
    const own = group
      .filter((poi) => !used.has(poi.id))
      // The trip's own stops come in their order, so the solver's first try is the day as it stands
      .sort((a, b) => Number(forced.has(b.id)) - Number(forced.has(a.id)) || Number(incumbent.has(b.id)) - Number(incumbent.has(a.id)) || (homeAt.get(a.id) ?? 0) - (homeAt.get(b.id) ?? 0))
      .filter((poi) => forced.has(poi.id) || incumbent.has(poi.id) || poi.cat !== 'food' || ++foods <= FOOD_CANDIDATES)
      .filter((poi) => forced.has(poi.id) || incumbent.has(poi.id) || poi.cat !== 'cafe' || ++cafes <= CAFE_CANDIDATES)
      // A new plan's list holds one museum more than the day may have, so the solver can still choose among them
      .filter((poi) => input.previous || forced.has(poi.id) || !isMuseum(poi) || ++museums <= limits.museums + 1)
      // But only the pagodas or churches the day may have, open that day: a city's many pagodas would take the seats other kinds of place need
      .filter((poi) => input.previous || forced.has(poi.id) || !isReligious(poi) || (canVisit(poi, index) && ++religious <= limits.religious))
      // A day the traveler filled by hand keeps all its stops on the list
      .slice(0, Math.max(CANDIDATES_PER_DAY, group.filter((poi) => !used.has(poi.id) && (forced.has(poi.id) || homeDay.get(poi.id) === index)).length))
    const enoughFood = own.filter((poi) => poi.cat === 'food').length >= FOOD_CANDIDATES
    const enoughCafes = own.filter((poi) => poi.cat === 'cafe').length >= CAFE_CANDIDATES
    const enoughMuseums = !input.previous && own.filter(isMuseum).length >= limits.museums + 1
    // The pagodas or churches the rest of a new plan's list may still bring, all lists together
    const religiousLeft = input.previous ? Infinity : Math.max(0, limits.religious - own.filter(isReligious).length)
    const capReligious = (list: Poi[], left: number) => {
      let seats = left
      return list.filter((poi) => !isReligious(poi) || seats-- > 0)
    }
    const centre = own.length
      ? { lat: own.reduce((s, g) => s + g.lat, 0) / own.length, lng: own.reduce((s, g) => s + g.lng, 0) / own.length }
      : { lat: city.lat, lng: city.lng }
    const ownIds = new Set(own.map((poi) => poi.id))
    // Filler never takes a mandatory place: those belong to the day their group put them on, and another day taking one would move it
    const free = daytime
      .filter((poi) => !used.has(poi.id) && !ownIds.has(poi.id) && !forced.has(poi.id) && !night(poi) && (!homeDay.has(poi.id) || homeDay.get(poi.id) === index || homeDay.get(poi.id)! >= days))
      .sort((a, b) => (a.lat - centre.lat) ** 2 + (a.lng - centre.lng) ** 2 - ((b.lat - centre.lat) ** 2 + (b.lng - centre.lng) ** 2))
    // A day of food alone has no way to avoid meals back to back: the nearest other places get seats on the list, in place of its last food stops
    const isFood = (poi: Poi) => poi.cat === 'food' || poi.cat === 'cafe'
    // An edit keeps the places the trip has, so only a new plan makes these seats
    const others = input.previous ? [] : capReligious(free.filter((poi) => !isFood(poi)), religiousLeft).slice(0, Math.max(0, Math.ceil(maxStops / 2) - own.filter((poi) => !isFood(poi)).length))
    while (others.length && own.length + others.length > CANDIDATES_PER_DAY) {
      const last = own.findLastIndex((poi) => isFood(poi) && !forced.has(poi.id))
      if (last < 0) break
      own.splice(last, 1)
    }
    // A day's list holds the sit-down meals the day should have: the best of the nearest ones take seats, in place of its last other places
    const byScoreHere = (a: Poi, b: Poi) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)
    const mealSeats = input.previous ? [] : free.filter((poi) => poi.cat === 'food').slice(0, 6).sort(byScoreHere).slice(0, Math.max(0, limits.meals - own.filter((poi) => poi.cat === 'food').length))
    while (mealSeats.length && own.length + others.length + mealSeats.length > CANDIDATES_PER_DAY) {
      const last = own.findLastIndex((poi) => !isFood(poi) && !forced.has(poi.id))
      if (last < 0) break
      own.splice(last, 1)
    }
    const filler = capReligious(
      free.filter((poi) => !others.includes(poi) && !mealSeats.includes(poi) && !(enoughFood && poi.cat === 'food') && !(enoughCafes && poi.cat === 'cafe') && !(enoughMuseums && isMuseum(poi))),
      religiousLeft - others.filter(isReligious).length,
    )
      .slice(0, Math.max(0, CANDIDATES_PER_DAY - own.length - others.length - mealSeats.length))
    // The first of each kind the traveler wants less of (the day's own, in its order) stays, the rest give their seats to other places
    const fewerSeen = new Set<string>()
    const keepFewer = (poi: Poi) => {
      const kinds = [...fewer].filter((key) => isAvoided(poi, new Set([key])))
      if (!kinds.length || must.has(poi.id)) return true
      if (kinds.some((key) => fewerSeen.has(key))) return false
      kinds.forEach((key) => fewerSeen.add(key))
      return true
    }
    const candidates = [...own, ...others, ...mealSeats, ...filler].filter(keepFewer)
    // An edit does not refill a day the traveler thinned out: it holds what it had plus what the edit adds, up to the pace limit (a wish replaces
    // the weakest free stop of a full day), unless the edit raises that limit. A day the traveler filled past the limit by hand keeps its stops
    const had = input.previous?.[index]?.stops.length
    const cap = input.previousCap ?? maxStops
    const added = candidates.filter((poi) => forced.has(poi.id) && !incumbent.has(poi.id)).length
    const dayLimit = had === undefined || maxStops > cap ? dayCap : maxStops < cap ? Math.min(dayCap, had + added) : Math.max(had, Math.min(had + added, maxStops))
    const share = (input.budget - spent) / (days - index)
    const pinHere = (id: string) => (pins.get(id)?.day === index ? pins.get(id)!.stop : undefined)
    const wanted = (ids: Set<string>) => new Set(candidates.filter((poi) => ids.has(poi.id)).map((poi) => poi.id))
    // A place of the trip keeps its length, and a locked one has its open/close window narrowed to its slot so the solver can only put it there
    const sized = candidates.map((poi) => (stays.has(poi.id) ? { ...poi, visit: stays.get(poi.id)! } : poi))
    const slotted = sized.map((poi) => (pinHere(poi.id) ? { ...poi, open: pinHere(poi.id)!.start, close: pinHere(poi.id)!.end, windows: undefined } : poi))
    // When the slots cannot all hold (a shorter day, a longer walk) the locked places keep their day and length but may shift in time;
    // when the wishes crowd a day beyond what it holds, they give way before a locked place does.
    const tries: [Poi[], Set<string>][] = [[slotted, wanted(forced)]]
    if (candidates.some((poi) => pinHere(poi.id))) tries.push([sized, wanted(forced)])
    // Dealt bars that do not all fit give way one at a time from the last, so a day keeps as many as fit and the edit's wishes keep their place
    const dealtHere = candidates.filter((poi) => dealt.has(poi.id)).map((poi) => poi.id)
    for (let keep = dealtHere.length - 1; keep >= 0; keep -= 1) {
      const dropped = new Set(dealtHere.slice(keep))
      tries.push([sized, wanted(new Set([...forced].filter((id) => !dropped.has(id))))])
    }
    if (candidates.some((poi) => forced.has(poi.id) && !must.has(poi.id))) tries.push([sized, wanted(must)])
    // A day that cannot hold all its must-visit places lets the last ones go to a later day; a locked place stays
    const movable = candidates.filter((poi) => must.has(poi.id) && !pinHere(poi.id)).map((poi) => poi.id)
    for (let keep = movable.length - 1; keep >= 0; keep -= 1) {
      const moved = new Set(movable.slice(keep))
      tries.push([sized, wanted(new Set([...must].filter((id) => !moved.has(id))))])
    }
    // The trip's own stops of this day: a stop moved in from another day (a shorter trip) keeps the day's limits like a new one, and pays from the edit's money
    const keptHere = new Set((input.previous?.[index]?.stops ?? []).map((stop) => stop.poiId))
    const run = ([list, mustInclude]: [Poi[], Set<string>]) =>
      solveDay({
        city: input.city,
        candidates: list,
        scores,
        dayStart: input.dayStart,
        dayEnd: input.dayEnd,
        maxStops: Math.max(dayLimit, mustInclude.size),
        transport: input.transport,
        budgetLeft: Math.min(input.budget - spent, share * 1.3),
        freshBudgetLeft: keptStay ? freshLeft : undefined,
        mustInclude,
        date: addDays(input.startDate, index),
        varied: !input.previous,
        limits: input.previous ? undefined : limits,
        kept: keptHere,
      })
    let solved = run(tries[0])
    for (const retry of tries.slice(1)) if (!solved.feasible) solved = run(retry)
    totalNodes += solved.nodes
    allComplete = allComplete && solved.complete
    objective += solved.objective
    solved.stops.forEach((stop) => used.add(stop.poiId))
    freshLeft -= solved.stops.filter((stop) => !keptHere.has(stop.poiId)).reduce((sum, stop) => sum + poiById[stop.poiId].cost + stop.travelCost, 0)
    carried = [...carried.filter((poi) => !group.includes(poi)), ...group.filter((poi) => must.has(poi.id) && !pins.has(poi.id) && !used.has(poi.id))]
    spent += solved.stops.reduce((s, stop) => s + poiById[stop.poiId].cost + stop.travelCost, 0)
    result.push({ index, stops: solved.stops.map((stop) => ({ ...stop, uid: pinHere(stop.poiId)?.uid ?? stop.uid, locked: must.has(stop.poiId) })) })
  })

  const anyStops = result.some((day) => day.stops.length)
  unplaced.push(...carried.map((poi) => poi.id))
  const status: SolverStatus = !anyStops ? 'INFEASIBLE' : days === 1 && allComplete ? 'OPTIMAL' : 'FEASIBLE'

  const id = `t-${Date.now().toString(36)}${newUid().slice(-3)}`
  return {
    id,
    userId: input.userId,
    title: input.title ?? nameTrip({ id, city: input.city, startDate: input.startDate, days: result, pace: input.pace, rainy: input.rainy }),
    autoTitle: input.title === undefined,
    city: input.city,
    startDate: input.startDate,
    days: result,
    budget: input.budget,
    dayStart: input.dayStart,
    dayEnd: input.dayEnd,
    pace: input.pace,
    transport: input.transport,
    status: 'upcoming',
    solver: {
      status,
      objective: Math.round(objective * 10) / 10,
      nodes: totalNodes,
      ms: Math.max(1, Math.round(performance.now() - t0)),
      model: days === 1 ? 'CP-SAT · OPTW' : 'CP-SAT · TOPTW (day-by-day)',
    },
    request: input.request,
    rainy: input.rainy,
    createdAt: new Date().toISOString(),
    version: 1,
    mustInclude: [...must].filter((id) => !unplaced.includes(id)),
    unplaced,
    avoidTags: input.avoidTags,
    interests: input.interests,
    keywords: input.keywords,
    scheduled: false,
    stopsPerDay: input.stopsPerDay,
    nightsPerDay: input.nightsPerDay,
  }
}

export const isScheduled = (trip: Trip) => trip.scheduled !== false

/** Whether day `index` still shows the backend's hours (checked against opening hours there), so the device neither re-times nor judges it. */
export function isDayTimed(trip: Trip, index: number): boolean {
  const routing = trip.routing
  if (!routing) return false
  // Trips saved before days were tracked one by one have a single flag for the whole trip
  return routing.timedDays ? Boolean(routing.timedDays[index]) : Boolean(routing.timed)
}

export const tripStopCount = (trip: Trip) => trip.days.reduce((n, day) => n + day.stops.length, 0)
export const tripSpend = (trip: Trip) => tripCost(trip.days)
