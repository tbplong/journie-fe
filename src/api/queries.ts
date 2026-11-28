import { queryOptions, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CityId, Trip } from '../domain/types'
import { useTr } from '../hooks/useTr'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import { track } from './analytics'
import { ApiError } from './http'
import { createTrip, deleteTrip, getTrip, isSaving, listTrips, saveTripInTurn } from './trips'
import { nameTrip, tripTitle } from '../domain/tripText'
import { tripCovers } from '../domain/tripCover'
import { getProfile, saveProfile, type Profile } from './profile'
import { loadCatalog } from './catalog'
import { addToSet, createSet, deleteSet, getSet, listSets, removeFromSet, restoreSet, setErrorText, updateSet, type NewSet, type PoiSet, type SetPatch } from './poiSets'
import { listModules, type ModuleId } from './admin'
import { listInbox } from './notifications'

/** The itinerary snapshot the data collection keeps (UC 4.1): size and places, without the traveler's own words. */
const snapshot = (trip: Trip) => ({ tripId: trip.id, city: trip.city, days: trip.days.length, stops: trip.days.reduce((n, d) => n + d.stops.length, 0), budget: trip.budget, poiIds: trip.days.flatMap((d) => d.stops.map((s) => s.poiId)) })

export const keys = {
  trips: (userId: string) => ['trips', userId] as const,
  trip: (id: string) => ['trip', id] as const,
  profile: (userId: string) => ['profile', userId] as const,
  catalog: (city: CityId) => ['catalog', city] as const,
  sets: (userId: string) => ['sets', userId] as const,
  set: (id: string) => ['set', id] as const,
  modules: ['modules'] as const,
  inbox: (userId: string) => ['inbox', userId] as const,
}

const useUserId = () => useAuthStore((state) => state.user?.id ?? '')

export function useTrips() {
  const userId = useUserId()
  return useQuery({ queryKey: keys.trips(userId), queryFn: () => listTrips(userId), enabled: !!userId })
}

export function useTrip(id: string | undefined) {
  const userId = useUserId()
  return useQuery({ queryKey: keys.trip(id ?? ''), queryFn: () => getTrip(id!, userId), enabled: !!id && !!userId, retry: false })
}

/** Per trip, while its saves are on their way: the copy last saved, which the screen goes back to if one fails. */
const lastSaved = new Map<string, Trip | undefined>()
/** A failed save also refuses the edits queued behind it; the traveler hears about it once. */
const reported = new WeakSet<Error>()

/** Saves a trip with an optimistic update, so drag-and-drop never waits on the network. Saves of one trip go out in turn. */
export function useSaveTrip() {
  const client = useQueryClient()
  const userId = useUserId()
  const { tr } = useTr()
  return useMutation({
    mutationFn: saveTripInTurn,
    onMutate: async (trip: Trip) => {
      await client.cancelQueries({ queryKey: keys.trip(trip.id) })
      if (!lastSaved.has(trip.id)) lastSaved.set(trip.id, client.getQueryData<Trip>(keys.trip(trip.id)))
      client.setQueryData(keys.trip(trip.id), trip)
    },
    onError: (error, trip) => {
      const previous = lastSaved.get(trip.id)
      if (lastSaved.delete(trip.id) && previous) client.setQueryData(keys.trip(trip.id), previous)
      if (reported.has(error)) return
      reported.add(error)
      const conflict = error instanceof ApiError && error.status === 409
      toast('danger', conflict ? tr('Lịch trình vừa được sửa ở nơi khác', 'The itinerary was changed elsewhere') : tr('Chưa lưu được thay đổi', 'Could not save the change'), conflict ? tr('Mình đã lấy lại bản mới nhất, sửa lại giúp mình nhé.', 'The latest version is back on screen; make the change again.') : tr('Lịch trình quay về bản trước đó.', 'The itinerary is back to how it was.'))
      if (conflict) client.invalidateQueries({ queryKey: keys.trip(trip.id) })
    },
    onSuccess: (saved) => {
      // A newer edit still on its way stays on screen; it is sent on top of this version
      if (isSaving(saved.id)) lastSaved.set(saved.id, saved)
      else {
        lastSaved.delete(saved.id)
        client.setQueryData(keys.trip(saved.id), saved)
      }
      client.invalidateQueries({ queryKey: keys.trips(userId) })
      if (saved.status !== 'draft') track({ type: 'trip_saved', ...snapshot(saved) })
    },
  })
}

export function useCreateTrip() {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    // A name Journie picks skips the ones this traveler already has, so two trips do not start with the same title.
    mutationFn: (trip: Trip) => {
      const taken = (client.getQueryData<Trip[]>(keys.trips(userId)) ?? []).flatMap((other) => [other.title, tripTitle(other, 'vi')])
      return createTrip(trip.autoTitle ? { ...trip, title: nameTrip(trip, taken) } : trip)
    },
    onSuccess: (trip) => {
      client.setQueryData(keys.trip(trip.id), trip)
      client.invalidateQueries({ queryKey: keys.trips(userId) })
      track({ type: 'trip_created', ...snapshot(trip) })
    },
  })
}

export function useDeleteTrip() {
  const client = useQueryClient()
  const userId = useUserId()
  const { tr } = useTr()
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.trips(userId) }),
    onError: () => toast('danger', tr('Chưa xoá được', 'Could not delete it'), tr('Lịch trình vẫn còn, thử lại sau nhé.', 'The itinerary is still there; try again shortly.')),
  })
}

/** Deletes several trips one after another and reports how many went; a failure does not stop the rest. */
export function useDeleteTrips() {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const failed: string[] = []
      for (const id of ids) {
        try {
          await deleteTrip(id)
        } catch {
          failed.push(id)
        }
      }
      return { deleted: ids.length - failed.length, failed }
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.trips(userId) }),
  })
}

export function useProfile() {
  const user = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: keys.profile(user?.id ?? ''),
    queryFn: () => getProfile(user!.id, user!.name),
    enabled: !!user,
  })
}

export function useSaveProfile() {
  const client = useQueryClient()
  const { tr } = useTr()
  return useMutation({
    mutationFn: saveProfile,
    onMutate: async (profile: Profile) => {
      const key = keys.profile(profile.userId)
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Profile>(key)
      client.setQueryData(key, profile)
      return { previous, key }
    },
    onError: (_error, _profile, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous)
      toast('danger', tr('Chưa lưu được hồ sơ', 'Could not save your profile'), tr('Thay đổi chưa được lưu, thử lại nhé.', 'The change was not saved; try again.'))
    },
  })
}

/**
 * Loads a city's places from the backend into the shared list; the number of that city's places is the data, so 0 once loaded means
 * the city has no data yet. Refreshed at most every six hours.
 */
export const catalogQuery = (city: CityId) => queryOptions({ queryKey: keys.catalog(city), queryFn: () => loadCatalog(city), staleTime: 6 * 60 * 60 * 1000, retry: 1 })
export const useCatalog = (city: CityId = 'sai-gon') => useQuery(catalogQuery(city))

/**
 * A trip's cover photo (`tripCovers`): its standout place, never one another of the traveler's trips already shows. Loads
 * the places of every city the trips are in, so each trip can use its own places' photos whichever city is picked.
 */
export function useTripCover(trip: Trip) {
  const { data: trips } = useTrips()
  const all = trips?.some((item) => item.id === trip.id) ? trips : [...(trips ?? []), trip]
  useQueries({ queries: [...new Set(all.map((item) => item.city))].map((city) => catalogQuery(city)) })
  return tripCovers(all)[trip.id]
}

/* ───────── POI sets (UC 1.6, 1.11-1.16) ───────── */

export function useSets() {
  const userId = useUserId()
  return useQuery({ queryKey: keys.sets(userId), queryFn: () => listSets(userId), enabled: !!userId })
}

export function useSet(id: string | undefined) {
  const userId = useUserId()
  return useQuery({ queryKey: keys.set(id ?? ''), queryFn: () => getSet(userId, id!), enabled: !!id && !!userId, retry: false })
}

/** Every set mutation refreshes the list and the one set, and reports a failure in the traveler's language. */
function useSetMutation<A>(run: (userId: string, args: A) => Promise<PoiSet | string>) {
  const client = useQueryClient()
  const userId = useUserId()
  const { tr } = useTr()
  return useMutation({
    mutationFn: (args: A) => run(userId, args),
    onSuccess: (result) => {
      if (typeof result !== 'string') client.setQueryData(keys.set(result.id), result)
      else client.removeQueries({ queryKey: keys.set(result) })
      client.invalidateQueries({ queryKey: keys.sets(userId) })
    },
    onError: (error) => toast('danger', tr('Chưa lưu được', 'Could not save'), tr(...setErrorText(error))),
  })
}

export const useCreateSet = () => useSetMutation((userId, input: Omit<NewSet, 'userId'>) => createSet({ ...input, userId }))
export const useUpdateSet = () => useSetMutation((userId, patch: Omit<SetPatch, 'userId'>) => updateSet({ ...patch, userId }))
export const useAddToSet = () => useSetMutation((userId, { id, poiIds }: { id: string; poiIds: string[] }) => addToSet(userId, id, poiIds))
export const useRemoveFromSet = () => useSetMutation((userId, { id, poiId }: { id: string; poiId: string }) => removeFromSet(userId, id, poiId))
export const useDeleteSet = () => useSetMutation((userId, id: string) => deleteSet(userId, id))
export const useRestoreSet = () => useSetMutation((userId, id: string) => restoreSet(userId, id))

/* ───────── modules (UC 6.3/6.4 seen from every page) ───────── */

export const useModules = () => useQuery({ queryKey: keys.modules, queryFn: listModules, staleTime: 60_000 })

/** False only once the modules are known and this one is switched off, so a page never flashes "disabled" while loading. */
export function useModuleEnabled(id: ModuleId) {
  const modules = useModules()
  return modules.data?.find((entry) => entry.id === id)?.enabled !== false
}

/* ───────── notifications from the system (UC 6.15) ───────── */

export function useInbox() {
  const userId = useUserId()
  return useQuery({ queryKey: keys.inbox(userId), queryFn: () => listInbox(userId), enabled: !!userId, refetchInterval: 60_000, refetchIntervalInBackground: false })
}
