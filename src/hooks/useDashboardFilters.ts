import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { StatsFilters } from '../api/admin'
import type { CategoryId, CityId } from '../domain/types'

export type SortDir = 'asc' | 'desc'

/** Dashboard filters live in the address (UC 4.6), so a filtered view can be reloaded, shared or bookmarked. */
export function useDashboardFilters(defaultSort = 'trips') {
  const [params, setParams] = useSearchParams()
  const filters = useMemo<StatsFilters>(
    () => ({
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
      city: (params.get('city') as CityId | null) ?? 'all',
      category: (params.get('cat') as CategoryId | null) ?? 'all',
    }),
    [params],
  )
  const sort = params.get('sort') ?? defaultSort
  const dir: SortDir = params.get('dir') === 'asc' ? 'asc' : 'desc'

  const set = useCallback(
    (patch: Record<string, string | undefined>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch)) {
            if (!value || value === 'all') next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const toggleSort = useCallback((key: string) => set({ sort: key, dir: sort === key && dir === 'desc' ? 'asc' : 'desc' }), [set, sort, dir])

  return { filters, sort, dir, set, toggleSort, reset: () => setParams(new URLSearchParams(), { replace: true }) }
}
