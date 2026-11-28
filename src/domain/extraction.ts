/**
 * The contract of the backend's `POST /chat` (journie-be `app/schemas/extraction.py`): a free-text travel
 * request in, validated constraints out. Field names are the wire format, so they stay snake_case.
 */

export type ConstraintField =
  | 'destination'
  | 'start_date'
  | 'end_date'
  | 'duration_days'
  | 'budget_vnd'
  | 'available_start'
  | 'available_end'
  | 'interests'
  | 'must_visit'
  | 'avoid'
  | 'preferred_places'
  | 'visit_duration_min'
  | 'other'

export type Constraint = {
  field: ConstraintField
  operator: 'eq' | 'min' | 'max' | 'include' | 'exclude' | 'prefer'
  value: string
}

export type MissingField = 'destination' | 'travel_dates_or_duration' | 'budget' | 'available_time'

export type Conflict = 'date_order' | 'time_order' | 'duration_disagreement' | 'budget_disagreement' | 'must_visit_avoid' | 'destination_disagreement'

export type Extraction = {
  destination: string | null
  start_date: string | null
  end_date: string | null
  duration_days: number | null
  budget_vnd: number | null
  budget_scope: 'total' | 'per_person' | null
  available_start: string | null
  available_end: string | null
  interests: string[]
  must_visit: string[]
  avoid: string[]
  preferred_places: string[]
  hard_constraints: Constraint[]
  soft_constraints: Constraint[]
  missing_fields: MissingField[]
  possible_conflicts: Conflict[]
  needs_clarification: boolean
}

export type ExtractionResponse = {
  extraction: Extraction
  /** Deterministic repairs the backend applied to the model output, in order. */
  repairs: string[]
  issues: { code: string; field: string; severity: 'error' | 'review'; detail: string }[]
  meta: {
    model: string
    prompt_version: string
    processing_version: string
    reference_date: string
    latency_ms: number
  }
}

/** An extraction that says nothing: the starting point when no text was read. */
export const BLANK_EXTRACTION: Extraction = {
  destination: null, start_date: null, end_date: null, duration_days: null, budget_vnd: null, budget_scope: null,
  available_start: null, available_end: null, interests: [], must_visit: [], avoid: [], preferred_places: [],
  hard_constraints: [], soft_constraints: [], missing_fields: [], possible_conflicts: [], needs_clarification: false,
}
