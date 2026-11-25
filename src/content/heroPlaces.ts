import haGiangDrawing from '../assets/images/drawings/ha-giang.svg'
import haGiangDrawingNight from '../assets/images/drawings/ha-giang-night.svg'
import haGiangImage from '../assets/images/ha-giang.jpg'
import haGiangPoster from '../assets/images/posters/ha-giang.jpg'
import haLongDrawing from '../assets/images/drawings/ha-long.svg'
import haLongDrawingNight from '../assets/images/drawings/ha-long-night.svg'
import haLongImage from '../assets/images/ha-long.jpg'
import haLongPoster from '../assets/images/posters/ha-long.jpg'
import hoiAnDrawing from '../assets/images/drawings/hoi-an.svg'
import hoiAnDrawingNight from '../assets/images/drawings/hoi-an-night.svg'
import hoiAnImage from '../assets/images/hoi-an.jpg'
import hoiAnPoster from '../assets/images/posters/hoi-an.jpg'
import ninhBinhDrawing from '../assets/images/drawings/ninh-binh.svg'
import ninhBinhDrawingNight from '../assets/images/drawings/ninh-binh-night.svg'
import ninhBinhImage from '../assets/images/ninh-binh.jpg'
import ninhBinhPoster from '../assets/images/posters/ninh-binh.jpg'
import phuQuocDrawing from '../assets/images/drawings/phu-quoc.svg'
import phuQuocDrawingNight from '../assets/images/drawings/phu-quoc-night.svg'
import phuQuocImage from '../assets/images/phu-quoc.jpg'
import phuQuocPoster from '../assets/images/posters/phu-quoc.jpg'
import saiGonDrawing from '../assets/images/drawings/sai-gon.svg'
import saiGonDrawingNight from '../assets/images/drawings/sai-gon-night.svg'
import saiGonImage from '../assets/images/ho-chi-minh-city.jpg'
import saiGonPoster from '../assets/images/posters/sai-gon.jpg'

/** A destination: its photograph in the landing hero, its poster on the sign-in card, its drawing at the foot of those pages. */
export type HeroPlace = {
  id: string
  image: string
  /** 3:4 poster (photograph above, its drawing below), shown whole on the sign-in card so its own text stays readable. */
  poster: string
  /** The shapes of the photograph redrawn (from its poster), laid faintly at the foot of the page; a lighter set for night. */
  drawing: string
  drawingNight: string
  lat: number
  lng: number
  name: [vi: string, en: string]
  alt: [vi: string, en: string]
  /** Where to centre the photograph when it is cropped into the arch. */
  focus: string
  /** Whether there is open water in the picture (a koi may leap in it). */
  water: boolean
  /** The little weather card on the landing hero. */
  temp: number
  note: [vi: string, en: string]
}

export const HERO_PLACES: HeroPlace[] = [
  { id: 'ninh-binh', image: ninhBinhImage, poster: ninhBinhPoster, drawing: ninhBinhDrawing, drawingNight: ninhBinhDrawingNight, lat: 20.2506, lng: 105.9745, name: ['Tràng An, Ninh Bình', 'Trang An, Ninh Binh'], alt: ['Du khách chèo thuyền giữa núi đá vôi và sông nước Tràng An, Ninh Bình', 'Travelers rowing among limestone mountains and waterways in Trang An, Ninh Binh'], focus: '50% 50%', water: true, temp: 26, note: ['Đẹp trời để đi thuyền', 'Great weather for a boat ride'] },
  { id: 'ha-long', image: haLongImage, poster: haLongPoster, drawing: haLongDrawing, drawingNight: haLongDrawingNight, lat: 20.9101, lng: 107.1839, name: ['Vịnh Hạ Long, Quảng Ninh', 'Ha Long Bay, Quang Ninh'], alt: ['Những hòn đảo đá vôi và thuyền du lịch trên vịnh Hạ Long, nhìn từ đảo Ti Tốp', 'Limestone islands and cruise boats on Ha Long Bay, seen from Ti Top Island'], focus: '50% 50%', water: true, temp: 24, note: ['Biển lặng, hợp đi du thuyền', 'Calm water, good for a cruise'] },
  { id: 'ha-giang', image: haGiangImage, poster: haGiangPoster, drawing: haGiangDrawing, drawingNight: haGiangDrawingNight, lat: 22.8233, lng: 104.9836, name: ['Hạ Thành, Hà Giang', 'Ha Thanh, Ha Giang'], alt: ['Ruộng bậc thang xanh mướt và núi mờ sương ở Hà Giang', 'Green rice terraces and misty hills in Ha Giang'], focus: '45% 50%', water: false, temp: 22, note: ['Mây thấp, hợp săn mây', 'Low clouds, good for chasing them'] },
  { id: 'hoi-an', image: hoiAnImage, poster: hoiAnPoster, drawing: hoiAnDrawing, drawingNight: hoiAnDrawingNight, lat: 15.8801, lng: 108.338, name: ['Phố cổ Hội An, Quảng Nam', 'Hoi An Ancient Town, Quang Nam'], alt: ['Những dãy nhà vàng và đèn lồng trong phố cổ Hội An', 'Yellow merchant houses and lanterns in Hoi An Ancient Town'], focus: '38% 50%', water: false, temp: 27, note: ['Nắng dịu, hợp dạo phố cổ', 'Soft sun for an old-town stroll'] },
  { id: 'sai-gon', image: saiGonImage, poster: saiGonPoster, drawing: saiGonDrawing, drawingNight: saiGonDrawingNight, lat: 10.7769, lng: 106.7009, name: ['Sông Sài Gòn, TP.HCM', 'Saigon River, Ho Chi Minh City'], alt: ['Tòa Landmark 81 và các cao ốc bên sông Sài Gòn lúc chạng vạng', 'Landmark 81 and the towers along the Saigon River at dusk'], focus: '36% 50%', water: true, temp: 29, note: ['Trời thoáng, hợp ngắm thành phố', 'Clear skies for the city view'] },
  { id: 'phu-quoc', image: phuQuocImage, poster: phuQuocPoster, drawing: phuQuocDrawing, drawingNight: phuQuocDrawingNight, lat: 10.19, lng: 104.0, name: ['Bãi biển Phú Quốc, Kiên Giang', 'Phu Quoc Beach, Kien Giang'], alt: ['Bãi biển cát vàng, đá granite và hàng dừa ở Phú Quốc', 'A golden beach with granite boulders and coconut palms on Phu Quoc'], focus: '60% 50%', water: true, temp: 29, note: ['Biển xanh, hợp tắm biển', 'Blue sea, good for a swim'] },
]

const LAST_KEY = 'journie-hero-last'
let chosen: HeroPlace | null = null

/**
 * The destination for this visit. It is picked at random once per page load (so the landing page and the sign-in
 * pages agree while you move between them) and never the one shown on the previous load.
 */
export function heroPlace(): HeroPlace {
  if (chosen) return chosen
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_KEY)
  } catch {
    last = null
  }
  const pool = HERO_PLACES.filter((place) => place.id !== last)
  chosen = pool[Math.floor(Math.random() * pool.length)]
  try {
    localStorage.setItem(LAST_KEY, chosen.id)
  } catch {
    // private mode: the choice just is not remembered
  }
  return chosen
}

export const formatCoords = (place: Pick<HeroPlace, 'lat' | 'lng'>) => `${place.lat.toFixed(4)}° N, ${place.lng.toFixed(4)}° E`
