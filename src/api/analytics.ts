import type { CityId, Disruption } from '../domain/types'
import { useAuthStore } from '../store/authStore'
import { CRUD_TIMEOUT_MS, readStore, remoteOr, requestJson, writeStore } from './http'

const EVENTS_KEY = 'journie-events-v1'

export type EventType =
  | 'trip_created'
  | 'trip_saved'
  | 'trip_edited'
  | 'trip_started'
  | 'trip_cancelled'
  | 'trip_completed'
  | 'trip_shared'
  | 'trip_cloned'
  | 'replan_suggested'
  | 'replan_accepted'
  | 'replan_dismissed'
  | 'replan_auto'
  | 'edit_rejected'
  | 'search'
  | 'poi_opened'
  | 'poi_saved'
  | 'poi_reported'
  | 'set_created'
  | 'set_deleted'
  | 'login'
  | 'account_updated'

export type AnalyticsEvent = {
  t: string
  type: EventType
  /** Who did it; events logged before this was kept have none. */
  userId?: string
  city?: CityId
  reason?: Disruption['kind']
  lambda?: number
  detail?: string
  poiId?: string
  tripId?: string
  /** Itinerary snapshot for the data collection (UC 4.1): its size, without the traveler's words. */
  days?: number
  stops?: number
  budget?: number
  poiIds?: string[]
  /** True once the backend has the event. */
  sent?: boolean
}

export const readEvents = () => readStore<AnalyticsEvent[]>(EVENTS_KEY, [])

let flushTimer = 0

const eventKey = (event: AnalyticsEvent) => `${event.t}|${event.type}|${event.userId ?? ''}`

/** Sends unsent events in one batch (`POST /events`); while the backend has no such route they stay in this browser's queue. */
export async function flushEvents() {
  const events = readEvents()
  const unsent = events.filter((event) => !event.sent)
  if (!unsent.length) return 0
  const sent = await remoteOr(
    'events',
    () => requestJson<void>('POST', '/events', { events: unsent.map(({ sent: _sent, ...event }) => event) }, CRUD_TIMEOUT_MS).then(() => unsent.length),
    () => 0,
  )
  // Events tracked while the batch was on its way were not in it, so they stay queued
  const batch = new Set(unsent.map(eventKey))
  if (sent) writeStore(EVENTS_KEY, readEvents().map((event) => (batch.has(eventKey(event)) ? { ...event, sent: true } : event)))
  return sent
}

/** Logs an interaction for the admin dashboards; kept locally (last 400) and sent to the backend a few seconds later. */
export function track(event: Omit<AnalyticsEvent, 't' | 'userId' | 'sent'>) {
  const userId = useAuthStore.getState().user?.id
  writeStore(EVENTS_KEY, [...readEvents().slice(-399), { ...event, userId, t: new Date().toISOString() }])
  window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => void flushEvents().catch(() => undefined), 4000)
}
