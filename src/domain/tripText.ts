import { TRIP_NAMES, type NameArea, type NameTheme, type NameWhen, type TripName } from '../content/tripNames'
import type { Language } from '../types/i18n'
import { hashString } from './conditions'
import { plain } from './placeText'
import { cityById, poiById } from './pois'
import type { CityId, Day, Pace, Poi, Trip } from './types'

const PACE_WORD: Record<Pace, [vi: string, en: string]> = { slow: ['chậm rãi', 'relaxed'], balanced: ['trọn vẹn', 'full'], fast: ['khám phá', 'explorer'] }

/** The pre-2026 automatic title (city, pace, length); the last fallback when the name bank has nothing for a city. */
export function autoTripTitle(city: CityId, pace: Pace, days: number, language: Language): string {
  const vi = language === 'vi'
  return `${vi ? cityById[city].name : cityById[city].nameEn} ${PACE_WORD[pace][vi ? 0 : 1]} · ${days} ${vi ? 'ngày' : days > 1 ? 'days' : 'day'}`
}

const fold = (text: string) => plain(text).toLowerCase().trim()

// Boxes around the Old Quarter with Hoan Kiem Lake and around West Lake: addresses outside Saigon carry no district.
const BOXES: Partial<Record<NameArea, [latMin: number, latMax: number, lngMin: number, lngMax: number]>> = {
  'pho-co': [21.024, 21.04, 105.843, 105.858],
  'tay-ho': [21.045, 21.085, 105.805, 105.84],
  'cho-lon': [10.745, 10.762, 106.645, 106.672],
}
const DISH: Record<NonNullable<NameWhen['dish']>, RegExp> = { pho: /\bpho\b/, 'mi-quang': /\bmi quang\b/, seafood: /\b(hai san|seafood|oc)\b/ }

function inArea(poi: Poi, area: NameArea): boolean {
  if (area === 'cho-lon' && fold(poi.area).includes('cho lon')) return true
  const box = BOXES[area]
  return !!box && poi.lat >= box[0] && poi.lat <= box[1] && poi.lng >= box[2] && poi.lng <= box[3]
}

type Shape = Pick<Trip, 'id' | 'city' | 'startDate' | 'days' | 'pace' | 'rainy'>

const poisOf = (days: Day[]) => days.flatMap((day) => day.stops.map((stop) => poiById[stop.poiId]).filter(Boolean))

/** What the plan is mostly about, from the kinds of its stops (spec section 3.1). */
export function tripTheme(trip: Pick<Trip, 'days' | 'pace' | 'rainy'>): NameTheme {
  const pois = poisOf(trip.days)
  if (pois.length === 0) return trip.pace === 'slow' ? 'slow' : 'mixed'
  const share = (test: (poi: Poi) => boolean) => pois.filter(test).length / pois.length
  const barNights = trip.days.filter((day) => day.stops.some((stop) => poiById[stop.poiId]?.evening)).length
  if (barNights > 0 && barNights >= Math.ceil(trip.days.length / 2)) return 'night'
  if (trip.rainy && share((poi) => poi.indoor) >= 0.6) return 'rain'
  if (share((poi) => poi.cat === 'food') > 0.5) return 'food'
  if (share((poi) => poi.cat === 'cafe') >= 0.3) return 'cafe'
  if (share((poi) => poi.cat === 'culture') >= 0.3) return 'history'
  if (share((poi) => poi.cat === 'market') >= 0.3) return 'market'
  if (share((poi) => poi.cat === 'nature') >= 0.3) return 'green'
  return trip.pace === 'slow' ? 'slow' : 'mixed'
}

function fits(when: NameWhen | undefined, trip: Shape, pois: Poi[]): boolean {
  if (!when) return true
  const start = new Date(`${trip.startDate}T00:00:00`)
  if (when.months && !when.months.includes(start.getMonth() + 1)) return false
  if (when.weekend && ![0, 6].includes(start.getDay())) return false
  if (when.rain && !trip.rainy) return false
  if (when.bar && !pois.some((poi) => poi.evening)) return false
  if (when.area && pois.filter((poi) => inArea(poi, when.area!)).length < 2) return false
  if (when.dish && !pois.some((poi) => DISH[when.dish!].test(fold(poi.name)))) return false
  return true
}

/**
 * The name a new trip gets, chosen once and stored in `title` (spec: fixed from creation). It skips names the traveler
 * already uses, and among equally good ones the trip id decides, so the same plan always gets the same name.
 */
export function nameTrip(trip: Shape, taken: string[] = []): string {
  const pois = poisOf(trip.days)
  const theme = tripTheme(trip)
  const inCity = TRIP_NAMES.filter((name) => name.city === trip.city && fits(name.when, trip, pois))
  // Stay on the trip's theme even when its lines are all taken (the list then adds a date); general lines only for a theme with none.
  const own = inCity.filter((name) => name.theme === theme)
  const list = own.length ? own : inCity.filter((name) => name.theme === 'mixed')
  if (!list.length) return autoTripTitle(trip.city, trip.pace, trip.days.length, 'vi')
  const fresh = list.filter((name) => !isTaken(name, taken))
  const pool = fresh.length ? fresh : list
  // A line that matches an area, a season or a dish beats a general one; the trip id picks among equals.
  const specific = pool.filter((name) => name.when)
  const best = specific.length ? specific : pool
  return best[hashString(trip.id) % best.length].vi
}

/** `taken` holds titles as stored or as shown ("Chào Sài Gòn · 2 ngày"), so a name counts as used when one starts with it. */
function isTaken(name: TripName, taken: string[]): boolean {
  const vi = fold(name.vi)
  const en = fold(name.en)
  return taken.some((title) => {
    const t = fold(title)
    return t.startsWith(vi) || t.startsWith(en)
  })
}

/**
 * Three names to offer when the traveler names a trip themselves (a blank trip has no stops yet, so only the city and
 * the date count): one general line, then two from different themes so the choice is a real one.
 */
export function nameIdeas(trip: Shape, language: Language, taken: string[] = []): string[] {
  const pois = poisOf(trip.days)
  const open = TRIP_NAMES.filter((name) => name.city === trip.city && fits(name.when, trip, pois) && !isTaken(name, taken))
  const general = open.filter((name) => name.theme === 'mixed')
  const themed = open.filter((name) => name.theme !== 'mixed')
  const turn = themed.length ? hashString(`${trip.city}${trip.startDate}`) % themed.length : 0
  const rotated = [...themed.slice(turn), ...themed.slice(0, turn)]
  const picked: TripName[] = []
  for (const name of [...general.slice(0, 1), ...rotated, ...general.slice(1)]) {
    if (picked.length === 3) break
    if (!picked.some((other) => other.vi === name.vi || other.theme === name.theme)) picked.push(name)
  }
  return picked.map((name) => (language === 'vi' ? name.vi : name.en))
}

const byVi = new Map(TRIP_NAMES.map((name) => [fold(name.vi), name]))

type Titled = Pick<Trip, 'id' | 'title' | 'autoTitle' | 'city' | 'pace' | 'days' | 'startDate'> & { createdAt?: string }

/** The name and the length suffix, apart, so a tie-breaker can go between them. */
function parts(trip: Titled, language: Language): [head: string, tail: string] {
  const vi = language === 'vi'
  const n = trip.days.length
  const tail = ` · ${n} ${vi ? 'ngày' : n > 1 ? 'days' : 'day'}`
  if (!trip.autoTitle) return [trip.title, '']
  const name = byVi.get(fold(trip.title))
  if (name) return [vi ? name.vi : name.en, tail]
  // Auto titles from before the name bank: a general line of the city, fixed by the trip id so it never moves.
  const general = TRIP_NAMES.filter((entry) => entry.city === trip.city && entry.theme === 'mixed' && !entry.when)
  if (!general.length) return [autoTripTitle(trip.city, trip.pace, n, language), '']
  const pick = general[hashString(trip.id) % general.length]
  return [vi ? pick.vi : pick.en, tail]
}

/**
 * A title the traveler wrote is shown as it is; one Journie chose follows the interface language. Pass the traveler's
 * other trips to tell apart two that would read the same: "(tháng 12)", then "(5/12)", then "(5/12, lần 2)".
 */
export function tripTitle(trip: Titled, language: Language, siblings?: Titled[]): string {
  const [head, tail] = parts(trip, language)
  const plainTitle = head + tail
  if (!siblings?.length) return plainTitle
  const same = [trip, ...siblings.filter((other) => other.id !== trip.id && fold(parts(other, language).join('')) === fold(plainTitle))]
  if (same.length < 2) return plainTitle
  const vi = language === 'vi'
  const locale = vi ? 'vi-VN' : 'en-GB'
  const month = (iso: string) => iso.slice(0, 7)
  const date = new Date(`${trip.startDate}T00:00:00`)
  if (same.filter((other) => month(other.startDate) === month(trip.startDate)).length === 1) {
    return `${head} (${vi ? `tháng ${date.getMonth() + 1}` : date.toLocaleDateString(locale, { month: 'long' })})${tail}`
  }
  const day = vi ? `${date.getDate()}/${date.getMonth() + 1}` : date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const sameDay = same
    .filter((other) => other.startDate === trip.startDate)
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id))
  // Same start date too: the date stays (so it differs from other dates' first trip) and later ones are counted.
  const k = sameDay.findIndex((other) => other.id === trip.id) + 1
  return `${head} (${day}${k > 1 ? `, ${vi ? 'lần' : 'no.'} ${k}` : ''})${tail}`
}
