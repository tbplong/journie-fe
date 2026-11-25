import { cityById } from '../domain/pois'
import type { Trip, TripStatus } from '../domain/types'
import { loadPlaces } from './catalog'
import { CRUD_TIMEOUT_MS, latency, readStore, remoteOr, requestJson, writeStore } from './http'

const KEY = 'journie-trips-v2'

/**
 * Trips: `GET/POST /trips`, `GET/PUT/DELETE /trips/{id}`. The backend has no trip routes yet, so every call falls back to this
 * browser's storage; `TripDto` is the wire shape the backend will be asked to keep, and these functions are the only place that
 * knows about it.
 */
export type TripDto = Omit<Trip, 'userId' | 'startDate' | 'createdAt'> & { user_id: string; start_date: string; created_at: string }

const toDto = ({ userId, startDate, createdAt, ...rest }: Trip): TripDto => ({ ...rest, user_id: userId, start_date: startDate, created_at: createdAt })
export const fromDto = ({ user_id, start_date, created_at, ...rest }: TripDto): Trip => ({ ...rest, userId: user_id, startDate: start_date, createdAt: created_at })

// Trips saved before the app used the backend's places may name another city; they cannot be shown, so they are skipped. A stop
// whose place this browser has not loaded is kept and shows as not loaded.
const read = () => readStore<Trip[]>(KEY, []).filter((trip) => trip.city in cityById)
const write = (trips: Trip[]) => writeStore(KEY, trips)

/** Every trip kept in this browser, of every account: what the admin data views read while the backend has no trips. */
export const readAllTrips = read
/** One trip straight from storage, for the shared view. */
export const peekTrip = (id: string) => read().find((trip) => trip.id === id)

/** Fetches the places of these trips that this browser has not loaded, so every stop can be drawn. */
export const loadPlacesOf = (trips: Trip[]) => loadPlaces(trips.flatMap((trip) => trip.days.flatMap((day) => day.stops.map((stop) => stop.poiId))))

export const listTrips = (userId: string) =>
  remoteOr(
    'trips',
    () => requestJson<TripDto[]>('GET', '/trips', undefined, CRUD_TIMEOUT_MS).then((list) => list.map(fromDto).sort(byRecency)),
    () => latency(() => read().filter((trip) => trip.userId === userId).sort(byRecency), 260, 520),
  ).then(async (trips) => {
    await loadPlacesOf(trips)
    return trips
  })

export const getTrip = (id: string, userId: string) =>
  remoteOr(
    'trips',
    () => requestJson<TripDto>('GET', `/trips/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(() => {
        const trip = read().find((entry) => entry.id === id && entry.userId === userId)
        if (!trip) throw new Error('not_found')
        return trip
      }, 180, 380),
  ).then(async (trip) => {
    await loadPlacesOf([trip])
    return trip
  })

export const createTrip = (trip: Trip) =>
  remoteOr(
    'trips',
    () => requestJson<TripDto>('POST', '/trips', toDto(trip), CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(() => {
        write([...read(), trip])
        return trip
      }, 250, 450),
  )

/** Sends the version the edit started from, so the backend can refuse a save made on top of an older copy (409). */
export const saveTrip = (trip: Trip) =>
  remoteOr(
    'trips',
    () => requestJson<TripDto>('PUT', `/trips/${encodeURIComponent(trip.id)}`, toDto(trip), CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(() => {
        const next = { ...trip, version: trip.version + 1 }
        write(read().map((entry) => (entry.id === trip.id ? next : entry)))
        return next
      }, 160, 340),
  )

type Waiter = { resolve: (trip: Trip) => void; reject: (error: unknown) => void }
type SaveQueue = { next: Trip | null; waiting: Waiter[] }
const queues = new Map<string, SaveQueue>()

/**
 * Saves of one trip go out one at a time, each carrying the version the previous save returned; edits made while a save is on its
 * way are sent together as the latest. Sent side by side, two quick edits would carry the same version and the second would be
 * refused as changed elsewhere (409) although nobody else touched the trip.
 */
export function saveTripInTurn(trip: Trip): Promise<Trip> {
  const running = queues.get(trip.id)
  const queue = running ?? { next: null, waiting: [] }
  const saved = new Promise<Trip>((resolve, reject) => queue.waiting.push({ resolve, reject }))
  queue.next = trip
  if (!running) {
    queues.set(trip.id, queue)
    void drain(trip.id, queue)
  }
  return saved
}

/** True while a save of this trip is on its way or waiting its turn. */
export const isSaving = (id: string) => queues.has(id)

async function drain(id: string, queue: SaveQueue) {
  let version: number | undefined
  while (queue.next) {
    const trip = version === undefined ? queue.next : { ...queue.next, version }
    const waiting = queue.waiting
    queue.next = null
    queue.waiting = []
    try {
      const saved = await saveTrip(trip)
      version = saved.version
      for (const waiter of waiting) waiter.resolve(saved)
    } catch (error) {
      // The edits waiting behind a refused save were made on top of it, so they are refused with it
      for (const waiter of [...waiting, ...queue.waiting]) waiter.reject(error)
      queue.next = null
      queue.waiting = []
    }
  }
  queues.delete(id)
}

export const deleteTrip = (id: string) =>
  remoteOr(
    'trips',
    () => requestJson<void>('DELETE', `/trips/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(() => id),
    () =>
      latency(() => {
        write(read().filter((trip) => trip.id !== id))
        return id
      }, 200, 380),
  )

/** Removes every trip of an account (an admin deleting the account) from this browser. */
export const deleteTripsOf = (userId: string) => write(read().filter((trip) => trip.userId !== userId))

const order: Record<TripStatus, number> = { live: 0, upcoming: 1, draft: 2, completed: 3, cancelled: 4 }
const byRecency = (a: Trip, b: Trip) => order[a.status] - order[b.status] || a.startDate.localeCompare(b.startDate)
