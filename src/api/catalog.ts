import { BLANK_EXTRACTION, type Extraction } from '../domain/extraction'
import { poiFromCard } from '../domain/poiFromCard'
import { cityById, poiById, poisByCity, registerPois } from '../domain/pois'
import type { PoiCard, RetrievalRequest, RetrievalResponse } from '../domain/retrieval'
import type { CityId, Poi } from '../domain/types'
import { CRUD_TIMEOUT_MS, postJson, remoteOr, requestJson } from './http'

/** The backend caps a page at 20 items per section. */
export const PAGE_SIZE = 20

/**
 * The standard interests the backend maps to taxonomy nodes (journie-be `interest_map.v2.yaml`). Asking for all of them
 * returns every place the backend knows, each in the section that fits it best.
 */
const CATALOG_INTERESTS = ['food', 'cafe', 'museum', 'park', 'nature', 'shopping', 'culture', 'nightlife']

/** The extraction asked of the backend for `city`: its destination fills in when the request named none. */
export const inCity = (extraction: Extraction, city: CityId): Extraction => ({ ...extraction, destination: extraction.destination ?? cityById[city].destination })

/** `POST /retrieval`: the places that fit an extraction, grouped by interest. */
export function retrievePlaces(extraction: Extraction, options: Omit<RetrievalRequest, 'extraction'> = {}): Promise<RetrievalResponse> {
  return postJson<RetrievalResponse>('/retrieval', { extraction, limit: PAGE_SIZE, ...options })
}

export type FoundPlaces = {
  pinned: Poi[]
  /** Every place of every section, once each, in the backend's order. */
  candidates: Poi[]
  /**
   * How well the backend found each place to fit the request, in 0..1: half its score, half its score against the best of its own
   * section, so each interest's best places compete evenly (a cheap-to-find park is not buried under well-reviewed restaurants).
   * 1 for a pinned place.
   */
  fit: Map<string, number>
  /** The place ids of each interest section, best first, so the planner can give every interest its turn. */
  sections: string[][]
  /** Must-visit names that could not be pinned to a single place. */
  notFound: string[]
  warnings: string[]
}

/** The backend's own cards, kept by id: `POST /routing` takes the cards it returned, not the planner's converted places. */
const cardById = new Map<string, PoiCard>()
export const cardOf = (id: string): PoiCard | undefined => cardById.get(id)

const toPois = (cards: PoiCard[]) => {
  for (const card of cards) cardById.set(card.id, card)
  return cards.map(poiFromCard).filter((poi): poi is Poi => poi !== null)
}

/**
 * Converts a response into planner places and adds them to the shared list, so every page can show them. With `city`, only that
 * city's places are returned to plan with.
 */
export function takePlaces(response: RetrievalResponse, city?: CityId): FoundPlaces {
  const here = (poi: Poi) => !city || poi.city === city
  const allPinned = toPois(response.pinned)
  const all = [...new Map([...allPinned, ...response.sections.flatMap((section) => toPois(section.items))].map((poi) => [poi.id, poi])).values()]
  registerPois(all)
  const pinned = allPinned.filter(here)
  const candidates = all.filter(here)
  const kept = new Set(candidates.map((poi) => poi.id))
  const fit = new Map<string, number>()
  for (const section of response.sections) {
    const best = Math.max(0, ...section.items.map((card) => card.score))
    for (const card of section.items) fit.set(card.id, Math.max(fit.get(card.id) ?? 0, best > 0 ? 0.5 * card.score + 0.5 * (card.score / best) : card.score))
  }
  for (const poi of pinned) fit.set(poi.id, 1)
  const sections = response.sections.map((section) => section.items.map((card) => card.id).filter((id) => kept.has(id)))
  // A must-visit name the backend could not pin to one place is not planned (it never swaps in a lookalike), whether it matched nothing or several places.
  const unresolved = [...response.not_found, ...response.disambiguation].filter((miss) => miss.field === 'must_visit').map((miss) => miss.query)
  return { pinned, candidates, fit, sections, notFound: [...new Set(unresolved)], warnings: response.warnings }
}

/**
 * Loads every place the backend has for `city`, a page at a time, into the shared list. Returns how many places of that city are
 * known afterwards; 0 means the city has no data yet (the backend answers `unsupported_destination` for a city it does not cover).
 */
export async function loadCatalog(city: CityId = 'sai-gon'): Promise<number> {
  const blank: Extraction = { ...BLANK_EXTRACTION, destination: cityById[city].destination, interests: CATALOG_INTERESTS }
  const first = await retrievePlaces(blank)
  if (first.status !== 'ok') return poisByCity(city).length
  takePlaces(first)
  for (const section of first.sections) {
    for (let offset = PAGE_SIZE; offset < section.total_matches; offset += PAGE_SIZE) {
      takePlaces(await retrievePlaces(blank, { section: section.key, offset }))
    }
  }
  return poisByCity(city).length
}

/** `GET /pois?ids=` takes at most this many ids per call. */
const IDS_PER_CALL = 100

/**
 * Trips, share links and sets keep place ids only, and this browser may not have loaded those places (another device, a link's
 * recipient, a place outside the catalogue's sections). `GET /pois?ids=a,b,c` returns the cards of the ids it knows and skips the
 * rest; they join the shared list like any other. Never fails: a place still unknown afterwards shows as "not loaded".
 */
export async function loadPlaces(ids: Iterable<string>): Promise<void> {
  const missing = [...new Set(ids)].filter((id) => !poiById[id])
  if (!missing.length) return
  await remoteOr(
    'pois-by-id',
    async () => {
      for (let at = 0; at < missing.length; at += IDS_PER_CALL) {
        const query = missing.slice(at, at + IDS_PER_CALL).map(encodeURIComponent).join(',')
        registerPois(toPois((await requestJson<PoiCard[] | null>('GET', `/pois?ids=${query}`, undefined, CRUD_TIMEOUT_MS)) ?? []))
      }
    },
    () => undefined,
  ).catch(() => undefined)
}
