import { PlaceArt, CityArt } from '../components/place/art/PlaceArt'
import { cities, pois } from '../domain/pois'

/** Dev-only contact sheet for the place illustrations (`/__art`). */
export function ArtSheet() {
  return (
    <div className="min-h-dvh bg-paper p-6 text-forest">
      <h1 className="h-display text-3xl">Place illustrations</h1>
      <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cities.map((city) => (
          <li key={city.id}>
            <CityArt city={city.id} className="aspect-[5/2] w-full border border-forest/20" />
            <p className="mt-1 text-xs font-semibold">{city.name}</p>
          </li>
        ))}
        {pois.map((poi) => (
          <li key={poi.id}>
            <PlaceArt poi={poi} className="aspect-[5/2] w-full border border-forest/20" />
            <p className="mt-1 truncate text-xs font-semibold">{poi.name}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
