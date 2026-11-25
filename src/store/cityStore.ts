import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CityId } from '../domain/types'

/** The city the traveler is looking at. Discover, the dashboard picks, the sky and a new plan follow it; it is kept for the next visit. */
type CityState = {
  city: CityId
  /** How many times the traveler picked a city since the page loaded, the same one again included (not kept). */
  picks: number
  setCity: (city: CityId) => void
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      city: 'sai-gon',
      picks: 0,
      setCity: (city) => set((state) => ({ city, picks: state.picks + 1 })),
    }),
    { name: 'journie-city', version: 1, partialize: (state) => ({ city: state.city }) },
  ),
)
