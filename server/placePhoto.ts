/**
 * Server-only: one photo of a place, through ZioMap (a reseller of Google Maps Platform data, ziomap.socibi.com).
 * Google's terms let us store place IDs but not photos or photo names, and ask for photos to be fetched when they are shown,
 * credited to their authors with a link to the place on Google Maps. So the photo is looked up on every request and nothing is
 * kept here; the browser keeps it in memory for the session. The API key (ZIOMAP_API_KEY) never reaches the browser.
 * Used by the dev server (vite.config.ts) and the Vercel function (api/place-photo.ts).
 */
const BASE = 'https://ziomap-api.socibi.com'

export type PlacePhoto = { photoUri: string; authors: { name: string; uri?: string }[]; mapsUri?: string }

type Attribution = { displayName?: string; uri?: string }
type PlaceDetails = { googleMapsUri?: string; photos?: { name?: string; authorAttributions?: Attribution[] }[] }

/** Google place IDs are URL-safe tokens; anything else is refused before it is put in a URL. */
export const validPlaceId = (id: string) => /^[A-Za-z0-9_-]{10,200}$/.test(id)

export async function placePhoto(placeId: string, key: string, maxWidthPx = 800): Promise<PlacePhoto | null> {
  if (!validPlaceId(placeId)) return null
  // ZioMap's Cloudflare rejects requests that carry the runtime's default agent (error 1010), so name the app.
  const headers = { 'x-api-key': key, accept: 'application/json', 'user-agent': 'Journie/0.1 (student thesis project)' }
  const details = await fetch(`${BASE}/api/v1/places/${placeId}?fields=photos,googleMapsUri`, { headers })
  if (!details.ok) throw new Error(`ZioMap place details: HTTP ${details.status}`)
  const place = (await details.json()) as PlaceDetails
  const photo = place.photos?.[0]
  if (!photo?.name) return null
  const media = await fetch(`${BASE}/api/place/photos?${new URLSearchParams({ name: photo.name, maxWidthPx: String(maxWidthPx) })}`, { headers })
  if (!media.ok) throw new Error(`ZioMap place photo: HTTP ${media.status}`)
  const { photoUri } = (await media.json()) as { photoUri?: string }
  if (!photoUri) return null
  const authors = (photo.authorAttributions ?? []).filter((a) => a.displayName).map((a) => ({ name: a.displayName!, uri: a.uri }))
  return { photoUri, authors, mapsUri: place.googleMapsUri }
}

/** The HTTP answer both servers give for `GET /api/place-photo?id=<google place id>`. */
export async function placePhotoResponse(id: string | null, key: string | undefined): Promise<{ status: number; body: unknown }> {
  if (!key) return { status: 503, body: { error: 'not-configured' } }
  if (!id || !validPlaceId(id)) return { status: 400, body: { error: 'bad-id' } }
  try {
    const photo = await placePhoto(id, key)
    return photo ? { status: 200, body: photo } : { status: 404, body: { error: 'no-photo' } }
  } catch {
    return { status: 502, body: { error: 'upstream' } }
  }
}
