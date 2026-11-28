import { dailyWindow, parseOpeningHours, weekWindows } from './openingHours'
import { cityById, cityNamed, nearestCity } from './pois'
import { planningCost, priceLevelFrom, readPrice } from './price'
import type { PoiCard } from './retrieval'
import type { CategoryId, Poi } from './types'

/**
 * Turns a place the backend returned into the shape the planner works with. The data has no visit times, prices
 * or ratings, so those come from category priors or are left out; nothing is invented per place.
 */

/**
 * Typical stay in minutes per taxonomy category, used only when a card has no `visit_minutes` (local data, older
 * backends). A copy of the `categories` in journie-be `app/services/routing/config/visit_minutes.yaml`;
 * `tests/visit_minutes_match.py` checks the two agree.
 */
const VISIT_MIN: Record<string, number> = {
  'food.restaurant': 60,
  'food.street_food': 30,
  'food.food_court': 45,
  'food.cafe': 45,
  'attraction.museum': 90,
  'attraction.gallery': 60,
  'attraction.landmark': 45,
  'attraction.historic_site': 45,
  'attraction.viewpoint': 45,
  'attraction.zoo': 90,
  'attraction.theme_park': 90,
  'culture_religion.church': 30,
  'culture_religion.pagoda': 40,
  'culture_religion.temple': 40,
  'culture_religion.shrine': 30,
  'culture_religion.mosque': 30,
  'nature.park': 45,
  'nature.garden': 45,
  'shopping.mall': 90,
  'shopping.market': 60,
  'shopping.department_store': 60,
  'entertainment.nightlife': 90,
  'entertainment.karaoke': 120,
  'entertainment.cinema': 120,
  'entertainment.performing_arts': 120,
}
const DEFAULT_VISIT_MIN = 40

/** Typical spend per person in VND (journie-data `configs/cost.v1.yaml`, a prior with confidence 0.4). Only eating and drinking have one. */
const SPEND_VND: Record<string, number> = { 'food.cafe': 70_000, 'food.restaurant': 150_000, 'food.food_court': 100_000 }

/** Categories where a visit happens under a roof (matters when it rains). */
const INDOOR = new Set(['food.restaurant', 'food.cafe', 'food.food_court', 'attraction.museum', 'attraction.gallery', 'shopping.mall', 'shopping.department_store', 'entertainment.cinema', 'entertainment.performing_arts', 'entertainment.karaoke'])

/** Place tags (the vocabulary in `tags.ts`) implied by the category, so "avoid museums" and similar can act on them. */
const CATEGORY_TAGS: Record<string, string[]> = {
  'food.cafe': ['coffee'],
  'attraction.museum': ['museum'],
  'attraction.gallery': ['museum'],
  'nature.park': ['park'],
  'nature.garden': ['garden'],
  'shopping.market': ['market'],
  'culture_religion.temple': ['temple'],
  'culture_religion.pagoda': ['temple'],
  'culture_religion.shrine': ['temple'],
  'culture.place_of_worship': ['temple'],
  'culture_religion.church': ['church'],
}

/** Long, tiring visits (60 minutes or more in the backend's visit table), food and evening venues aside. */
const HEAVY = new Set(['attraction.museum', 'attraction.gallery', 'attraction.zoo', 'attraction.theme_park', 'shopping.mall', 'shopping.market', 'shopping.department_store'])

const DEFAULT_QUALITY = 0.5

/** A place whose every opening starts this late (a night market) is only an evening outing. */
const EVENING_OPENS = 16 * 60
const opensInEvening = (week: ReturnType<typeof parseOpeningHours>) =>
  !!week && [...week.values()].some((intervals) => intervals.length > 0) && [...week.values()].every((intervals) => intervals.every(([open]) => open >= EVENING_OPENS))

export function categoryOf(card: Pick<PoiCard, 'category' | 'kind'>): CategoryId {
  const c = card.category ?? ''
  if (c === 'food.cafe') return 'cafe'
  if (c.startsWith('food.')) return 'food'
  if (c === 'entertainment.nightlife' || c === 'entertainment.cinema') return 'nightlife'
  if (c.startsWith('nature.') || c === 'attraction.zoo') return 'nature'
  if (c.startsWith('shopping.')) return 'market'
  if (c.startsWith('attraction.') || c.startsWith('culture') || c.startsWith('entertainment.')) return 'culture'
  const byKind: Record<string, CategoryId> = { restaurant: 'food', cafe: 'cafe', museum: 'culture', attraction: 'culture', worship: 'culture', park: 'nature', market: 'market', mall: 'market' }
  return byKind[card.kind] ?? 'culture'
}


/** Null when the card has no coordinates, because a place that cannot be placed on the map cannot be routed. */
export function poiFromCard(card: PoiCard): Poi | null {
  if (card.lat == null || card.lon == null) return null
  const slug = card.category ?? ''
  const cat = categoryOf(card)
  const week = parseOpeningHours(card.opening_hours_raw)
  const window = dailyWindow(week)
  const stated = readPrice(card.price_raw)
  const level = priceLevelFrom(card.price_raw)
  const area = card.ward ?? ''
  const city = cityNamed(card.city) ?? nearestCity(card.lat, card.lon)
  return {
    id: card.id,
    city,
    name: card.name,
    cat,
    lat: card.lat,
    lng: card.lon,
    open: window?.open ?? 0,
    close: window?.close ?? 1440,
    closedDays: window?.closedDays ?? [],
    windows: weekWindows(week) ?? undefined,
    visit: card.visit_minutes ?? VISIT_MIN[slug] ?? DEFAULT_VISIT_MIN,
    // with no stated price the category prior keeps budgets usable but is never shown
    cost: stated ? planningCost(stated) : SPEND_VND[slug] ?? 0,
    costKnown: stated !== undefined,
    ...(stated && stated.max !== stated.min ? { costRange: stated } : {}),
    ...(level ? { priceLevel: level } : {}),
    ...(slug === 'entertainment.nightlife' || (cat !== 'food' && cat !== 'cafe' && opensInEvening(week)) ? { evening: true } : {}),
    quality: card.score_parts.quality ?? DEFAULT_QUALITY,
    indoor: INDOOR.has(slug),
    ...(HEAVY.has(slug) ? { heavy: true } : {}),
    tags: CATEGORY_TAGS[slug] ?? [],
    area,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.name} ${card.address ?? cityById[city].destination}`)}`,
    ...(card.website ? { website: card.website } : {}),
    address: card.address ?? '',
    phone: card.phone ?? '',
    hours: card.opening_hours_raw ?? '',
    flags: card.flags,
  }
}
