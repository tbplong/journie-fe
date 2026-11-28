import { useQuery } from '@tanstack/react-query'

/** One Google Maps photo of a place, from our own `/api/place-photo` (server/placePhoto.ts), which holds the ZioMap key. */
export type GooglePhoto = { photoUri: string; authors: { name: string; uri?: string }[]; mapsUri?: string }

const THIRTY_MINUTES = 30 * 60 * 1000
// 502/503 mean ZioMap or its key is down for every place, not this one: stop asking for a few minutes and let the cards fall back.
// At most 4 requests run at once, so a page full of cards neither waits on one slow answer nor sends dozens of failing ones.
const RETRY_AFTER = 5 * 60 * 1000
const MAX_IN_FLIGHT = 4
let downUntil = 0
let inFlight = 0
const waiting: (() => void)[] = []

async function fetchGooglePhoto(placeId: string, signal: AbortSignal): Promise<GooglePhoto> {
  const queued = inFlight >= MAX_IN_FLIGHT
  if (queued) await new Promise<void>((resolve) => waiting.push(resolve))
  // Its card left the screen while it waited: pass the slot on without asking ZioMap
  if (signal.aborted) {
    if (queued) waiting.shift()?.()
    throw signal.reason
  }
  inFlight += 1
  try {
    if (Date.now() < downUntil) throw new Error('place photo: upstream unavailable')
    const response = await fetch(`/api/place-photo?id=${encodeURIComponent(placeId)}`, { signal })
    if (response.status === 502 || response.status === 503) downUntil = Date.now() + RETRY_AFTER
    if (!response.ok) throw new Error(`place photo: HTTP ${response.status}`)
    return (await response.json()) as GooglePhoto
  } finally {
    inFlight -= 1
    waiting.shift()?.()
  }
}

/** Shared by the picture and its credit line. Kept in memory only (Google's terms do not allow storing photos); each view costs a ZioMap request, so one per session. */
export const useGooglePhoto = (placeId: string | undefined) =>
  useQuery({ queryKey: ['place-photo', placeId], queryFn: ({ signal }) => fetchGooglePhoto(placeId!, signal), enabled: Boolean(placeId), staleTime: THIRTY_MINUTES, gcTime: THIRTY_MINUTES, retry: false })
