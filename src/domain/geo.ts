import type { City, TransportPref, TravelMode } from './types'

type LatLng = { lat: number; lng: number }

const EARTH_KM = 6371
const rad = (deg: number) => (deg * Math.PI) / 180

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

/** Straight-line distance is stretched to approximate road distance. */
const ROAD_FACTOR = 1.3

export type Leg = { km: number; min: number; cost: number; mode: TravelMode }

/**
 * Stand-in for the OSRM Table service: a travel-time estimate between two POIs, worked out as the backend does without OSRM
 * (walk below 1 km of road at 4.5 km/h, ride at the city's speed), so device legs and backend legs agree.
 * `congestion` (1 = free flow) stretches motor travel when the monitor reports traffic.
 */
export function travelLeg(a: LatLng, b: LatLng, pref: TransportPref, city: City, congestion = 1): Leg {
  const km = haversineKm(a, b) * ROAD_FACTOR
  const walkable = pref === 'walk' ? km <= 2.2 : km < 1
  const mode: TravelMode = walkable ? 'walk' : pref === 'taxi' ? 'taxi' : 'bike'

  if (mode === 'walk') {
    return { km, min: Math.max(1, Math.round((km / 4.5) * 60)), cost: 0, mode }
  }

  const speed = city.roadKmh * (mode === 'bike' ? 1 : 0.88)
  const min = Math.max(1, Math.round((km / speed) * 60 * congestion))
  return { km, min, cost: rideCost(km, mode), mode }
}

/** Fare of a ride-hailing trip of `km` (motorbike or car), rounded to 1.000 VND. */
export const rideCost = (km: number, mode: 'bike' | 'taxi') => Math.round((mode === 'bike' ? Math.max(12_000, km * 6_500) : 14_000 + km * 13_500) / 1000) * 1000

/** Equirectangular projection into a [0,1] box for hand-drawn maps. */
export function project(point: LatLng, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  return {
    x: (point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng),
    y: (bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat),
  }
}
