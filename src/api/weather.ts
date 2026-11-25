import { setForecasts, type CityForecast } from '../domain/conditions'
import { cities } from '../domain/pois'
import type { CityId } from '../domain/types'

/**
 * Open-Meteo: no key. Requests carry the fixed centres of the four cities and, when the traveler shares their location, their
 * position rounded to 2 decimals (about 1 km: enough for the weather, not their address). Free for non-commercial use, up to
 * 10,000 calls a day.
 */
const API = 'https://api.open-meteo.com/v1/forecast'
const FRESH_MS = 30 * 60_000
const RETRY_MS = 2 * 60_000
const TIMEOUT_MS = 8_000

type RawCity = {
  current?: { temperature_2m?: number | null; precipitation?: number | null; weather_code?: number | null }
  daily?: {
    time?: string[]
    weather_code?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    precipitation_sum?: (number | null)[]
    precipitation_probability_max?: (number | null)[]
  }
}

/** One city from the answer, or null when it does not have the shape asked for. */
function readCity(raw: RawCity, fetchedAt: number): CityForecast | null {
  const { current, daily } = raw
  if (typeof current?.weather_code !== 'number' || typeof current.temperature_2m !== 'number' || !Array.isArray(daily?.time)) return null
  const days: CityForecast['days'] = {}
  daily.time.forEach((date, i) => {
    const code = daily.weather_code?.[i]
    const maxC = daily.temperature_2m_max?.[i]
    if (typeof code === 'number' && typeof maxC === 'number') days[date] = { code, maxC, rainMm: daily.precipitation_sum?.[i] ?? 0, rainChance: daily.precipitation_probability_max?.[i] ?? null }
  })
  return { fetchedAt, now: { code: current.weather_code, tempC: current.temperature_2m, rainMm: current.precipitation ?? 0 }, days }
}

/** Forecasts for these points, in order; null entries where the answer lacks the shape asked for. */
async function fetchForecasts(points: { lat: number | string; lng: number | string }[], days: number): Promise<(CityForecast | null)[]> {
  const query = new URLSearchParams({
    latitude: points.map((point) => point.lat).join(','),
    longitude: points.map((point) => point.lng).join(','),
    current: 'temperature_2m,precipitation,weather_code',
    daily: 'weather_code,temperature_2m_max,precipitation_sum,precipitation_probability_max',
    forecast_days: String(days),
    timezone: 'Asia/Ho_Chi_Minh',
  })
  const response = await fetch(`${API}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`weather ${response.status}`)
  const body: unknown = await response.json()
  // One point comes back as an object, several as an array
  const list = Array.isArray(body) ? body : [body]
  if (list.length !== points.length) throw new Error('weather shape')
  const now = Date.now()
  return list.map((raw) => (raw && typeof raw === 'object' ? readCity(raw as RawCity, now) : null))
}

let nextAt = 0
let loading = false

/** Refreshes the forecast of every city at most once per half hour. A failed call keeps what is already known and tries again soon. */
export async function loadForecasts() {
  if (loading || Date.now() < nextAt) return
  loading = true
  try {
    const found = await fetchForecasts(cities, 16)
    const next: Partial<Record<CityId, CityForecast>> = {}
    cities.forEach((city, i) => {
      const forecast = found[i]
      if (forecast) next[city.id] = forecast
    })
    if (!Object.keys(next).length) throw new Error('weather empty')
    setForecasts(next)
    nextAt = Date.now() + FRESH_MS
  } catch {
    nextAt = Date.now() + RETRY_MS
  } finally {
    loading = false
  }
}

let hereAt = ''
let hereNextAt = 0
let loadingHere = false

/** The weather where the traveler is, at most once per half hour for the same place (rounded to about 1 km before it is sent). */
export async function loadHereForecast(lat: number, lng: number) {
  const point = { lat: lat.toFixed(2), lng: lng.toFixed(2) }
  const key = `${point.lat},${point.lng}`
  if (loadingHere || (key === hereAt && Date.now() < hereNextAt)) return
  loadingHere = true
  try {
    const [forecast] = await fetchForecasts([point], 1)
    if (!forecast) throw new Error('weather empty')
    setForecasts({ here: forecast })
    hereAt = key
    hereNextAt = Date.now() + FRESH_MS
  } catch {
    hereAt = key
    hereNextAt = Date.now() + RETRY_MS
  } finally {
    loadingHere = false
  }
}
