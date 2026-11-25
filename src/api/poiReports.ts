import { CRUD_TIMEOUT_MS, latency, readStore, remoteOr, requestJson, writeStore } from './http'

/**
 * UC 1.5 "POI status report": `POST /pois/{id}/reports` from a traveler, `GET /admin/poi-reports` for the review queue. Kept in this
 * browser until the backend has the routes, so a report made here reaches no one else yet.
 */
export type ReportType = 'closed' | 'hours' | 'address' | 'other'
export type PoiReport = { id: string; poiId: string; userId: string; type: ReportType; note: string; at: string; status: 'open' | 'resolved' }

const KEY = 'journie-poi-reports-v1'
const read = () => readStore<PoiReport[]>(KEY, [])

export const myReport = (poiId: string, userId: string) => read().find((report) => report.poiId === poiId && report.userId === userId && report.status === 'open')

/** Keeps the report in this browser: the whole queue while the backend has no route, and the "already reported" state either way. */
function keep(input: { poiId: string; userId: string; type: ReportType; note: string }, id = `r-${Date.now().toString(36)}`) {
  const report: PoiReport = { id, ...input, note: input.note.trim(), at: new Date().toISOString(), status: 'open' }
  writeStore(KEY, [...read().filter((entry) => !(entry.poiId === input.poiId && entry.userId === input.userId && entry.status === 'open')), report].slice(-300))
  return report
}

export const reportPoi = (input: { poiId: string; userId: string; type: ReportType; note: string }) =>
  remoteOr<PoiReport>(
    'poi-reports',
    () => requestJson<PoiReport | undefined>('POST', `/pois/${encodeURIComponent(input.poiId)}/reports`, { type: input.type, note: input.note.trim() }, CRUD_TIMEOUT_MS).then((saved) => keep(input, saved?.id)),
    () => latency(() => keep(input), 300, 600),
  )

export const listReports = () =>
  remoteOr<PoiReport[]>(
    'poi-reports',
    () => requestJson<PoiReport[]>('GET', '/admin/poi-reports', undefined, CRUD_TIMEOUT_MS),
    () => latency(() => [...read()].sort((a, b) => b.at.localeCompare(a.at)), 150, 300),
  )

export const resolveReport = (id: string) =>
  remoteOr<true>(
    'poi-reports',
    () => requestJson<void>('PATCH', `/admin/poi-reports/${encodeURIComponent(id)}`, { status: 'resolved' }, CRUD_TIMEOUT_MS).then(() => true as const),
    () =>
      latency(() => {
        writeStore(KEY, read().map((entry) => (entry.id === id ? { ...entry, status: 'resolved' as const } : entry)))
        return true as const
      }, 150, 300),
  )
