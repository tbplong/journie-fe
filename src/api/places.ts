import { categories } from '../domain/categories'
import { haversineKm } from '../domain/geo'
import { areaEn, nameEn } from '../domain/placeText'
import { normalize, pois } from '../domain/pois'
import type { CategoryId, CityId, Poi } from '../domain/types'

export type PriceTier = 'free' | 'low' | 'mid' | 'high'

export type SearchParams = {
  /** Only this city's places; all places when left out. */
  city?: CityId
  query: string
  categories: CategoryId[]
  prices: PriceTier[]
  indoorOnly: boolean
  openAt?: number
  sort: 'relevance' | 'quality' | 'price' | 'distance'
}

export type SearchHit = { poi: Poi; distanceKm?: number; anchor?: Poi; score: number }

export const tierOf = (cost: number): PriceTier => (cost === 0 ? 'free' : cost < 100_000 ? 'low' : cost < 300_000 ? 'mid' : 'high')

const LEVEL_TIER: Record<number, PriceTier> = { 1: 'low', 2: 'mid', 3: 'high', 4: 'high' }

/** A place has a price tier only when the data states a price or a price level; the category guess behind `cost` gives none. */
export const priceTierOf = (poi: Poi): PriceTier | undefined =>
  poi.costKnown ? tierOf(poi.cost) : poi.priceLevel ? LEVEL_TIER[poi.priceLevel] : undefined

const NEAR = /\b(gan|quanh|canh|near|around|nearby)\b\s*(.*)$/

/**
 * Keyword + contextual search (report §1.3.1) over the places the backend returned: "cà phê gần Chùa Cầu" splits
 * into the thing wanted and the place it should be near, then ranks by distance from that anchor.
 */
export function searchPois(params: SearchParams): SearchHit[] {
  const q = normalize(params.query).trim()
  const near = q.match(NEAR)
  const wanted = (near ? q.slice(0, near.index) : q).trim()
  const anchorText = near?.[2]?.trim()
  const scope = params.city ? pois.filter((poi) => poi.city === params.city) : pois
  const anchor = anchorText ? scope.find((poi) => normalize(poi.name).includes(anchorText) || normalize(poi.area).includes(anchorText)) : undefined
  const tokens = wanted.split(/\s+/).filter((token) => token.length > 1)

  const hits: SearchHit[] = []
  for (const poi of scope) {
    if (params.categories.length && !params.categories.includes(poi.cat)) continue
    if (params.prices.length) {
      const tier = priceTierOf(poi)
      if (!tier || !params.prices.includes(tier)) continue
    }
    if (params.indoorOnly && !poi.indoor) continue
    if (params.openAt !== undefined && !(poi.open <= params.openAt && params.openAt < poi.close)) continue

    const haystack = normalize(`${poi.name} ${nameEn(poi.name)} ${poi.area} ${areaEn(poi.area)} ${poi.address} ${poi.tags.join(' ')} ${categories[poi.cat].vi} ${categories[poi.cat].en}`)
    let score = poi.quality
    if (tokens.length) {
      // A one- or two-letter word ("ốc") starts a word of the place; anywhere in the text it would match "Ngọc", "Mộc", "Học"…
      const spaced = ` ${haystack}`
      const matched = tokens.filter((token) => (token.length < 3 ? spaced.includes(` ${token}`) : haystack.includes(token))).length
      if (!matched) continue
      score += matched * 2 + (normalize(poi.name).includes(wanted) ? 3 : 0)
    }
    let distanceKm: number | undefined
    if (anchor) {
      distanceKm = haversineKm(poi, anchor)
      if (poi.id === anchor.id || distanceKm > 4) continue
      score += 3 - distanceKm
    }
    hits.push({ poi, distanceKm, anchor, score })
  }

  const sorters: Record<SearchParams['sort'], (a: SearchHit, b: SearchHit) => number> = {
    relevance: (a, b) => b.score - a.score,
    quality: (a, b) => b.poi.quality - a.poi.quality,
    price: (a, b) => a.poi.cost - b.poi.cost,
    distance: (a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
  }
  return hits.sort(sorters[anchor && params.sort === 'relevance' ? 'distance' : params.sort])
}
