import { poiById } from '../domain/pois'
import type { CategoryId, CityId, Trip } from '../domain/types'
import type { AccountStatus, Role, SessionUser } from '../store/authStore'
import { publicUser, readAccounts, writeAccounts, type Account } from './accountStore'
import { readEvents, type AnalyticsEvent } from './analytics'
import { ApiError, CRUD_TIMEOUT_MS, latency, readStore, remoteOr, requestJson, writeStore } from './http'
import { deleteSetsOf, readAllSets } from './poiSets'
import { readProfile, type Profile } from './profile'
import { deleteTripsOf, readAllTrips } from './trips'

/**
 * Admin routes (Modules 4 and 6). None exist on the backend yet; each falls back to what this browser holds, which is real data but
 * only this device's: the accounts, trips, sets and events stored here.
 */

/* ───────── modules (UC 6.1, 6.3, 6.4) ───────── */

export type ModuleId = 'planner' | 'recommend' | 'discover' | 'live' | 'sets' | 'sharing'
export type SystemModule = { id: ModuleId; enabled: boolean; updatedAt?: string }

const MODULES_KEY = 'journie-modules-v1'
const MODULE_IDS: ModuleId[] = ['planner', 'recommend', 'discover', 'live', 'sets', 'sharing']

/** Every module the app knows, in its own order; one an answer leaves out has never been switched off. */
const allModules = (list: SystemModule[] | null | undefined): SystemModule[] => MODULE_IDS.map((id) => list?.find((entry) => entry.id === id) ?? { id, enabled: true })
const readModules = () => allModules(readStore<SystemModule[]>(MODULES_KEY, []))

export const listModules = () =>
  remoteOr<SystemModule[]>('modules', () => requestJson<SystemModule[] | null>('GET', '/modules', undefined, CRUD_TIMEOUT_MS).then(allModules), () => latency(readModules, 60, 140))

export const setModuleEnabled = (id: ModuleId, enabled: boolean) =>
  remoteOr<SystemModule>(
    'modules',
    () => requestJson<SystemModule>('PATCH', `/admin/modules/${id}`, { enabled }, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const next = readModules().map((entry) => (entry.id === id ? { ...entry, enabled, updatedAt: new Date().toISOString() } : entry))
        writeStore(MODULES_KEY, next)
        return next.find((entry) => entry.id === id)!
      }, 200, 400),
  )

/* ───────── users (UC 6.2, 6.5-6.8, 6.11) ───────── */

export type UserRow = SessionUser & { createdAt?: string; lastActiveAt?: string; blockedReason?: string; trips: number }
export type UserQuery = { q?: string; status?: AccountStatus | 'all'; role?: Role | 'all'; page?: number; pageSize?: number }
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

const rowOf = (account: Account, trips: Trip[]): UserRow => ({
  ...publicUser(account),
  status: account.status ?? 'active',
  createdAt: account.createdAt,
  lastActiveAt: account.lastActiveAt,
  blockedReason: account.blockedReason,
  trips: trips.filter((trip) => trip.userId === account.id).length,
})

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '' && value !== 'all') search.set(key, String(value))
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const listUsers = ({ q = '', status = 'all', role = 'all', page = 1, pageSize = 10 }: UserQuery) =>
  remoteOr<Page<UserRow>>(
    'admin-users',
    () => requestJson<Page<UserRow>>('GET', `/admin/users${toQuery({ q, status, role, page, page_size: pageSize })}`, undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const trips = readAllTrips()
        const needle = q.trim().toLowerCase()
        const all = readAccounts()
          .map((a) => rowOf(a, trips))
          .filter((u) => (status === 'all' || u.status === status) && (role === 'all' || u.role === role) && (!needle || `${u.name} ${u.email}`.toLowerCase().includes(needle)))
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize }
      }, 150, 320),
  )

export type UserDetail = { user: UserRow; profile: Profile | null }

export const getUser = (id: string) =>
  remoteOr<UserDetail>(
    'admin-users',
    () => requestJson<UserDetail>('GET', `/admin/users/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const account = readAccounts().find((a) => a.id === id)
        if (!account) throw new ApiError('user_not_found', 'No such user')
        return { user: rowOf(account, readAllTrips()), profile: account.role === 'traveler' ? readProfile(account.id, account.name) : null }
      }, 150, 300),
  )

function guard(actorId: string, id: string) {
  const list = readAccounts()
  const target = list.find((a) => a.id === id)
  if (!target) throw new ApiError('user_not_found', 'No such user')
  if (id === actorId) throw new ApiError('cannot-act-on-self', 'You cannot do this to your own account')
  if (target.role === 'admin' && list.filter((a) => a.role === 'admin' && a.status !== 'blocked').length <= 1) throw new ApiError('last-admin', 'The last admin cannot be removed')
  return list
}

/** UC 6.7/6.8: a blocked account cannot sign in; an open session is signed out on its next request once the backend checks it. */
export const setUserStatus = (actorId: string, id: string, status: 'active' | 'blocked', reason = '') =>
  remoteOr<true>(
    'admin-users',
    () => requestJson<void>('POST', `/admin/users/${encodeURIComponent(id)}/${status === 'blocked' ? 'block' : 'unblock'}`, { reason }, CRUD_TIMEOUT_MS).then(() => true as const),
    () =>
      latency(() => {
        const list = guard(actorId, id)
        writeAccounts(list.map((a) => (a.id === id ? { ...a, status, blockedReason: status === 'blocked' ? reason.trim() || undefined : undefined } : a)))
        return true as const
      }, 250, 450),
  )

/** UC 6.6: the account and what belongs to it (trips, sets, profile) go too. */
export const deleteUser = (actorId: string, id: string) =>
  remoteOr<true>(
    'admin-users',
    () => requestJson<void>('DELETE', `/admin/users/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(() => true as const),
    () =>
      latency(() => {
        const list = guard(actorId, id)
        writeAccounts(list.filter((a) => a.id !== id))
        deleteTripsOf(id)
        deleteSetsOf(id)
        const profiles = readStore<Record<string, Profile>>('journie-profiles-v1', {})
        delete profiles[id]
        writeStore('journie-profiles-v1', profiles)
        return true as const
      }, 300, 500),
  )

/* ───────── activity (UC 6.10, 6.14) ───────── */

export type ActivityQuery = { userId?: string; type?: string; from?: string; to?: string; page?: number; pageSize?: number }
/** An event as the history lists it; the backend adds the author's name, which this browser may not know. */
export type ActivityEvent = AnalyticsEvent & { userName?: string }

/** The local calendar day of a timestamp (YYYY-MM-DD), so an evening event is not counted on the next UTC day. */
const localDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA')
const inRange = (t: string, from?: string, to?: string) => (!from || localDay(t) >= from) && (!to || localDay(t) <= to)

const activityPath = (userId: string | undefined, self: boolean) => (self ? '/me/activity' : userId ? `/admin/users/${encodeURIComponent(userId)}/activity` : '/admin/activity')

/** One account's history, or everyone's when no `userId` is given (admin). `self` reads the signed-in user's own (`GET /me/activity`). */
export const listActivity = ({ userId, type, from, to, page = 1, pageSize = 20 }: ActivityQuery, self = false) =>
  remoteOr<Page<ActivityEvent>>(
    'activity',
    () => requestJson<Page<ActivityEvent>>('GET', `${activityPath(userId, self)}${toQuery({ type, date_from: from, date_to: to, page, page_size: pageSize })}`, undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const all = readEvents()
          .filter((event) => (!userId || event.userId === userId) && (!type || type === 'all' || event.type === type) && inRange(event.t, from, to))
          .sort((a, b) => b.t.localeCompare(a.t))
        return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, page, pageSize }
      }, 120, 260),
  )

/* ───────── dashboards (UC 4.3-4.8) ───────── */

export type StatsFilters = { from?: string; to?: string; city?: CityId | 'all'; category?: CategoryId | 'all' }
export type Kpi = { id: string; value: number }
export type SeriesPoint = { date: string; created: number; edited: number; replans: number }
export type PlaceCount = { poiId: string; name: string; cat: CategoryId; trips: number; saves: number; reports: number }
export type Stats = {
  kpis: Kpi[]
  series: SeriesPoint[]
  places: PlaceCount[]
  categories: { cat: CategoryId; count: number }[]
  cities: { city: CityId; count: number }[]
  funnel: { suggested: number; accepted: number; dismissed: number; auto: number }
}


function computeStats(filters: StatsFilters, scope?: Set<string>): Stats {
  const { from, to } = filters
  const city = filters.city && filters.city !== 'all' ? filters.city : undefined
  const category = filters.category && filters.category !== 'all' ? filters.category : undefined
  const keepPoi = (id: string) => !!poiById[id] && (!scope || scope.has(id)) && (!category || poiById[id].cat === category) && (!city || poiById[id].city === city)
  const trips = readAllTrips().filter((trip) => inRange(trip.createdAt, from, to) && (!city || trip.city === city))
  const events = readEvents().filter((event) => inRange(event.t, from, to) && (!city || !event.city || event.city === city))
  const sets = readAllSets()
  const favourites = Object.values(readStore<Record<string, Profile>>('journie-profiles-v1', {})).flatMap((profile) => profile.saved ?? [])
  const reports = readStore<{ poiId: string; at: string }[]>('journie-poi-reports-v1', []).filter((r) => inRange(r.at, from, to))

  const places = new Map<string, PlaceCount>()
  const bump = (poiId: string, key: 'trips' | 'saves' | 'reports') => {
    if (!keepPoi(poiId)) return
    const poi = poiById[poiId]
    const row = places.get(poiId) ?? { poiId, name: poi.name, cat: poi.cat, trips: 0, saves: 0, reports: 0 }
    row[key] += 1
    places.set(poiId, row)
  }
  for (const trip of trips) for (const id of new Set(trip.days.flatMap((day) => day.stops.map((stop) => stop.poiId)))) bump(id, 'trips')
  for (const set of sets) for (const id of set.poiIds) bump(id, 'saves')
  for (const id of favourites) bump(id, 'saves')
  for (const report of reports) bump(report.poiId, 'reports')

  const series = new Map<string, SeriesPoint>()
  const point = (date: string) => series.get(date) ?? { date, created: 0, edited: 0, replans: 0 }
  for (const event of events) {
    const p = point(localDay(event.t))
    if (event.type === 'trip_created') p.created += 1
    else if (event.type === 'trip_edited') p.edited += 1
    else if (event.type.startsWith('replan_')) p.replans += 1
    else continue
    series.set(p.date, p)
  }
  const count = (type: AnalyticsEvent['type']) => events.filter((event) => event.type === type).length
  const categories = new Map<CategoryId, number>()
  for (const row of places.values()) categories.set(row.cat, (categories.get(row.cat) ?? 0) + row.trips)
  const cities = new Map<CityId, number>()
  for (const trip of trips) cities.set(trip.city, (cities.get(trip.city) ?? 0) + 1)
  const accounts = readAccounts().filter((a) => a.role === 'traveler')

  return {
    kpis: scope
      ? [
          { id: 'places', value: scope.size },
          { id: 'inclusions', value: [...places.values()].reduce((s, r) => s + r.trips, 0) },
          { id: 'saves', value: [...places.values()].reduce((s, r) => s + r.saves, 0) },
          { id: 'opens', value: events.filter((e) => e.type === 'poi_opened' && e.poiId && scope.has(e.poiId)).length },
          { id: 'reports', value: [...places.values()].reduce((s, r) => s + r.reports, 0) },
        ]
      : [
          { id: 'users', value: accounts.length },
          { id: 'trips', value: trips.length },
          { id: 'live', value: trips.filter((trip) => trip.status === 'live').length },
          { id: 'replans', value: count('replan_suggested') + count('replan_auto') },
          { id: 'searches', value: count('search') },
          { id: 'sets', value: sets.length },
        ],
    series: [...series.values()].sort((a, b) => a.date.localeCompare(b.date)),
    places: [...places.values()],
    categories: [...categories.entries()].filter(([, n]) => n > 0).map(([cat, n]) => ({ cat, count: n })),
    cities: [...cities.entries()].map(([c, n]) => ({ city: c, count: n })),
    funnel: { suggested: count('replan_suggested'), accepted: count('replan_accepted'), dismissed: count('replan_dismissed'), auto: count('replan_auto') },
  }
}

const statsQuery = (filters: StatsFilters) => toQuery({ date_from: filters.from, date_to: filters.to, city: filters.city, category: filters.category })

/** A partial answer still draws: a list the server left out is empty, a count it left out is 0. */
const fullStats = (stats: Partial<Stats> | null | undefined): Stats => ({
  kpis: stats?.kpis ?? [],
  series: stats?.series ?? [],
  places: stats?.places ?? [],
  categories: stats?.categories ?? [],
  cities: stats?.cities ?? [],
  funnel: { suggested: 0, accepted: 0, dismissed: 0, auto: 0, ...stats?.funnel },
})

export const getAdminStats = (filters: StatsFilters) =>
  remoteOr<Stats>('admin-stats', () => requestJson<Partial<Stats> | null>('GET', `/admin/stats${statsQuery(filters)}`, undefined, CRUD_TIMEOUT_MS).then(fullStats), () => latency(() => computeStats(filters), 200, 400))

/** UC 4.4: only the caller's own places count (`GET /business/stats`). */
export const getBusinessStats = (filters: StatsFilters, placeIds: string[]) =>
  remoteOr<Stats>('business-stats', () => requestJson<Partial<Stats> | null>('GET', `/business/stats${statsQuery(filters)}`, undefined, CRUD_TIMEOUT_MS).then(fullStats), () => latency(() => computeStats(filters, new Set(placeIds)), 200, 400))

/** UC 4.7: the backend builds the file with the current filters; `null` means build it here from the rows on screen. */
export const exportReport = (scope: 'admin' | 'business', filters: StatsFilters) =>
  remoteOr<Blob | null>(
    `${scope}-export`,
    async () => {
      const file = await requestJson<{ url: string }>('GET', `/${scope}/report${statsQuery(filters)}${statsQuery(filters) ? '&' : '?'}format=csv`, undefined, CRUD_TIMEOUT_MS)
      const response = await fetch(file.url)
      if (!response.ok) throw new ApiError(`http-${response.status}`, response.statusText, response.status)
      // A relative link lands on this site, whose catch-all answers 200 with the app's own index.html: that is no report
      if (response.headers.get('content-type')?.includes('text/html')) throw new ApiError('report-not-a-file', 'The report link returned a web page', response.status)
      return response.blob()
    },
    () => null,
  )

/* ───────── business places (UC 4.4) ───────── */

const OWNED_KEY = 'journie-business-places-v1'

/** The places a business manages (`GET/PUT /business/places`); on the device the business picks them itself. */
export const listOwnedPlaces = (businessId: string) =>
  remoteOr<string[]>('business-places', () => requestJson<string[]>('GET', '/business/places', undefined, CRUD_TIMEOUT_MS), () => latency(() => readStore<Record<string, string[]>>(OWNED_KEY, {})[businessId] ?? [], 80, 160))

export const setOwnedPlaces = (businessId: string, poiIds: string[]) =>
  remoteOr<string[]>(
    'business-places',
    () => requestJson<string[]>('PUT', '/business/places', { poi_ids: poiIds }, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        writeStore(OWNED_KEY, { ...readStore<Record<string, string[]>>(OWNED_KEY, {}), [businessId]: poiIds })
        return poiIds
      }, 150, 300),
  )

/* ───────── itinerary data and training (UC 4.1, 4.2) ───────── */

export type ItineraryRow = { id: string; userId: string; userName: string; city: CityId; days: number; stops: number; budget: number; status: Trip['status']; createdAt: string }

export const listItineraries = (filters: StatsFilters) =>
  remoteOr<ItineraryRow[]>(
    'admin-itineraries',
    () => requestJson<ItineraryRow[]>('GET', `/admin/itineraries${statsQuery(filters)}`, undefined, CRUD_TIMEOUT_MS),
    () =>
      latency(() => {
        const names = new Map(readAccounts().map((a) => [a.id, a.name]))
        return readAllTrips()
          .filter((trip) => inRange(trip.createdAt, filters.from, filters.to) && (!filters.city || filters.city === 'all' || trip.city === filters.city))
          .map((trip) => ({ id: trip.id, userId: trip.userId, userName: names.get(trip.userId) ?? trip.userId, city: trip.city, days: trip.days.length, stops: trip.days.reduce((n, d) => n + d.stops.length, 0), budget: trip.budget, status: trip.status, createdAt: trip.createdAt }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }, 200, 400),
  )

export type TrainingJob = { id: string; status: 'queued' | 'running' | 'succeeded' | 'failed'; progress: number; modelVersion?: string; metrics?: Record<string, number>; error?: string; startedAt: string; finishedAt?: string }

/** UC 4.2 has no device stand-in: a model can only be trained by the backend, so a missing route is reported as such. */
export const startTraining = () => requestJson<TrainingJob>('POST', '/admin/train', {}, CRUD_TIMEOUT_MS)
export const getTrainingJob = (id: string) => requestJson<TrainingJob>('GET', `/admin/train/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS)
export const listTrainingJobs = () => requestJson<TrainingJob[]>('GET', '/admin/train', undefined, CRUD_TIMEOUT_MS)
