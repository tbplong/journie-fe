import type { Disruption } from '../domain/types'
import { CRUD_TIMEOUT_MS, remoteOr, requestJson } from './http'

/**
 * UC 3.3 "Detect external incidents": `GET /trips/{id}/incidents` returns what the backend found for the trip (traffic, weather,
 * closures). There is no device stand-in that would be real, so without the route the list is empty and `available` is false; the
 * live page then offers its demo simulator instead.
 */
export type Incident = {
  id: string
  kind: Disruption['kind']
  /** `minor` may be absorbed automatically (UC 3.4); `major` asks the traveler (UC 3.6). When missing, a delay or jam of 15 minutes or less counts as minor. */
  severity: 'minor' | 'major'
  affected_stop_ids: string[]
  delay_minutes?: number
  /** Minutes after midnight when the weather clears. */
  until?: number
  poi_id?: string
  message?: string
}

export type IncidentFeed = { available: boolean; incidents: Incident[] }

export const getIncidents = (tripId: string) =>
  remoteOr<IncidentFeed>(
    'incidents',
    () => requestJson<Incident[]>('GET', `/trips/${encodeURIComponent(tripId)}/incidents`, undefined, CRUD_TIMEOUT_MS).then((incidents) => ({ available: true, incidents })),
    () => ({ available: false, incidents: [] }),
  )

/** The incident as the replanner reads it. */
export function toDisruption(incident: Incident, now: number): Disruption | null {
  if (incident.kind === 'closure') return incident.poi_id ? { kind: 'closure', poiId: incident.poi_id, label: incident.message } : null
  if (incident.kind === 'weather') return { kind: 'weather', until: incident.until ?? now + 90, label: incident.message }
  return { kind: incident.kind, minutes: incident.delay_minutes ?? 15, label: incident.message }
}
