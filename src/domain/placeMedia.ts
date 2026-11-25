import type { CSSProperties } from 'react'
import photoData from '../content/placePhotos.json'
import sitePhotoData from '../content/placeSitePhotos.json'
import streetPhotoData from '../content/placeStreetPhotos.json'
import googleIdData from '../content/placeGoogleIds.json'
import savedGoogleData from '../content/placeGooglePhotos.json'
import { mapillaryEnabled, mapillaryPage } from '../api/mapillary'
import type { Poi } from './types'

/**
 * Where a picture of a place comes from, best first:
 *  1. `src/assets/images/places/<poi-id>.jpg` – your own photo of that very place (drop a file in and it is used);
 *  2. `content/placePhotos.json` – an openly licensed photo from Wikimedia Commons, matched to the place by its name and
 *     position (journie-data `places_1000/pipeline/photos.py`), always shown with its credit;
 *  3. `content/placeStreetPhotos.json` – a street-level photo of the frontage from Mapillary, picked to face the place from close by
 *     (`mapillary.py`); the image address is fetched when it is shown;
 *  4. `content/placeSitePhotos.json` – the cover photo of the place's own website (`site_photos.py`), linked, not copied, and
 *     labelled as coming from that website;
 *  5. nothing: the card says there is no photo yet. Never a drawing and never the city's photograph, because neither shows
 *     what that place looks like.
 */
const placePhotos = import.meta.glob('../assets/images/places/*.{jpg,jpeg,png,webp,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const byPoi: Record<string, string> = {}
for (const [path, url] of Object.entries(placePhotos)) {
  const stem = path.split('/').pop()!.replace(/\.[^.]+$/, '')
  byPoi[stem] = url
}

type CommonsPhoto = { src: string; author: string; license: string; license_url: string; page: string }
const commons = photoData as Record<string, CommonsPhoto>

/** `near`: taken from further off or at a sharper angle, so it shows the street around the place and may not show the frontage itself. */
type StreetPhoto = { id: string; user: string; year: number; near?: boolean }
const streetPhotos = streetPhotoData as Record<string, StreetPhoto>

type SitePhoto = { src: string; site: string; page: string }
const sitePhotos = sitePhotoData as Record<string, SitePhoto>

/** Who a photo is from: a Commons author under a licence, a Google Maps author (`google`, `page` is the place on Maps), or the place's own website. */
export type PhotoCredit = { author?: string; license?: string; licenseUrl?: string; site?: string; google?: boolean; page: string; street?: { user: string; year: number; near?: boolean } }

/** Google place IDs found for our places (`google_ids.py` in Journie-Data). Google's terms allow storing these IDs, not the photos. */
const googleIds = googleIdData as Record<string, string>

type SavedGooglePhoto = { src?: string; author?: string; authorUri?: string; mapsUri?: string; none?: boolean }
const savedGoogle = savedGoogleData as Record<string, SavedGooglePhoto>

export type Media =
  | { kind: 'photo'; src: string; style: CSSProperties; credit?: PhotoCredit }
  | { kind: 'street'; id: string; credit: PhotoCredit }
  | { kind: 'google'; placeId: string }
  | { kind: 'none' }

/** `withGoogle: false` gives the picture to fall back on when the Google photo cannot be shown (no key, no photo, server down). */
export function placeMedia(poi: Poi, withGoogle = true): Media {
  const own = byPoi[poi.id]
  if (own) return { kind: 'photo', src: own, style: {} }
  const photo = commons[poi.id]
  if (photo) return { kind: 'photo', src: photo.src, style: {}, credit: { author: photo.author, license: photo.license, licenseUrl: photo.license_url, page: photo.page } }
  // A Google Maps photo saved into public/places/google (google_photos.py; the owner chose to keep them), shown with its author
  const saved = savedGoogle[poi.id]
  if (saved?.src) return { kind: 'photo', src: saved.src, style: {}, credit: { author: saved.author, google: true, page: saved.mapsUri || saved.authorUri || '' } }
  // Otherwise a Google photo fetched when shown, which comes before a street-level view that often misses the frontage
  const google = googleIds[poi.id]
  if (google && withGoogle) return { kind: 'google', placeId: google }
  const street = streetPhotos[poi.id]
  if (street && mapillaryEnabled) return { kind: 'street', id: street.id, credit: { page: mapillaryPage(street.id), street: { user: street.user, year: street.year, near: street.near } } }
  const site = sitePhotos[poi.id]
  if (site) return { kind: 'photo', src: site.src, style: {}, credit: { site: site.site, page: site.page } }
  return { kind: 'none' }
}
