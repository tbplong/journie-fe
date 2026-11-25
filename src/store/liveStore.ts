import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Disruption } from '../domain/types'

/**
 * A proposed change to a live trip that waits for the traveler (UC 3.6). It survives a reload and can be opened from a
 * notification; once past `expiresAt` the current plan simply stays.
 */
export type EditRequest = {
  id: string
  tripId: string
  dayIndex: number
  disruption: Disruption
  /** Minutes after midnight on the trip clock when it was raised. */
  at: number
  createdAt: string
  expiresAt: string
}

/** How the live page follows the traveler: the device's location, or the demo clock that can be fast-forwarded. */
export type LiveMode = 'gps' | 'demo'

type TripLive = {
  mode: LiveMode
  /** The demo clock, so a reload does not start the day again. */
  clock: number | null
  pending: EditRequest | null
  /** Incidents the traveler already answered ("keep my plan"); the same one is not raised again. */
  suppressed: string[]
  /** "Remind me later": the request hides until this trip-clock minute. */
  snoozedUntil?: number
}

const blank: TripLive = { mode: 'demo', clock: null, pending: null, suppressed: [] }

type State = {
  trips: Record<string, TripLive>
  patch: (tripId: string, patch: Partial<TripLive>) => void
  clear: (tripId: string) => void
}

export const useLiveStore = create<State>()(
  persist(
    (set) => ({
      trips: {},
      patch: (tripId, patch) => set((state) => ({ trips: { ...state.trips, [tripId]: { ...blank, ...state.trips[tripId], ...patch } } })),
      clear: (tripId) =>
        set((state) => {
          const { [tripId]: _gone, ...rest } = state.trips
          return { trips: rest }
        }),
    }),
    { name: 'journie-live-v1', version: 1 },
  ),
)

export const liveOf = (trips: Record<string, TripLive>, tripId: string | undefined): TripLive => (tripId && trips[tripId]) || blank

/**
 * One key per incident, so answering it once stops it from being raised again. A delay or traffic jam of another length is another
 * incident; rain is one condition for the day.
 */
export const incidentKey = (disruption: Disruption) => `${disruption.kind}:${disruption.kind === 'closure' ? disruption.poiId : disruption.kind === 'weather' ? '' : disruption.minutes}`

/** Small hold-ups the plan absorbs on its own (UC 3.4); anything bigger asks the traveler first. */
export const isMinor = (disruption: Disruption) => (disruption.kind === 'delay' || disruption.kind === 'traffic') && disruption.minutes <= 15

/** How long a proposal waits for an answer. */
export const REQUEST_TTL_MS = 15 * 60_000
