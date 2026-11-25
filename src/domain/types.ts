import type { Extraction } from './extraction'
import type { PriceLevel, StatedPrice } from './price'

export type CategoryId =
  | 'culture'
  | 'food'
  | 'cafe'
  | 'nature'
  | 'beach'
  | 'market'
  | 'nightlife'
  | 'adventure'

/** The cities a traveler can pick; a city with no places in the backend shows a "data coming" state. */
export type CityId = 'sai-gon' | 'ha-noi' | 'da-nang' | 'hue'

export type Interests = Partial<Record<CategoryId, number>>

export type TravelMode = 'walk' | 'bike' | 'taxi'
export type TransportPref = 'walk' | 'bike' | 'taxi'
export type Pace = 'slow' | 'balanced' | 'fast'

/** A point of interest, built from a place the backend returned. Times are minutes after midnight, costs in VND. */
export type Poi = {
  id: string
  city: CityId
  name: string
  cat: CategoryId
  lat: number
  lng: number
  /** A summary window, open on every day the place is open (see `openingHours.ts`); for showing and filtering. */
  open: number
  close: number
  /** Weekdays (0 = Sunday ... 6 = Saturday) the place is closed. */
  closedDays: number[]
  /**
   * Every opening interval per weekday (index 0 = Sunday), sorted; an empty day is closed. What a visit is checked against once its
   * date is known (`windowsOn`). Missing when the hours are unknown, and then `open`/`close` (the whole day) apply.
   */
  windows?: [number, number][][]
  /** Typical stay in minutes; a prior per category because the data has no visit times. */
  visit: number
  /** VND per person. `costKnown` is false when it is a category prior or missing (0), not a stated price. */
  cost: number
  costKnown: boolean
  /** A bar, pub or club (`entertainment.nightlife`), or a place other than food that only opens from 16:00 (a night market): one evening out a day, not before the evening. Cinemas share the `nightlife` category but not this. */
  evening?: boolean
  /** The stated price when it is not one amount: a range, "under X" (min 0) or "from X" (no max); `cost` is then `planningCost`. */
  costRange?: StatedPrice
  /** A stated price level with no amount, 1 = inexpensive ... 4 = very expensive. */
  priceLevel?: PriceLevel
  /** 0..1 ranking quality from the backend (editorial tier, recommendations, Michelin). */
  quality: number
  indoor: boolean
  /** A long, tiring visit (museum, gallery, zoo, theme park, mall, market, department store): a day at each pace holds only a few. */
  heavy?: boolean
  tags: string[]
  area: string
  /** The place on Google Maps (a search by name and address). */
  url: string
  /** The place's own website, when the data has one that answered when last checked. */
  website?: string
  address: string
  phone: string
  /** Opening hours exactly as the data states them (OSM syntax); empty when unknown. */
  hours: string
  /** Doubts the backend raised about the hours, such as `hours_maybe_closed`. */
  flags: string[]
}

export type City = {
  id: CityId
  name: string
  nameEn: string
  /** The destination as the backend names it (journie-be `name_aliases.csv`), sent with every retrieval for this city. */
  destination: string
  /** Ways the city is written, without accents and lower case ("ha noi", "hanoi"), to read a destination or an address. */
  aliases: string[]
  /** The centre: the planner starts each day here and the map opens on it. */
  lat: number
  lng: number
  /** Typical road speed (km/h) before congestion, to reflect terrain. */
  roadKmh: number
  /** Radius (km) in which a POI counts as "central" for geographic suitability. */
  radiusKm: number
  tagline: [vi: string, en: string]
  tint: string
}

export type Stop = {
  uid: string
  poiId: string
  /** When the visit starts and ends (minutes after midnight). */
  start: number
  end: number
  visit: number
  /** Leg from the previous stop of the day. */
  travelMin: number
  travelKm: number
  travelCost: number
  mode: TravelMode
  /** Minutes spent waiting for the venue to open. */
  wait: number
  locked: boolean
}

export type Day = {
  index: number
  stops: Stop[]
}

export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE'

export type SolverMeta = {
  status: SolverStatus
  objective: number
  nodes: number
  ms: number
  model: string
}

/** `draft`: made but not saved yet (it can be discarded); `cancelled`: stopped while live, kept in the history. */
export type TripStatus = 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled'

/** What the backend planner (`POST /routing/days`, `POST /routing`) said about the trip, shown beside the plan. */
export type RoutingInfo = {
  /** Places it could not fit, with its reason code (`no_time`, `closed_on_trip_days`, `closed_on_pinned_day`, `not_found`, `no_location`). */
  unscheduled: { poiId: string; name: string; reason: string }[]
  /** `code:param` strings such as `travel_estimated`, `hours_unknown:<id>`, `day_max:food.cafe:2026-11-21`; unknown codes are ignored. */
  warnings: string[]
  /** Per place id, the trip dates it is open long enough to visit. */
  openDates?: Record<string, string[]>
  /** Per day (same order as `days`): visits plus travel, and the length of the day, in minutes. Only from `/routing/days`. */
  load?: { busy: number; capacity: number }[]
  travelSource?: 'osrm' | 'estimated'
  /** Every day's hours are the backend's (already checked against opening hours there), as `/routing` returns them. */
  timed?: boolean
  /**
   * Per day (same order as `days`), once a manual edit or a replan has re-timed some day on the device: whether that day still has the
   * backend's hours. It takes over from `timed`; read both through `isDayTimed`.
   */
  timedDays?: boolean[]
}

export type Trip = {
  id: string
  userId: string
  title: string
  city: CityId
  startDate: string
  days: Day[]
  budget: number
  dayStart: number
  dayEnd: number
  pace: Pace
  transport: TransportPref
  status: TripStatus
  solver: SolverMeta
  request: string
  rainy: boolean
  createdAt: string
  /** Bumped on every saved edit so the UI can tell stale copies apart. */
  version: number
  /** POI ids the user said must be in the plan. */
  mustInclude: string[]
  avoidTags: string[]
  /** Taste profile the plan was scored with; replanning reuses it. */
  interests: Interests
  keywords: string[]
  /** What the backend model understood of the request; an edit is read on top of it, so earlier wishes carry over. */
  extraction?: Extraction
  /** False while the plan is only a list of places; times and legs show once the traveler asks for the schedule. Missing means scheduled. */
  scheduled?: boolean
  /** Set when the backend planned the days or the times; absent for plans made on the device. */
  routing?: RoutingInfo
  /** Stops per day the traveler asked for; when missing the pace decides (`MAX_STOPS`). */
  stopsPerDay?: number
  /** Bars a night the traveler asked for ("3 quán bar mỗi đêm"); when missing one (`MAX_NIGHTLIFE`). Kept so an edit does not undo it. */
  nightsPerDay?: number
  /** The title was made from the city, pace and length, so it is written again in the interface language; renaming the trip clears it. */
  autoTitle?: boolean
  /** When and why a live trip was cancelled (UC 3.9). */
  cancelledAt?: string
  cancelReason?: string
  /** The trip (or share link) this one was copied from (UC 2.7). */
  clonedFrom?: string
  /**
   * A journey through several cities is a run of ordinary one-city trips on consecutive dates that share this id (`domain/journey.ts`);
   * `journeyOrder` is the leg's place in it. Missing on a trip of its own.
   */
  journeyId?: string
  journeyOrder?: number
}

export type Violation = {
  uid: string
  kind: 'closed' | 'overtime' | 'budget' | 'duplicate'
  detail: string
  detailEn: string
}

export type Disruption =
  | { kind: 'traffic'; minutes: number; label?: string }
  | { kind: 'closure'; poiId: string; label?: string }
  | { kind: 'weather'; until: number; label?: string }
  | { kind: 'delay'; minutes: number; label?: string }

export type Weather = {
  /** False when there is no forecast for this city and date; `condition` then says nothing and `tempC` is null. */
  known: boolean
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm'
  tempC: number | null
}
