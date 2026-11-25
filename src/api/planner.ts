import { isRainy, weatherFor } from '../domain/conditions'
import { COMPANION_INTERESTS, DEFAULT_DAY_END, DEFAULT_DAY_START, endsNextDay, forRetrieval, intentFromExtraction, nextDayEndIn } from '../domain/intentFromExtraction'
import { BLANK_EXTRACTION, type Constraint, type Extraction } from '../domain/extraction'
import { applyForm, mergeExtraction, type FormValues } from '../domain/mergeExtraction'
import { MAX_TRIP_DAYS, type Intent } from '../domain/nlp'
import { DEFAULT_BUDGET, planTrip, stopsCap, type PlanInput } from '../domain/planner'
import { EVENING_START, MAX_CAFES, MAX_NIGHTLIFE, MAX_STOPS, PACE_LIMITS, isReligious } from '../domain/solver'
import { cityById, normalize, poiById, poisByCity } from '../domain/pois'
import { addDays, DAY_MINUTES, dayWindowProblem, daysBetween, hm } from '../domain/time'
import type { CityId, Pace, Poi, TransportPref, Trip, Weather } from '../domain/types'
import { isAvoided } from '../domain/tags'
import { extractConstraints, llmEnabled } from './extraction'
import { inCity, loadCatalog, retrievePlaces, takePlaces } from './catalog'
import { routeDraft } from './routing'
import { ApiError, noServerAnswer } from './http'
import { dayWindowError } from './errorText'
import type { Profile } from './profile'

/** Today in Vietnam (one time zone for every city), whatever time zone the device is in (`en-CA` writes dates as YYYY-MM-DD). */
export const saigonToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())

/** The foods a traveler typed in their profile, as the tags the planner avoids: a dish leaves out the places named for it, not all food. */
const dietAvoids = (words: string[]) => (words.length ? intentFromExtraction({ extraction: { ...BLANK_EXTRACTION, avoid: words } }).avoidTags : [])

/** What the planner learned while gathering data, shown as the pipeline completes. */
export type PlanReport = {
  intent: Intent
  weather: Weather
  considered: number
  excluded: number
  trip: Trip
  /** Must-visit names the backend could not find among its places. */
  notFound: string[]
  /** Must-visit places (ids) it found but no day of the trip could hold. */
  unplaced: string[]
  warnings: string[]
}

export type PlanRequest = {
  text: string
  userId: string
  profile: Profile
  /** Values the traveler edited in the form; they win over what the text said. */
  overrides: Partial<{ city: PlanInput['city']; days: number; startDate: string; budget: number; pace: Pace; transport: TransportPref }>
}

/**
 * Reads the traveler's request into constraints with the backend's Gemini pipeline (`POST /chat`). There is no on-device
 * substitute: when the backend is unreachable, out of quota or too slow the error reaches the caller, which tells the
 * traveler, instead of guessing from keywords.
 *
 * With `form` (the dates, length and budget picked before writing) the text is only the extra wishes: it is optional, and
 * what the form says wins over any date, amount or hour typed in it. Without text there is nothing to read, so the backend model
 * is not called. `city` is the one picked, planned unless the text names another. `later` is the days of a journey's legs after this one:
 * they keep its hours, so a day's limits count the whole journey.
 */
export async function analyzeRequest(text: string, form?: FormValues, touched: Partial<Record<keyof FormValues | 'endDate', boolean>> = {}, city: CityId = 'sai-gon', later = 0): Promise<Intent> {
  const extra = text.trim()
  // Hours count only once the traveler set them: the form shows the default day, which must not overrule hours the text names
  const hours = { dayStart: touched.dayStart ? form?.dayStart : undefined, dayEnd: touched.dayEnd ? form?.dayEnd : undefined }
  // An end picked in the form at or before its start is the next day, as the form shows beside it
  const pickedNextDay = hours.dayEnd !== undefined
  if (form && !extra) return intentFromExtraction({ extraction: applyForm({ ...BLANK_EXTRACTION, destination: cityById[city].destination }, { ...form, ...hours }, city) }, city, pickedNextDay, later)
  if (!llmEnabled) throw new ApiError('not-configured', 'VITE_API_URL is not set')
  const read = await extractConstraints(extra)
  // The model may read no end from late-night words ("chơi tới 2h khuya"): the hour said with them is the end
  const lateEnd = read.extraction.available_end ? null : nextDayEndIn(extra)
  const response = lateEnd ? { ...read, extraction: { ...read.extraction, available_end: lateEnd } } : read
  // An end the text names before its start is the next day only when its words say so ("tới 3h sáng hôm sau", "until 3am")
  const saidEnd = response.extraction.available_end
  const textNextDay = !!saidEnd && endsNextDay(extra, hm(saidEnd))
  const said = intentFromExtraction(response, city, textNextDay, later)
  // The model has no topic for a wish like "tham quan": say so instead of letting the plan look as if it had read the text
  const textIgnored = !said.startDate && !readSomething(response.extraction, said)
  if (!form) return { ...said, textIgnored }
  // A value the traveler changed in the form wins over the text; one they left as it was does not, so "3 ngày" typed in the box is not
  // overruled by the form's default of 2.
  const resolved: FormValues = {
    ...datesOf(form, touched, said),
    budget: touched.budget ? form.budget : (said.budget ?? form.budget),
    ...hours,
  }
  return { ...intentFromExtraction({ ...response, extraction: applyForm(response.extraction, resolved, city) }, city, pickedNextDay || textNextDay, later), textIgnored }
}

/**
 * The trip's first day and length from the form and the text: a date the traveler picked wins, one they left follows the text ("từ 5 đến
 * 7/12" fills both). A picked last day stays where it is when the text moves the first, so the length follows it; when the text would put
 * the first day after it, or make the trip too long, the form's own dates stand.
 */
function datesOf(form: FormValues, touched: Partial<Record<keyof FormValues | 'endDate', boolean>>, said: Intent): Pick<FormValues, 'startDate' | 'days'> {
  const startDate = touched.startDate ? form.startDate : (said.startDate ?? form.startDate)
  if (!touched.endDate && !touched.days) return { startDate, days: said.days ?? form.days }
  const days = daysBetween(startDate, addDays(form.startDate, form.days - 1)) + 1
  return days >= 1 && days <= MAX_TRIP_DAYS ? { startDate, days } : { startDate: form.startDate, days: form.days }
}

/** True when the backend model found something in the text that the planner can act on. */
function readSomething(e: Extraction, said: Intent): boolean {
  const asked = forRetrieval(e)
  return (
    Boolean(e.destination) || asked.interests.length > 0 || asked.avoid.length > 0 || Object.keys(said.interests).length > 0 || said.avoidTags.length > 0 || said.mustInclude.length > 0 || e.must_visit.length > 0 || e.preferred_places.length > 0 ||
    said.budget !== undefined || said.days !== undefined || said.pace !== undefined || said.transport !== undefined || Boolean(e.available_start || e.available_end)
  )
}

export function buildInput(request: PlanRequest, intent: Intent): PlanInput {
  const { profile, overrides } = request
  const city = overrides.city ?? intent.city ?? 'sai-gon'
  const days = overrides.days ?? intent.days ?? 2
  const startDate = overrides.startDate ?? saigonToday()
  const pace = overrides.pace ?? intent.pace ?? profile.pace
  const budget = overrides.budget ?? intent.budget ?? DEFAULT_BUDGET
  const weather = weatherFor(city, startDate)
  const interests = { ...profile.interests, ...intent.interests }
  return {
    userId: request.userId,
    request: request.text,
    city,
    days,
    startDate,
    budget,
    dayStart: intent.dayStart ?? DEFAULT_DAY_START,
    dayEnd: intent.dayEnd ?? DEFAULT_DAY_END,
    pace,
    transport: overrides.transport ?? intent.transport ?? profile.transport,
    interests,
    keywords: intent.keywords,
    avoidTags: [...new Set([...dietAvoids(profile.dietary), ...intent.avoidTags])],
    mustInclude: intent.mustInclude,
    rainy: isRainy(weather),
    nightsPerDay: intent.nightsPerDay,
  }
}

/** The day's end when the trip has an evening out and the traveler named none: bars open late (some at 21:00), the default 21:00 leaves them no time. */
const NIGHT_DAY_END = hm('23:30')
/** The day's start when the traveler named none and the trip has an evening out, so the visits run into the evening instead of ending hours before it. */
const NIGHT_ONLY_DAY_START = hm('14:00')
const NIGHT_AND_DAY_START = hm('10:00')

/** Candidates asked of the backend per interest section; its page limit is 20. */
const PLAN_SECTION_LIMIT = 20

/**
 * Retrieves the places that fit the extraction from the backend (`POST /retrieval`) and plans from them, scored by how well
 * the backend found each one to fit. When the request names no interest, or the matches are fewer than the days need, the rest of
 * the city's places fill in after them (the planner takes every match first), so no day is left empty.
 */
async function planFromBackend(input: PlanInput, intent: Intent) {
  const extraction = intent.extraction
  if (!extraction) throw new ApiError('no-extraction', 'The request has not been read yet')
  const response = await retrievePlaces(inCity(forRetrieval(extraction), input.city), { limit: PLAN_SECTION_LIMIT })
  // The backend has no data for this city yet: say so rather than plan from nothing (or from another city's places)
  if (response.status === 'unsupported_destination' && poisByCity(input.city).length === 0) throw new ApiError('no-city-places', `No places in ${input.city} yet`)
  const found = takePlaces(response, input.city)
  const night = (poi: Poi) => !!poi.evening
  // A new trip with an evening out starts and ends later unless the traveler named those hours; a trip being edited keeps its own
  const matched = [...found.candidates, ...found.pinned]
  if (!input.previous && matched.some(night)) {
    const dayEnd = intent.dayEnd === undefined ? Math.max(input.dayEnd, NIGHT_DAY_END) : input.dayEnd
    // A day of few stops (a slow day's or fewer) cannot bridge the hours from the morning to its evening out: it starts in the afternoon,
    // like a trip of bars alone
    const lateStart = matched.every(night) || stopsCap(input) <= MAX_STOPS.slow ? NIGHT_ONLY_DAY_START : NIGHT_AND_DAY_START
    input = { ...input, dayEnd, dayStart: intent.dayStart === undefined && dayEnd > EVENING_START ? lateStart : input.dayStart }
  }
  const needed = Math.min(input.days, 7) * stopsCap(input)
  const avoid = new Set(input.avoidTags)
  const wanted = found.candidates.filter((poi) => !isAvoided(poi, avoid))
  const rest = () => poisByCity(input.city).filter((poi) => !found.candidates.some((match) => match.id === poi.id))
  // Food stops are spaced out by other kinds of place, so a request that matched mostly food and cafés needs about half its stops from elsewhere
  const neededBesidesFood = Math.min(input.days, 7) * Math.ceil(stopsCap(input) / 2)
  const besidesFood = (poi: Poi) => poi.cat !== 'food' && poi.cat !== 'cafe' && !night(poi)
  // A day holds one evening out and two cafés as well, so of the bars and cafés a request matched only that many count towards filling the days
  const spareNights = Math.max(0, wanted.filter(night).length - Math.min(input.days, 7) * (input.nightsPerDay ?? MAX_NIGHTLIFE))
  const spareCafes = Math.max(0, wanted.filter((poi) => poi.cat === 'cafe').length - Math.min(input.days, 7) * MAX_CAFES)
  // and the pagodas or churches a day may have: a request matched mostly pagodas fills its days from the city's other places
  const spareReligious = Math.max(0, wanted.filter(isReligious).length - Math.min(input.days, 7) * PACE_LIMITS[input.pace].religious)
  const usable = wanted.length - spareNights - spareCafes - spareReligious
  const sights = wanted.filter(besidesFood).length - spareReligious
  // A day should have its sit-down meals even when the request named no food: the nearest good ones come from the rest of the city's places
  const neededFood = input.previous ? 0 : Math.min(input.days, 7) * PACE_LIMITS[input.pace].meals
  const sitDown = (poi: Poi) => poi.cat === 'food'
  const short = usable < needed || sights < neededBesidesFood || wanted.filter(sitDown).length < neededFood
  const available = () => rest().filter((poi) => !isAvoided(poi, avoid))
  // The places beside food come from the whole catalogue, which this browser may not have loaded yet
  if (short && (usable + available().length < needed || sights + available().filter(besidesFood).length < neededBesidesFood || wanted.filter(sitDown).length + available().filter(sitDown).length < neededFood)) await loadCatalog(input.city)
  const fillers = short ? rest() : []
  // The places the trip being edited already has, and the ones it must keep, stay in the pool even when this retrieval did not return
  // them: the retrieval follows what the edit asks for, and an edit should only change what it touches.
  const listed = new Set([...found.candidates, ...fillers].map((poi) => poi.id))
  const keep = new Set([...input.mustInclude, ...(input.prefer ?? []), ...(input.previous ?? []).flatMap((day) => day.stops.map((stop) => stop.poiId))])
  const kept = [...keep].filter((id) => !listed.has(id) && poiById[id]).map((id) => poiById[id])
  const pool = [...found.candidates, ...fillers, ...kept]
  // What the backend did not return does not fit the wish: it only fills the days after the matches. With no match at all, the profile's interests rank them.
  const fit = new Map(found.fit)
  if (found.candidates.length) for (const poi of fillers) fit.set(poi.id, 0)
  if (pool.length === 0) throw poisByCity(input.city).length ? new ApiError('no-places', 'No places are available to plan from') : new ApiError('no-city-places', `No places in ${input.city} yet`)
  const mustInclude = [...new Set([...input.mustInclude, ...found.pinned.map((poi) => poi.id)])]
  const { unplaced, ...planned } = planTrip({ ...input, mustInclude, fit, sections: found.sections }, pool)
  return { found, pool, trip: { ...planned, extraction }, unplaced, excluded: pool.filter((poi) => isAvoided(poi, avoid)).length }
}

/** Runs the whole generate-itinerary flow (report §2.2.1): the extraction the review screen showed, then retrieval, then planning. */
export async function generateItinerary(request: PlanRequest, intent: Intent): Promise<PlanReport> {
  const input = buildInput(request, intent)
  const weather = weatherFor(input.city, input.startDate)
  const { found, pool, trip, excluded, unplaced } = await planFromBackend(input, intent)
  if (!trip.days.some((day) => day.stops.length)) throw new ApiError('nothing-fits', 'No place fits this request')
  // The places are chosen here; the backend planner splits them over the days (opening days, areas, café and meal rules).
  // When it gives no answer (offline, timeout, down, or the trip cannot be sent) the device's own split stands, so planning never fails on
  // that; a request it refuses is reported, as sending it again would change nothing.
  const routed = await routeDraft(trip, false).catch((error: unknown) => (noServerAnswer(error) ? null : Promise.reject(error)))
  return { intent, weather, considered: pool.length, excluded, trip: routed ?? trip, notFound: found.notFound, unplaced, warnings: found.warnings }
}

/**
 * "bớt chùa lại", "ít cà phê thôi", "đi ít chùa hơn", "less temples please", or typed without accents ("bot chua lai", "it ca phe thoi"): the
 * model reads these as wishes for more, so the kind of place named is kept to one a day instead. English "it" ("it is raining") is not "ít".
 */
const FEWER = /^(?:(?:đi|di|cho)\s+)?(?:giảm bớt|giam bot|bớt|bot|giảm|giam|ít|it(?!\s+(?:is|was|has|had|will|would|can|could|should|may|might|must|seems?|looks?|feels?|gets?|a|an|the|to|in|on|at|of|for|and|or|be|rains?|rained)(?!\p{L}))|fewer|less)\s+(?:(?:đi|di)\s+)?([^,;.!?]+?)(?:\s+(?:lại|lai|đi|di|thôi|thoi|bớt|bot|nữa|nua|nhé|nhe|nha|hơn|hon|một chút|mot chut|chút|chut|please|a bit))*\s*[.!]?$/iu
/**
 * Words that ask for something besides less ("bớt chùa và thêm bảo tàng", "less temples and more cafes", "bớt chùa và thích bảo tàng hơn"):
 * read as "fewer of both", the half that adds would be lost, so the model reads it.
 */
const OTHER_WISH = /(?<!\p{L})(?:thêm|them|nhiều|nhieu|more|add|plus|extra|đổi|doi|thay|replace|swap|instead|bỏ|không|khong|no|not|without|skip|nhưng|nhung|but|muốn|muon|want|thích|thich|ưu tiên|uu tien|ưa|chuộng|like|prefer|love|enjoy|đi|di|về|go|visit|ghé|thăm|tham|xem|ngắm|ngam|ăn|uống|chơi|choi|see|eat|try)(?!\p{L})/iu
/** "đổi chùa thành bảo tàng", "thay cà phê bằng chợ", "doi chua thanh bao tang", "replace temples with museums": the model reads nothing from a swap. */
const SWAP = /^(?:(đổi|doi|thay thế|thay the|thay)|swap|replace)\s+([^,;.!?]+?)\s+(?:thành|thanh|bằng|bang|sang|with|for)\s+([^,;.!?]+?)\s*[.!]?$/iu
/** "đổi chùa sang ngày 2", "đổi bảo tàng sang buổi chiều", "doi chua sang ngay 2": a move to another day or time, not a swap for another kind of place. */
const NOT_A_PLACE = /^(?:ngày|ngay|hôm|hom|buổi|buoi|sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem|day|morning|afternoon|evening|night)(?!\p{L})/iu

/** The kind of place the words name, as avoid keys; none when they name no kind the places can be told apart by ("giờ bắt đầu", "chỗ"). */
function placeKind(words: string, city: CityId): string[] {
  const read = intentFromExtraction({ extraction: { ...BLANK_EXTRACTION, avoid: [words] } }, city)
  return read.chips.some((chip) => chip.kind === 'soft') ? [] : read.avoidTags
}

/**
 * The edit without the change of length or hours the rules below read themselves, so "bớt chùa và thêm 1 ngày" is still a "less of". Words
 * they read nothing from stay ("về trước 9h": no day ends at 9:00), so the sentence goes to the model whole instead of losing its hours.
 */
function withoutLocal(text: string): string {
  let rest = text
  if (dayChangeOf(rest)) rest = rest.replace(DAY_CHANGE, ' ')
  if (startOf(rest)) rest = rest.replace(START_AT, ' ')
  if (endOf(rest)) rest = rest.replace(END_AT, ' ')
  return rest.replace(/^(?:[\s,;]+|(?:và|va|and)(?!\p{L}))+|(?:[\s,;]+|(?<!\p{L})(?:và|va|and))+$/giu, '')
}

/** What a "less of" edit names, as avoid keys; none when it also asks for something else. */
const fewerOf = (text: string, city: CityId) => {
  const named = withoutLocal(text).match(FEWER)?.[1]
  return named && !OTHER_WISH.test(named) ? placeKind(named, city) : []
}

/** What a swap of one kind of place for another names: whether it was said in Vietnamese, the kind given up and the kind wanted. */
function swapOf(text: string, city: CityId): [vietnamese: boolean, from: string, to: string] | null {
  const swap = text.match(SWAP)
  return swap && placeKind(swap[2], city).length && !NOT_A_PLACE.test(swap[3]) ? [Boolean(swap[1]), swap[2], swap[3]] : null
}

/**
 * "thêm 1 ngày", "bớt hai ngày", "thêm 2 ngày nữa", "them 1 ngay", "add 2 more days": the model has no field for a change of length, so it
 * changes the trip's own length. Not one: "add a day trip", English "them" ("give them 2 days"), and "tu" or "sau" before a date ("bot tu ngay
 * 3", bớt từ ngày 3; "thêm sau ngày 2 một buổi chợ đêm", after day 2), so "tu" (tư) and "sau" (sáu) count only when nothing follows.
 */
const DAY_CHANGE = /(?<!\p{L})(?:(thêm|them|bớt|bot|giảm|giam)\s+(?:(?:đi|di)\s+)?(\d|một|mot|hai|ba|bốn|bon|tư|(?:tu|sau)(?=\s+(?:ngày|ngay)(?:\s+(?:nữa|nua))?\s*(?:[,;.!?]|$))|năm|nam|sáu|bảy|bay)\s+(?:ngày|ngay)(?:\s+(?:nữa|nua))?|(add|cut|remove)\s+(\d|a|an|one|another|two|three|four|five|six|seven)\s+(?:(?:more|extra)\s+)?days?)(?!\p{L})(?!\s+trips?(?!\p{L}))/iu
/** The number words a change of length is said with, without accents. */
const DAY_COUNT: Record<string, number> = { mot: 1, a: 1, an: 1, one: 1, another: 1, hai: 2, two: 2, ba: 3, three: 3, bon: 4, tu: 4, four: 4, nam: 5, five: 5, sau: 6, six: 6, bay: 7, seven: 7 }

/** Days the edit adds (positive) or takes off (negative). */
function dayChangeOf(text: string): number {
  const change = text.match(DAY_CHANGE)
  if (!change) return 0
  const count = normalize(change[2] ?? change[4])
  const days = /^\d$/.test(count) ? Number(count) : (DAY_COUNT[count] ?? 1)
  return /^(?:them|add)$/.test(normalize(change[1] ?? change[3])) ? days : -days
}

/** `value` without what `pattern` matched; empty when a word or less is left ("nhé", "đổi"), which names nothing to look for. */
function without(value: string, pattern: RegExp): string {
  const rest = value.replace(pattern, ' ').replace(/[\s,;.!?]+/g, ' ').trim()
  return rest.split(' ').length >= 2 ? rest : ''
}

/** The model's wishes without the words `pattern` matched in them: "thêm 1 ngày đi Bà Nà" keeps "đi Bà Nà", "thêm 1 ngày" goes. */
function strip(e: Extraction, pattern: RegExp, fields: Constraint['field'][]): Extraction {
  const keep = (list: Constraint[]) => list.flatMap((atom) => (fields.includes(atom.field) && pattern.test(atom.value) ? (without(atom.value, pattern) ? [{ ...atom, value: without(atom.value, pattern) }] : []) : [atom]))
  return { ...e, hard_constraints: keep(e.hard_constraints), soft_constraints: keep(e.soft_constraints) }
}

/** The edit without its change of length, which the model files as a wish ("thêm 1 ngày") or as the trip's whole length. */
function withoutDayChange(e: Extraction): Extraction {
  const interests = e.interests.flatMap((value) => (DAY_CHANGE.test(value) ? (without(value, DAY_CHANGE) || []) : [value]))
  return { ...strip(e, DAY_CHANGE, ['other', 'interests']), duration_days: null, end_date: null, interests }
}

/**
 * "đổi giờ bắt đầu thành 9h sáng", "về trước 20h", "tối đi từ 7h": the model reads a change of hours unreliably (nothing, or the sentence as
 * a wish), so hours an edit names with their unit are taken when it read none. A date ("bắt đầu từ ngày 5") has no unit and is never one, and
 * the words are whole words ("friend at 7pm" holds no "end"). Typed without accents ("ve truoc 20h") they are read the same.
 */
// The part of the day after the hour. Without accents it is sure only where the words end or say when ("9h toi", "10h toi nay" tối nay); elsewhere
// it is only maybe one ("9h toi khach san" is tới, to; "8h sang Hội An" sang, to)
const AFTER_HOUR = String.raw`(?:(?<after>sáng|trưa|chiều|tối|đêm|khuya|am|pm|(?:sang|trua|chieu|toi|dem)(?=\s*(?:$|[,;.!?]|(?:nhé|nhe|nha|thôi|thoi|đi|di|và|va|and|được|duoc|nay|hôm nay|hom nay|mai|ngày mai|ngay mai|ạ|a)(?!\p{L}))))|(?<maybeAfter>sang|trua|chieu|toi|dem)(?!\p{L}))`
const CLOCK = String.raw`(?!\p{L})\D{0,12}?(?<hour>\d{1,2})(?:\s*(?:h|giờ|gio|:)(?:\s*(?<minute>\d{2})|\s*(?<half>rưỡi|ruoi))?|(?=\s*(?:am|pm)))\s*${AFTER_HOUR}?(?!\p{L})`
/** The part of the day before the words: sure only as written with its accents, as without them "toi ve truoc 10h" may be tôi (I) or tối. */
const PERIOD = String.raw`(?<!\p{L})(?:(?<before>sáng|trưa|chiều|tối|đêm|khuya)\s+|(?<maybeBefore>sang|trua|chieu|toi|dem)\s+)?`
const START_AT = new RegExp(String.raw`${PERIOD}(?:giờ bắt đầu|gio bat dau|bắt đầu|bat dau|xuất phát|xuat phat|đi từ|di tu|start(?:ing)?(?: time)?)${CLOCK}`, 'iu')
const END_AT = new RegExp(String.raw`${PERIOD}(?:giờ kết thúc|gio ket thuc|kết thúc|ket thuc|giờ về|gio ve|về trước|ve truoc|về lúc|ve luc|end(?:ing)?(?: time)?|finish(?:ing)?)${CLOCK}`, 'iu')

/**
 * The hour on the 24-hour clock: "8h tối" 20:00, "11h đêm" 23:00, "1h trưa" 13:00. "12h đêm" is midnight and "2h đêm" 02:00, which no day window
 * holds, so they give none. A part of the day that is only maybe one gives none when it would change the hour ("ve truoc 10h toi khach san"),
 * since either reading could be the wrong one; "toi ve truoc 20h" is 20:00 either way.
 */
function clockOf(found: RegExpMatchArray | null, earliest: number, latest: number): string | null {
  const parts: Partial<Record<string, string>> | undefined = found?.groups
  if (!parts) return null
  const given = Number(parts.hour)
  const later = (from: number, to: number) => (given >= from && given <= to ? given + 12 : given)
  const on = (period: string) => (period === 'chieu' || period === 'pm' ? later(1, 11) : period === 'toi' ? later(1, 12) : period === 'dem' || period === 'khuya' ? later(6, 12) : period === 'trua' ? later(1, 4) : period === 'am' && given === 12 ? 0 : given)
  const sure = parts.after ?? parts.before
  const maybe = parts.maybeAfter ?? parts.maybeBefore
  if (!sure && maybe && on(normalize(maybe)) !== given) return null
  const hour = on(normalize(sure ?? ''))
  // "2h rưỡi" is half past
  const minute = parts.half ? 30 : Number(parts.minute ?? 0)
  return hour >= earliest && hour <= latest && minute < 60 ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : null
}

/**
 * The start and end hours an edit's words name, within the hours a day can start (5-20) and end (10-23). Given the minute the day starts at,
 * an end at or before it that the words put in the small hours ("về lúc 2h sáng", "3h đêm", "12h khuya", `endsNextDay`) is the next day's,
 * read as its clock (00:00-05:59).
 */
const startOf = (text: string) => clockOf(text.match(START_AT), 5, 20)
const endOf = (text: string, dayStart?: number) => clockOf(text.match(END_AT), 10, 23) ?? (dayStart === undefined ? null : nextDayEndOf(text, dayStart))
function nextDayEndOf(text: string, dayStart: number): string | null {
  const found = text.match(END_AT)
  // "12h đêm", "12h khuya" are midnight
  const clock = clockOf(found, 0, 5) ?? (clockOf(found, 24, 24) && '00:00')
  return clock && hm(clock) <= dayStart && endsNextDay(text, hm(clock)) ? clock : null
}

/** The edit with the hours its words name where the model read none, and without the words of them the model kept as a wish. `dayStart` is the trip's. */
function withHours(e: Extraction, text: string, dayStart?: number): Extraction {
  const start = e.available_start ?? startOf(text)
  const end = e.available_end ?? endOf(text, dayStart === undefined ? undefined : start ? hm(start) : dayStart)
  if (start === e.available_start && end === e.available_end) return e
  return { ...strip(strip(e, START_AT, ['other']), END_AT, ['other']), available_start: start, available_end: end }
}

/** The edit as the model reads it; a swap of a kind of place it reads nothing from is asked again as the refusal and the wish it is. */
async function readEdit(text: string, city: CityId) {
  const first = await extractConstraints(text)
  const swap = swapOf(text, city)
  if (!swap || readSomething(first.extraction, intentFromExtraction(first, city))) return first
  const [vietnamese, from, to] = swap
  return extractConstraints(vietnamese ? `không đi ${from}, thêm ${to}` : `no ${from}, add ${to}`)
}

/**
 * "Automatic modify" (report §2.2.2): the backend model reads the extra request, it is laid over what the model understood of the
 * original request, and the places are retrieved again from the backend for the combined wish, so only what the edit touches changes.
 * The result is returned as a proposal; nothing is saved until the traveler accepts.
 */
/**
 * `options` are what the traveler set by hand, which win over what the text names: stops per day, the day's hours in minutes (an end past
 * midnight above 1440), and the dates: a new first day moves the trip, a new length makes it longer or shorter.
 */
export async function adjustItinerary(trip: Trip, extraText: string, profile: Profile, options: { stopsPerDay?: number; dayStart?: number; dayEnd?: number; startDate?: string; days?: number } = {}) {
  if (!llmEnabled) throw new ApiError('not-configured', 'VITE_API_URL is not set')
  // Composed the way the rules below are written, whatever the keyboard sent
  const said = extraText.normalize('NFC').trim()
  const fewer = fewerOf(said, trip.city)
  const dayChange = dayChangeOf(said)
  // A day off a one-day trip, or one more on the longest, would hand back the same trip: say so before asking the model anything
  const days = dayChange ? Math.min(MAX_TRIP_DAYS, Math.max(1, trip.days.length + dayChange)) : trip.days.length
  if (dayChange && days === trip.days.length) throw dayChange < 0 ? new ApiError('day-limit-min', 'A one-day trip has no day to take off') : new ApiError('day-limit-max', `Trips are at most ${MAX_TRIP_DAYS} days long`)
  // With nothing written, or only "less of" a kind of place (and a change of length or hours, read above), there is nothing for the model to read;
  // the stops-per-day choice alone can still be the edit
  const read = said && !fewer.length ? await readEdit(said, trip.city) : { extraction: BLANK_EXTRACTION }
  const edit = { ...read, extraction: withHours(dayChange ? withoutDayChange(read.extraction) : read.extraction, said, options.dayStart ?? trip.dayStart) }
  const extra = intentFromExtraction(edit, trip.city)
  const e = edit.extraction
  // A kind of place the edit would like ("thêm chợ đêm", filed as a preferred place) is looked for like a wish, so the plan makes room for one.
  // The broad interest added beside a wish ("culture" for "thêm chùa") is left out when the wish names something narrower: the edit adds
  // what was named, not the best of the whole category as well
  // A real place's name ("Chùa Một Cột") stays a preference: looking it up as a wish would bring in look-alikes
  const kinds = e.preferred_places.filter((value) => placeKind(value, trip.city).length > 0)
  const looked = inCity(forRetrieval({ ...e, interests: [...e.interests, ...kinds] }), trip.city)
  const named = looked.interests.filter((value) => e.interests.includes(value) || !COMPANION_INTERESTS.has(value))
  const asked = { ...looked, interests: named.length ? named : looked.interests }
  // A setting changed by hand (stops per day, the day's hours, the dates) is an edit on its own
  const bySetting = options.stopsPerDay !== undefined || options.dayStart !== undefined || options.dayEnd !== undefined || options.startDate !== undefined || options.days !== undefined
  // Nothing usable in the edit (a pace or a number the model has no field for, or words it could not place): say so instead of handing back the same plan
  if (!bySetting && !extra.startDate && !fewer.length && !dayChange && !readSomething(e, extra)) throw new ApiError('needs-clarification', 'The edit was too vague to apply')
  const length = Math.min(MAX_TRIP_DAYS, Math.max(1, options.days ?? (dayChange ? days : (extra.days ?? trip.days.length))))
  const startDate = options.startDate ?? extra.startDate ?? trip.startDate
  // Hours the edit names are laid over the trip's own, so "start at 22:00" on a day ending at 21:00 would leave no day to plan. An end the
  // words put at or before the start is the next morning only when they say so ("về lúc 2h sáng", "tới 3h sáng hôm sau")
  const dayStart = options.dayStart ?? (e.available_start ? hm(e.available_start) : trip.dayStart)
  const saidEnd = e.available_end ? hm(e.available_end) : undefined
  const dayEnd = options.dayEnd ?? (saidEnd !== undefined && saidEnd <= dayStart && endsNextDay(said, saidEnd) ? saidEnd + DAY_MINUTES : saidEnd) ?? trip.dayEnd
  // and a day past midnight keeps its limits: by 05:00 the next morning, 20 h long at most, 18 h on a longer trip
  const problem = dayWindowProblem(dayStart, dayEnd, length)
  if (problem) throw dayWindowError(problem, length)
  // Trips saved before the extraction was kept are read again from their original wording; a trip made blank has none to read
  const base = trip.extraction ?? (trip.request.trim() ? (await extractConstraints(trip.request)).extraction : { ...BLANK_EXTRACTION, destination: cityById[trip.city].destination })
  // Dates picked by hand are the trip's from now on, as the form's are on a new one
  const dated = (x: Extraction): Extraction => (options.startDate || options.days ? { ...x, start_date: startDate, end_date: addDays(startDate, length - 1), duration_days: length } : x)
  const intent = intentFromExtraction({ ...edit, extraction: dated(mergeExtraction(base, edit.extraction)) }, trip.city, dayEnd > DAY_MINUTES)
  // A trip stays in its city: another destination is a new trip
  if (intent.unsupportedDestination || intent.city !== trip.city) throw new ApiError('unsupported-destination', `No places for ${intent.unsupportedDestination ?? intent.city}`)
  // What the edit asks to add makes room in the plan: the best places for each thing it names, one a day at most
  const wanted = asked.interests.length > 0 ? takePlaces(await retrievePlaces(asked, { limit: PLAN_SECTION_LIMIT })).sections : []
  const locked = trip.days.flatMap((day) => day.stops.filter((stop) => stop.locked).map((stop) => stop.poiId))
  const inTrip = new Set(trip.days.flatMap((day) => day.stops.map((stop) => stop.poiId)))
  const input: PlanInput = {
    userId: trip.userId,
    request: `${trip.request} ${extraText}`.trim(),
    city: trip.city,
    days: length,
    startDate,
    budget: extra.budget ?? trip.budget,
    dayStart,
    dayEnd,
    pace: extra.pace ?? trip.pace,
    transport: extra.transport ?? trip.transport ?? profile.transport,
    interests: { ...profile.interests, ...intent.interests },
    keywords: intent.keywords,
    avoidTags: [...new Set([...dietAvoids(profile.dietary), ...intent.avoidTags])],
    mustInclude: [...new Set([...intent.mustInclude, ...locked])],
    rainy: (options.startDate ?? extra.startDate) ? isRainy(weatherFor(trip.city, startDate)) : trip.rainy,
    stopsPerDay: options.stopsPerDay ?? trip.stopsPerDay,
    previous: trip.days,
    previousCap: stopsCap(trip),
    previousBudget: trip.budget,
    // "thêm chùa" on a trip that has the best ones already adds the next ones, not the same places again
    prefer: wanted.flatMap((ids) => ids.filter((id) => !inTrip.has(id)).slice(0, trip.days.length)),
    nightsPerDay: intent.nightsPerDay ?? trip.nightsPerDay,
    fewer,
  }
  const { trip: planned, found, unplaced } = await planFromBackend(input, intent)
  const has = (id: string) => planned.days.some((day) => day.stops.some((stop) => stop.poiId === id))
  if (!locked.every(has)) throw new ApiError('locked-no-fit', 'A locked place no longer fits')
  // What the edit named but could not be done is shown beside the proposal
  const extraNote = [...found.notFound, ...unplaced.map((id) => poiById[id].name)]
  const note = extraNote.length ? { extraNote } : {}
  // An edit that only names places, none of which could be added, changes nothing
  const others = { ...e, must_visit: [], preferred_places: [], destination: null }
  const namesOnly = !bySetting && !extra.startDate && !fewer.length && !dayChange && !readSomething(others, intentFromExtraction({ extraction: others }, trip.city))
  if (namesOnly && ![...found.pinned.map((poi) => poi.id), ...(input.prefer ?? [])].some((id) => has(id) && !inTrip.has(id))) return { ...trip, ...note }
  // The same places on the same days at the same hours: the trip keeps its order, times and backend notes instead of being re-solved
  const samePlaces = planned.days.length === trip.days.length && planned.days.every((day, index) => day.stops.length === trip.days[index].stops.length && day.stops.every((stop) => trip.days[index].stops.some((had) => had.poiId === stop.poiId)))
  const unchanged = samePlaces && planned.startDate === trip.startDate && planned.dayStart === trip.dayStart && planned.dayEnd === trip.dayEnd && planned.transport === trip.transport
  const next = unchanged ? { ...planned, days: trip.days, routing: trip.routing } : planned
  return { ...next, id: trip.id, title: trip.title, autoTitle: trip.autoTitle, status: trip.status, createdAt: trip.createdAt, version: trip.version, ...note }
}
