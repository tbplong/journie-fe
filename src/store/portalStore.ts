import { create } from 'zustand'

export type PortalPhase = 'idle' | 'closing' | 'opening'

type PortalState = {
  phase: PortalPhase
  to: string
  origin: { x: number; y: number }
  /** Start the page transition toward `to`, growing from a screen position. */
  open: (to: string, origin?: { x: number; y: number }) => void
  setPhase: (phase: PortalPhase) => void
}

export const usePortalStore = create<PortalState>((set, get) => ({
  phase: 'idle',
  to: '/',
  origin: { x: 0, y: 0 },
  open: (to, origin) => {
    if (get().phase !== 'idle') return
    set({
      phase: 'closing',
      to,
      origin: origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    })
  },
  setPhase: (phase) => set({ phase }),
}))
