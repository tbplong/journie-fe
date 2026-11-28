import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Journie's preference: whether it points at the control under the pointer (it always looks toward the pointer). */
type MascotPrefs = {
  point: boolean
  setPoint: (point: boolean) => void
}

export const useMascotPrefs = create<MascotPrefs>()(
  persist(
    (set) => ({
      point: true,
      setPoint: (point) => set({ point }),
    }),
    { name: 'journie-di-prefs', version: 2, partialize: (state) => ({ point: state.point }) },
  ),
)
