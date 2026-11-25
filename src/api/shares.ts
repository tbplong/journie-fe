import type { Trip } from '../domain/types'
import { ApiError, CRUD_TIMEOUT_MS, latency, readStore, remoteOr, requestJson, writeStore } from './http'
import { fromDto, loadPlacesOf, peekTrip, type TripDto } from './trips'

/**
 * UC 2.4 "Share itinerary": `POST /trips/{id}/share` makes a read-only link, `DELETE` revokes it and `GET /shared/{token}` opens it
 * without signing in. Until the backend has these routes the link is kept in this browser, so it opens only here.
 */
export type Share = { token: string; tripId: string; createdAt: string; ownerName: string }
type ShareRecord = Share & { revoked?: boolean }

const KEY = 'journie-shares-v1'
const read = () => readStore<ShareRecord[]>(KEY, [])
const write = (shares: ShareRecord[]) => writeStore(KEY, shares)

const randomToken = () => {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 18)
}

export const shareUrl = (token: string) => `${window.location.origin}/s/${token}`

export const getShareFor = (tripId: string) =>
  remoteOr<Share | null>(
    'shares',
    () => requestJson<Share | null>('GET', `/trips/${encodeURIComponent(tripId)}/share`, undefined, CRUD_TIMEOUT_MS),
    () => latency(() => read().find((share) => share.tripId === tripId && !share.revoked) ?? null, 120, 260),
  )

export const shareTrip = (trip: Trip, ownerName: string) =>
  remoteOr<Share>(
    'shares',
    () => requestJson<Share>('POST', `/trips/${encodeURIComponent(trip.id)}/share`, {}, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const existing = read().find((share) => share.tripId === trip.id && !share.revoked)
        if (existing) return existing
        const share: ShareRecord = { token: randomToken(), tripId: trip.id, createdAt: new Date().toISOString(), ownerName }
        write([...read(), share])
        return share
      }, 250, 450),
  )

export const revokeShare = (tripId: string) =>
  remoteOr<true>(
    'shares',
    () => requestJson<void>('DELETE', `/trips/${encodeURIComponent(tripId)}/share`, undefined, CRUD_TIMEOUT_MS).then(() => true as const),
    () =>
      latency(() => {
        write(read().map((share) => (share.tripId === tripId ? { ...share, revoked: true } : share)))
        return true as const
      }, 200, 380),
  )

export type SharedTrip = { trip: Trip; ownerName: string; createdAt: string }

/** The trip behind a link, as it is now (edits made after sharing show), or `link-invalid` once revoked or deleted. */
export const openShare = (token: string) =>
  remoteOr<SharedTrip>(
    'shares',
    () => requestJson<Omit<SharedTrip, 'trip'> & { trip: TripDto }>('GET', `/shared/${encodeURIComponent(token)}`, undefined, CRUD_TIMEOUT_MS).then((shared) => ({ ...shared, trip: fromDto(shared.trip) })),
    () =>
      latency(() => {
        const share = read().find((entry) => entry.token === token)
        if (!share || share.revoked) throw new ApiError('link-invalid', 'This link is not valid')
        const trip = peekTrip(share.tripId)
        if (!trip) throw new ApiError('link-invalid', 'The trip was deleted')
        return { trip, ownerName: share.ownerName, createdAt: share.createdAt }
      }, 200, 400),
  ).then(async (shared) => {
    await loadPlacesOf([shared.trip])
    return shared
  })
