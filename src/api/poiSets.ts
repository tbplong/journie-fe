import { poiById } from '../domain/pois'
import { loadPlaces } from './catalog'
import { ApiError, CRUD_TIMEOUT_MS, latency, readStore, remoteOr, requestJson, writeStore } from './http'

/**
 * Named POI sets (Module 01, UC 1.6 and 1.11-1.16): `GET/POST /poi-sets`, `GET/PATCH/DELETE /poi-sets/{id}`,
 * `POST /poi-sets/{id}/restore`, `POST /poi-sets/{id}/items` and `DELETE /poi-sets/{id}/items/{poi_id}`. The backend has none
 * of them yet, so the sets live in this browser until it does.
 */
export type PoiSet = {
  id: string
  userId: string
  name: string
  description: string
  /** In the traveler's order. */
  poiIds: string[]
  createdAt: string
  updatedAt: string
}

type PoiSetDto = { id: string; user_id: string; name: string; description: string; poi_ids: string[]; created_at: string; updated_at: string }
const fromDto = (dto: PoiSetDto): PoiSet => ({ id: dto.id, userId: dto.user_id, name: dto.name, description: dto.description, poiIds: dto.poi_ids, createdAt: dto.created_at, updatedAt: dto.updated_at })

export const SET_NAME_MAX = 60
export const SET_MAX_ITEMS = 100

type Stored = PoiSet & { deletedAt?: string }
const KEY = 'journie-poi-sets-v1'
const read = () => readStore<Stored[]>(KEY, [])
const write = (sets: Stored[]) => writeStore(KEY, sets)
const alive = (userId: string) => read().filter((set) => set.userId === userId && !set.deletedAt)

const now = () => new Date().toISOString()

function checkName(userId: string, name: string, exceptId?: string) {
  const clean = name.trim()
  if (!clean) throw new ApiError('set-name-required', 'A set needs a name')
  if (clean.length > SET_NAME_MAX) throw new ApiError('set-name-too-long', 'The name is too long')
  if (alive(userId).some((set) => set.id !== exceptId && set.name.trim().toLowerCase() === clean.toLowerCase())) throw new ApiError('set-name-taken', 'Another set has this name')
  return clean
}

function checkPois(ids: string[]) {
  const unique = [...new Set(ids)]
  if (unique.some((id) => !poiById[id])) throw new ApiError('poi-not-found', 'A place is not in the data')
  if (unique.length > SET_MAX_ITEMS) throw new ApiError('set-full', 'A set holds at most 100 places')
  return unique
}

function mutate(userId: string, id: string, change: (set: Stored) => Stored): PoiSet {
  const list = read()
  const set = list.find((entry) => entry.id === id && entry.userId === userId && !entry.deletedAt)
  if (!set) throw new ApiError('set-not-found', 'No such set')
  const next = { ...change(set), updatedAt: now() }
  write(list.map((entry) => (entry.id === id ? next : entry)))
  return next
}

const byUpdate = (a: PoiSet, b: PoiSet) => b.updatedAt.localeCompare(a.updatedAt)

export const listSets = (userId: string) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto[]>('GET', '/poi-sets', undefined, CRUD_TIMEOUT_MS).then((list) => list.map(fromDto).sort(byUpdate)),
    () => latency(() => alive(userId).sort(byUpdate), 150, 320),
  ).then(async (sets) => {
    await loadPlaces(sets.flatMap((set) => set.poiIds))
    return sets
  })

export const getSet = (userId: string, id: string) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto>('GET', `/poi-sets/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(() => {
        const set = alive(userId).find((entry) => entry.id === id)
        if (!set) throw new ApiError('set-not-found', 'No such set')
        return set
      }, 120, 260),
  ).then(async (set) => {
    await loadPlaces(set.poiIds)
    return set
  })

export type NewSet = { userId: string; name: string; description?: string; poiIds: string[] }

export const createSet = ({ userId, name, description = '', poiIds }: NewSet) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto>('POST', '/poi-sets', { name: name.trim(), description: description.trim(), poi_ids: [...new Set(poiIds)] }, CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(() => {
        const set: Stored = { id: `set-${Date.now().toString(36)}`, userId, name: checkName(userId, name), description: description.trim(), poiIds: checkPois(poiIds), createdAt: now(), updatedAt: now() }
        write([...read(), set])
        return set as PoiSet
      }, 220, 420),
  )

export type SetPatch = { userId: string; id: string; name?: string; description?: string; poiIds?: string[] }

/** Rename, describe or reorder (`PATCH /poi-sets/{id}`); `poiIds` replaces the whole order. */
export const updateSet = ({ userId, id, name, description, poiIds }: SetPatch) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto>('PATCH', `/poi-sets/${encodeURIComponent(id)}`, { name: name?.trim(), description: description?.trim(), poi_ids: poiIds }, CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(
        () =>
          mutate(userId, id, (set) => ({
            ...set,
            name: name === undefined ? set.name : checkName(userId, name, id),
            description: description === undefined ? set.description : description.trim(),
            poiIds: poiIds === undefined ? set.poiIds : checkPois(poiIds),
          })),
        150,
        300,
      ),
  )

/** Adding is idempotent: places already in the set are skipped, not doubled. */
export const addToSet = (userId: string, id: string, poiIds: string[]) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto>('POST', `/poi-sets/${encodeURIComponent(id)}/items`, { poi_ids: poiIds }, CRUD_TIMEOUT_MS).then(fromDto),
    () => latency(() => mutate(userId, id, (set) => ({ ...set, poiIds: checkPois([...set.poiIds, ...poiIds]) })), 150, 300),
  )

export const removeFromSet = (userId: string, id: string, poiId: string) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto>('DELETE', `/poi-sets/${encodeURIComponent(id)}/items/${encodeURIComponent(poiId)}`, undefined, CRUD_TIMEOUT_MS).then(fromDto),
    () => latency(() => mutate(userId, id, (set) => ({ ...set, poiIds: set.poiIds.filter((entry) => entry !== poiId) })), 120, 260),
  )

/** Soft delete, so "Undo" can bring the set back (`POST /poi-sets/{id}/restore`). */
export const deleteSet = (userId: string, id: string) =>
  remoteOr(
    'poi-sets',
    () => requestJson<void>('DELETE', `/poi-sets/${encodeURIComponent(id)}`, undefined, CRUD_TIMEOUT_MS).then(() => id),
    () =>
      latency(() => {
        mutate(userId, id, (set) => ({ ...set, deletedAt: now() }))
        return id
      }, 150, 300),
  )

export const restoreSet = (userId: string, id: string) =>
  remoteOr(
    'poi-sets',
    () => requestJson<PoiSetDto>('POST', `/poi-sets/${encodeURIComponent(id)}/restore`, {}, CRUD_TIMEOUT_MS).then(fromDto),
    () =>
      latency(() => {
        const list = read()
        const set = list.find((entry) => entry.id === id && entry.userId === userId)
        if (!set) throw new ApiError('set-not-found', 'No such set')
        checkName(userId, set.name, id)
        const back = { ...set, deletedAt: undefined, updatedAt: now() }
        write(list.map((entry) => (entry.id === id ? back : entry)))
        return back as PoiSet
      }, 150, 300),
  )

/** Every set kept in this browser, for the business and admin counts. */
export const readAllSets = () => read().filter((set) => !set.deletedAt)
export const deleteSetsOf = (userId: string) => write(read().filter((set) => set.userId !== userId))

/** What to tell the traveler when a set call failed: [Vietnamese, English]. */
export function setErrorText(error: unknown): [string, string] {
  const code = error instanceof ApiError ? error.code : ''
  if (code === 'set-name-required') return ['Đặt tên cho bộ sưu tập nhé.', 'Give the set a name.']
  if (code === 'set-name-too-long') return [`Tên dài tối đa ${SET_NAME_MAX} ký tự.`, `Names are up to ${SET_NAME_MAX} characters.`]
  if (code === 'set-name-taken') return ['Bạn đã có bộ sưu tập trùng tên này.', 'You already have a set with this name.']
  if (code === 'set-full') return [`Mỗi bộ sưu tập chứa tối đa ${SET_MAX_ITEMS} nơi.`, `A set holds up to ${SET_MAX_ITEMS} places.`]
  if (code === 'poi-not-found') return ['Có nơi không còn trong dữ liệu.', 'A place is no longer in the data.']
  if (code === 'set-not-found') return ['Bộ sưu tập này không còn nữa.', 'This set no longer exists.']
  return ['Chưa lưu được, thử lại nhé.', 'Could not save, try again.']
}
