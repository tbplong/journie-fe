/**
 * Dev-only: opening any page with `?__demo=1` signs in the demo traveler and gives them one sample trip, so automated
 * checks (which start from an empty browser profile) can reach the signed-in pages. Never bundled into production:
 * main.tsx imports this only behind import.meta.env.DEV.
 */
const SESSION = { state: { user: { id: 'u-traveler', name: 'Lữ Khách', email: 'lu.khach@journie.vn', role: 'traveler' } }, version: 1 }

const stop = (uid: string, poiId: string, start: number, visit: number, travelMin: number, travelKm: number, travelCost: number, mode: 'bike' | 'walk', wait = 0, locked = false) => ({
  uid, poiId, start, end: start + visit, visit, travelMin, travelKm, travelCost, mode, wait, locked,
})

const TRIP = {
  id: 't-demo-saigon',
  userId: 'u-traveler',
  title: 'Sài Gòn trọn vẹn · 2 ngày',
  autoTitle: true,
  city: 'sai-gon',
  startDate: new Date().toISOString().slice(0, 10),
  days: [
    {
      index: 0,
      stops: [
        stop('sdemo01', 'rau-oi-d3b94c', 483, 60, 4, 1.27, 12000, 'bike', 0, true),
        stop('sdemo02', 'bao-tang-lich-su-thanh-pho-ho-chi-minh-e64ec0', 552, 90, 9, 2.97, 19000, 'bike'),
        stop('sdemo03', 'bao-tang-ton-duc-thang-975f9f', 810, 90, 5, 1.59, 12000, 'bike', 163),
        stop('sdemo04', 'bao-tang-chung-tich-chien-tranh-08b374', 906, 90, 6, 2.13, 14000, 'bike'),
        stop('sdemo05', 'sol-kitchen-bar-53ac5b', 1020, 60, 3, 1.06, 12000, 'bike', 20),
      ],
    },
    {
      index: 1,
      stops: [
        stop('sdemo06', 'giong-0a03b4', 484, 45, 5, 0.35, 0, 'walk'),
        stop('sdemo07', 'bao-tang-my-thuat-thanh-pho-ho-chi-minh-73dd12', 533, 90, 4, 1.34, 12000, 'bike'),
        stop('sdemo08', 'com-tam-ba-ghien-41aefc', 640, 60, 17, 5.53, 36000, 'bike'),
        stop('sdemo09', 'py-art-gallery-eb0490', 716, 90, 17, 5.55, 36000, 'bike'),
        stop('sdemo10', 'banh-mi-huynh-hoa-c31355', 811, 60, 5, 1.65, 12000, 'bike'),
        stop('sdemo11', 'green-palm-gallery-40bcbf', 877, 90, 5, 1.82, 12000, 'bike'),
        stop('sdemo12', 'phuc-long-589cf8', 972, 45, 5, 1.68, 12000, 'bike'),
      ],
    },
  ],
  budget: 2000000,
  dayStart: 480,
  dayEnd: 1260,
  pace: 'balanced',
  transport: 'bike',
  status: 'upcoming',
  request: 'Sài Gòn 2 ngày, 2.000.000 VND. Thích bảo tàng, chùa cổ và ăn uống, uống cà phê',
  rainy: false,
  createdAt: new Date().toISOString(),
  version: 1,
  mustInclude: [],
  avoidTags: [],
  interests: { culture: 0.95, cafe: 0.95, food: 0.95 },
  keywords: ['museum'],
  scheduled: true,
}

/** Writes the demo session and trip, then reloads the same page without the flag. */
export function seedDemo() {
  localStorage.setItem('journie-session', JSON.stringify(SESSION))
  localStorage.setItem('journie-trips-v2', JSON.stringify([TRIP]))
  const url = new URL(location.href)
  url.searchParams.delete('__demo')
  location.replace(url.pathname.replace('/app/trips/demo', `/app/trips/${TRIP.id}`) + url.search + url.hash)
}
