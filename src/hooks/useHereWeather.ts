import { useEffect } from 'react'
import { loadHereForecast } from '../api/weather'
import { locationBlocker, requestLocation, useLocationPermission } from './useLivePosition'

const ASKED_KEY = 'journie-here-asked'
/** The last position read, rounded to about 1 km (what the forecast is asked for anyway), so the sky is right from the first frame. */
const LAST_KEY = 'journie-here-last'
const REFRESH_MS = 30 * 60_000

const asked = () => {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return false
  }
}
const markAsked = () => {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    // Storage blocked: the prompt may come back on the next visit
  }
}
const lastPosition = (): { lat: number; lng: number } | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as { lat?: unknown; lng?: unknown } | null
    return saved && typeof saved.lat === 'number' && typeof saved.lng === 'number' ? { lat: saved.lat, lng: saved.lng } : null
  } catch {
    return null
  }
}
const keepPosition = (lat: number, lng: number) => {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ lat: Number(lat.toFixed(2)), lng: Number(lng.toFixed(2)) }))
  } catch {
    // Storage blocked: the next visit waits for a fresh reading
  }
}

/** Reads the position now (the browser may ask), keeps it and loads its weather; false when there is no reading. */
export async function readHereWeather(): Promise<boolean> {
  markAsked()
  const fix = await requestLocation(false)
  if (typeof fix === 'string') return false
  keepPosition(fix.lat, fix.lng)
  void loadHereForecast(fix.lat, fix.lng)
  return true
}

/**
 * The weather where the traveler is. The last known position gives a forecast at once; the position is then read again
 * quietly every half hour while it is allowed. With `ask`, a traveler never asked before gets the browser's prompt once;
 * without it (the sign-in pages) nothing is asked. Denied, dismissed or unavailable with no known position: the weather is
 * unknown, never another city's.
 */
export function useHereWeather({ ask = true }: { ask?: boolean } = {}) {
  const permission = useLocationPermission()

  useEffect(() => {
    const last = lastPosition()
    if (last) void loadHereForecast(last.lat, last.lng)
  }, [])

  useEffect(() => {
    if (locationBlocker() || permission === 'denied') return
    // Wait for the browser to say whether location is already allowed, where it can tell
    if (permission === 'unknown' && 'permissions' in navigator) return
    // A traveler who dismissed the prompt is not asked again on every visit, and the sign-in pages never ask
    if (permission !== 'granted' && (!ask || asked())) return
    let stopped = false
    const read = () => {
      if (!stopped) void readHereWeather()
    }
    read()
    const timer = permission === 'granted' ? window.setInterval(read, REFRESH_MS) : undefined
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [ask, permission])
}
