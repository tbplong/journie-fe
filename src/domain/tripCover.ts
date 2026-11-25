import { cityGallery } from './cityMedia'
import { placeMedia } from './placeMedia'
import { poiById } from './pois'
import type { CategoryId, Trip } from './types'

/** Sights make a better cover than a meal or a coffee. */
const SIGHT: Partial<Record<CategoryId, number>> = { culture: 0.3, nature: 0.3, beach: 0.3, market: 0.15, adventure: 0.15 }

/** Photos of the trip's own places, standout first: places the traveler insisted on and sights, then the backend's quality. */
function placePhotos(trip: Trip): string[] {
  const seen = new Set<string>()
  const ranked: { src: string; score: number }[] = []
  for (const day of trip.days) {
    for (const stop of day.stops) {
      const poi = poiById[stop.poiId]
      if (!poi || seen.has(poi.id)) continue
      seen.add(poi.id)
      const media = placeMedia(poi, false)
      // Own, Commons and saved Google photos of the place itself; a website's cover is often a logo or a menu
      if (media.kind !== 'photo' || media.credit?.site) continue
      ranked.push({ src: media.src, score: poi.quality + (SIGHT[poi.cat] ?? 0) + (trip.mustInclude.includes(poi.id) ? 0.2 : 0) })
    }
  }
  return ranked.sort((a, b) => b.score - a.score).map((item) => item.src)
}

/**
 * One cover photo per trip, none shared while another is left: each trip takes its most standout place with a real photo
 * that no other trip has taken, then a photo of its city not used yet, and only then repeats. Trips are served oldest
 * first, so a new trip never changes the covers already shown.
 */
export function tripCovers(trips: Trip[]): Record<string, string> {
  const used = new Set<string>()
  const covers: Record<string, string> = {}
  for (const trip of [...trips].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
    const options = [...placePhotos(trip), ...cityGallery[trip.city].map((photo) => photo.src)]
    const pick = options.find((src) => !used.has(src)) ?? options[0]
    used.add(pick)
    covers[trip.id] = pick
  }
  return covers
}
