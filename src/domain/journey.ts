import { cityById, poiById } from './pois'
import type { CityId, Trip } from './types'

/**
 * A journey through several cities (spec docs/specs/merge-collections-multi-city.md, way B): ordinary one-city trips on consecutive
 * dates that share a `journeyId`. Each leg is planned, edited and opened like any trip; the journey only gathers them for viewing.
 */

/** One leg as the plan form holds it: a city and how many days are spent there. */
export type Leg = { city: CityId; days: number }

/** A journey's days in all; each leg also keeps to the one-trip limit (`MAX_TRIP_DAYS`). */
export const MAX_JOURNEY_DAYS = 14

/** About this many picked places fill one day of a leg when a merge of collections suggests the days. */
const PLACES_PER_DAY = 5

export type Journey = { id: string; legs: Trip[] }

/** The legs of each journey among `trips`, in travel order. Trips of their own are not in the result. */
export function journeysOf(trips: Trip[]): Journey[] {
  const byId = new Map<string, Trip[]>()
  for (const trip of trips) if (trip.journeyId) byId.set(trip.journeyId, [...(byId.get(trip.journeyId) ?? []), trip])
  return [...byId].map(([id, legs]) => ({ id, legs: legs.sort((a, b) => (a.journeyOrder ?? 0) - (b.journeyOrder ?? 0) || a.startDate.localeCompare(b.startDate)) }))
}

/** "Hà Nội → Huế → Đà Nẵng": the cities in travel order, one city named once even if the journey comes back to it right after. */
export function journeyRoute(legs: Pick<Trip, 'city'>[], language: 'vi' | 'en'): string {
  const names = legs.map((leg) => (language === 'vi' ? cityById[leg.city].name : cityById[leg.city].nameEn))
  return names.filter((name, i) => name !== names[i - 1]).join(' → ')
}

/**
 * The cities of these places in the order they first appear (the collections' own order), with how many places each has; places
 * this browser has not loaded are left out, as their city is not known.
 */
export function citiesOf(poiIds: string[]): { city: CityId; places: number }[] {
  const counts = new Map<CityId, number>()
  for (const id of poiIds) {
    const city = poiById[id]?.city
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1)
  }
  return [...counts].map(([city, places]) => ({ city, places }))
}

/**
 * The legs a merge of collections suggests: one per city in order, about one day for every five places and at least one, trimmed
 * from the end so the journey stays within `MAX_JOURNEY_DAYS` (every leg keeps a day).
 */
export function suggestLegs(poiIds: string[]): Leg[] {
  const legs = citiesOf(poiIds).map(({ city, places }) => ({ city, days: Math.max(1, Math.round(places / PLACES_PER_DAY)) }))
  let total = legs.reduce((sum, leg) => sum + leg.days, 0)
  for (let i = legs.length - 1; i >= 0 && total > MAX_JOURNEY_DAYS; i--) {
    const cut = Math.min(legs[i].days - 1, total - MAX_JOURNEY_DAYS)
    legs[i] = { ...legs[i], days: legs[i].days - cut }
    total -= cut
  }
  return legs.slice(0, MAX_JOURNEY_DAYS)
}

/** The places merged from several collections: each once, in the order of the collections and of each collection's own list. */
export function mergedPlaces(lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}
