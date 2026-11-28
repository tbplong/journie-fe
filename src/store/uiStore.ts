import { create } from 'zustand'
import type { CategoryId } from '../domain/types'
import type { PriceTier } from '../api/places'

/**
 * Transient interaction state (report §5.2.3): selected day, hovered stop, which panel is open and
 * the discovery filters. Server data lives in TanStack Query, never here.
 */
type UiState = {
  activeDay: number
  activeUid: string | null
  setActiveDay: (day: number) => void
  setActiveUid: (uid: string | null) => void

  /** True while a full-screen waiting view has its own Journie, so the corner companion hides. */
  busyScreen: boolean
  setBusyScreen: (value: boolean) => void

  poiSheet: string | null
  openPoi: (id: string | null) => void
  /** How many pages' place sheets are mounted right now, so the assistant brings its own only where none is. */
  pageSheets: number
  /** Counts a page's place sheet while it is mounted; returns the call that stops counting it. */
  mountPageSheet: () => () => void

  /** Places waiting to be put in a set (UC 1.16); the chooser is open while this holds any. */
  setChooser: string[] | null
  openSetChooser: (poiIds: string[] | null) => void

  discover: {
    query: string
    categories: CategoryId[]
    prices: PriceTier[]
    indoorOnly: boolean
    sort: 'relevance' | 'quality' | 'price' | 'distance'
    view: 'list' | 'map'
  }
  setDiscover: (patch: Partial<UiState['discover']>) => void
  resetDiscover: () => void
}

const discoverDefaults: UiState['discover'] = {
  query: '',
  categories: [],
  prices: [],
  indoorOnly: false,
  sort: 'relevance',
  view: 'list',
}

export const useUiStore = create<UiState>((set) => ({
  activeDay: 0,
  activeUid: null,
  setActiveDay: (activeDay) => set({ activeDay, activeUid: null }),
  setActiveUid: (activeUid) => set({ activeUid }),

  busyScreen: false,
  setBusyScreen: (busyScreen) => set({ busyScreen }),

  poiSheet: null,
  openPoi: (poiSheet) => set({ poiSheet }),
  pageSheets: 0,
  mountPageSheet: () => {
    set((state) => ({ pageSheets: state.pageSheets + 1 }))
    return () => set((state) => ({ pageSheets: Math.max(0, state.pageSheets - 1) }))
  },

  setChooser: null,
  openSetChooser: (setChooser) => set({ setChooser: setChooser?.length ? setChooser : null }),

  discover: discoverDefaults,
  setDiscover: (patch) => set((state) => ({ discover: { ...state.discover, ...patch } })),
  resetDiscover: () => set({ discover: discoverDefaults }),
}))
