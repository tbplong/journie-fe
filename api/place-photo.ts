// Vercel function for `GET /api/place-photo?id=<google place id>` (see server/placePhoto.ts). Set ZIOMAP_API_KEY in the project's env.
import { placePhotoResponse } from '../server/placePhoto'

export async function GET(request: Request) {
  const { status, body } = await placePhotoResponse(new URL(request.url).searchParams.get('id'), process.env.ZIOMAP_API_KEY)
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}
