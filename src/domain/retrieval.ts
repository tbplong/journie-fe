import type { Extraction } from './extraction'

/** The contract of the backend's `POST /retrieval` (journie-be `app/schemas/retrieval.py`). Names are the wire format. */

export type PoiCard = {
  id: string
  name: string
  kind: string
  /** Taxonomy value `top.sub`, such as `food.cafe`. */
  category: string | null
  ward: string | null
  address: string | null
  /** The city as the data writes it ("Thành phố Hồ Chí Minh"). The backend does not send it yet, so the coordinates decide (`poiFromCard`). */
  city?: string | null
  lat: number | null
  lon: number | null
  score: number
  score_parts: Record<string, number>
  reasons: string[]
  /** `hours_maybe_closed`, `hours_low_confidence`, `hours_unknown`, `hours_contradicted`, `hours_closed`... */
  flags: string[]
  price_raw: string | null
  opening_hours_raw: string | null
  website: string | null
  phone: string | null
  /** Expected visit length in minutes, the number the backend times the stop with (the place's own value, its restaurant style or its category). Missing on local data and older backends. */
  visit_minutes?: number | null
}

export type RetrievalSection = {
  key: string
  label: string
  required: boolean
  total_matches: number
  items: PoiCard[]
  matched_keywords: string[]
  note: string | null
}

export type RetrievalResponse = {
  status: 'ok' | 'unsupported_destination' | 'empty_extraction'
  /** The traveler's must-visit places, resolved by name. */
  pinned: PoiCard[]
  disambiguation: { query: string; field: 'must_visit' | 'preferred_places' | 'avoid'; candidates: PoiCard[] }[]
  not_found: { query: string; field: 'must_visit' | 'preferred_places' | 'avoid' }[]
  sections: RetrievalSection[]
  warnings: string[]
  meta: { retrieval_version: string; data_version: string | null; latency_ms: number }
}

export type RetrievalRequest = {
  extraction: Extraction
  selected_ids?: string[]
  section?: string
  offset?: number
  limit?: number
  /** Orders equally relevant places; a new seed gives other suggestions for the same request. */
  seed?: number
}
