import type { CityId, Weather } from './types'

/** Deterministic hash so the same city and day always report the same weather. */
export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const RUSH_CITIES = new Set<CityId>(['sai-gon', 'ha-noi'])

/** One city's forecast as the weather API (`api/weather.ts`) gave it. */
export type CityForecast = {
  fetchedAt: number
  now: { code: number; tempC: number; rainMm: number }
  days: Record<string, { code: number; maxC: number; rainMm: number; rainChance: number | null }>
}

/** Where a forecast is for: one of the four cities, or `here`, the traveler's own position when they share it. */
export type ForecastPlace = CityId | 'here'

let forecasts: Partial<Record<ForecastPlace, CityForecast>> = {}
const listeners = new Set<() => void>()

export const forecastsSnapshot = () => forecasts
export const subscribeForecasts = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}
export const setForecasts = (next: Partial<Record<ForecastPlace, CityForecast>>) => {
  forecasts = { ...forecasts, ...next }
  listeners.forEach((listener) => listener())
}

/** No data (offline, or a date past the 16-day forecast): nothing is claimed, and the plan is not bent towards indoor places. */
const UNKNOWN: Weather = { known: false, condition: 'cloudy', tempC: null }
/** A reading older than this no longer says what the sky is doing now. */
const STALE_MS = 3 * 60 * 60_000

// WMO weather codes: 0-1 clear, 2-3 cloudy, 45-48 fog, 51-86 drizzle, rain or snow, 95-99 thunderstorm
const isStorm = (code: number) => code >= 95
const isWet = (code: number) => code >= 51 && code <= 86
const dryCondition = (code: number): Weather['condition'] => (code <= 1 ? 'sunny' : 'cloudy')

/**
 * Rain (mm) in the forecast's current 15 minutes from which the sky counts as raining, about 0.8 mm an hour. The model's
 * trace drizzle (0.1 mm, often under a half-clear sky) is not rain anyone notices, so it reads as cloudy.
 */
export const RAIN_NOW_MM = 0.2

/** The sky right now: rain or a storm only when enough rain is actually falling, not when a code alone suggests it. */
export function weatherNow(place: ForecastPlace, at = Date.now()): Weather {
  const forecast = forecasts[place]
  if (!forecast || at - forecast.fetchedAt > STALE_MS) return UNKNOWN
  const { code, tempC, rainMm } = forecast.now
  const falling = rainMm >= RAIN_NOW_MM
  const condition = falling && isStorm(code) ? 'storm' : falling && isWet(code) ? 'rain' : isStorm(code) || isWet(code) ? 'cloudy' : dryCondition(code)
  return { known: true, condition, tempC: Math.round(tempC) }
}

/** A whole day: rainy only with at least 1 mm expected and a 50% chance, so one passing shower does not mark the day wet. */
export function weatherFor(city: CityId, date: string): Weather {
  const day = forecasts[city]?.days[date]
  if (!day) return UNKNOWN
  const likely = day.rainMm >= 1 && (day.rainChance ?? 100) >= 50
  const condition = likely && isStorm(day.code) ? 'storm' : likely && isWet(day.code) ? 'rain' : dryCondition(day.code)
  return { known: true, condition, tempC: Math.round(day.maxC) }
}

export const isRainy = (weather: Weather) => weather.condition === 'rain' || weather.condition === 'storm'

/** Congestion multiplier by hour (1 = free flow); rush hours bite in big cities. */
export function congestionAt(city: CityId, minutes: number): number {
  const hour = minutes / 60
  const rush = (hour >= 7 && hour <= 9) || (hour >= 16.5 && hour <= 19)
  return rush && RUSH_CITIES.has(city) ? 1.5 : 1
}

