/**
 * Street-level photos from Mapillary (CC BY-SA 4.0, credited to the photographer). Mapillary's image addresses expire, so only the
 * image id is stored (`content/placeStreetPhotos.json`) and the address is fetched when a photo is shown. The client token is meant
 * for browser use; without it no street photo is shown.
 */
const TOKEN: string | undefined = import.meta.env.VITE_MAPILLARY_TOKEN

export const mapillaryEnabled = Boolean(TOKEN)

export const mapillaryPage = (id: string) => `https://www.mapillary.com/app/?pKey=${id}`

/** A fresh address for the 1024 px version of one image. */
export async function mapillaryThumb(id: string): Promise<string> {
  const response = await fetch(`https://graph.mapillary.com/${id}?fields=thumb_1024_url&access_token=${encodeURIComponent(TOKEN ?? '')}`)
  if (!response.ok) throw new Error(`mapillary ${response.status}`)
  const data = (await response.json()) as { thumb_1024_url?: string }
  if (!data.thumb_1024_url) throw new Error('mapillary: no thumbnail')
  return data.thumb_1024_url
}
