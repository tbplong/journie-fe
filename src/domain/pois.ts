import { haversineKm } from './geo'
import { parseOpeningHours, weekWindows } from './openingHours'
import type { City, CityId, Poi } from './types'

/**
 * The places the app knows about. They all come from the backend (`POST /retrieval`, see `api/catalog.ts`)
 * and are kept here, in memory and in localStorage, so saved trips can show their stops straight away
 * and every page reads the same list. `pois` and `poiById` are updated in place by `registerPois`.
 */
export const cities: City[] = [
  { id: 'sai-gon', name: 'Sài Gòn', nameEn: 'Saigon', destination: 'Ho Chi Minh City', aliases: ['sai gon', 'saigon', 'ho chi minh', 'hcm', 'hcmc', 'tphcm', 'tp.hcm'], lat: 10.7769, lng: 106.7009, roadKmh: 20, radiusKm: 9, tint: '#1d3a33', tagline: ['Thành phố không ngủ, phố xưa và tòa cao tầng chung một con đường', 'The city that never sleeps: old streets and towers on one road'] },
  { id: 'ha-noi', name: 'Hà Nội', nameEn: 'Hanoi', destination: 'Hanoi', aliases: ['ha noi', 'hanoi'], lat: 21.0285, lng: 105.8542, roadKmh: 18, radiusKm: 8, tint: '#3a221d', tagline: ['Phố cổ, hồ xanh và gánh hàng rong buổi sớm', 'Old quarter lanes, green lakes and street vendors at dawn'] },
  { id: 'da-nang', name: 'Đà Nẵng', nameEn: 'Da Nang', destination: 'Da Nang', aliases: ['da nang', 'danang'], lat: 16.0612, lng: 108.2275, roadKmh: 25, radiusKm: 8, tint: '#123845', tagline: ['Biển dài, núi Sơn Trà và những cây cầu trên sông Hàn', 'Long beaches, Son Tra mountain and the bridges over the Han River'] },
  { id: 'hue', name: 'Huế', nameEn: 'Hue', destination: 'Hue', aliases: ['hue'], lat: 16.4698, lng: 107.5786, roadKmh: 22, radiusKm: 6, tint: '#2e2340', tagline: ['Kinh thành cổ, lăng tẩm và dòng Hương lặng lẽ', 'The old citadel, royal tombs and the quiet Perfume River'] },
]

export const cityById = Object.fromEntries(cities.map((c) => [c.id, c])) as Record<CityId, City>

const STORE_KEY = 'journie-places-v1'

export const pois: Poi[] = []
export const poiById: Record<string, Poi> = {}

function remember() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(pois))
  } catch {
    /* storage full or blocked: places stay in memory for this session */
  }
}

/** Adds or replaces places (matched by id) and keeps a copy for the next visit. */
export function registerPois(list: Poi[]) {
  for (const poi of list) {
    const at = pois.findIndex((entry) => entry.id === poi.id)
    if (at >= 0) pois[at] = poi
    else pois.push(poi)
    poiById[poi.id] = poi
  }
  if (list.length) remember()
}

try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as Poi[]
  for (const poi of saved) {
    // Places saved before every opening interval was kept read them again from their hours text
    poi.windows ??= weekWindows(parseOpeningHours(poi.hours)) ?? undefined
    pois.push(poi)
    poiById[poi.id] = poi
  }
} catch {
  /* nothing saved yet, or storage is blocked */
}

export const poisByCity = (city: CityId) => pois.filter((poi) => poi.city === city)

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')

export { normalize }

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole words only: "thuê xe" (rent a bike) must not read as Huế
const CITY_PATTERNS = cities.map((city) => [city.id, new RegExp(`(?:^|[^a-z0-9])(?:${city.aliases.map(escape).join('|')})(?:$|[^a-z0-9])`)] as const)

/** The city a text names ("Thành phố Hà Nội", "Hanoi", "đi Huế"), if any. */
export function cityNamed(text: string | null | undefined): CityId | undefined {
  if (!text) return undefined
  const t = normalize(text)
  return CITY_PATTERNS.find(([, pattern]) => pattern.test(t))?.[0]
}

/** The city whose centre is closest to a point. The nearest two (Đà Nẵng and Huế) are some 80 km apart, so any place in a city falls to it. */
export function nearestCity(lat: number, lng: number): CityId {
  return cities.reduce((best, city) => (haversineKm({ lat, lng }, city) < haversineKm({ lat, lng }, best) ? city : best)).id
}
