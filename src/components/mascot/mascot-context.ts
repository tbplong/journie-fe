import { createContext, useContext } from 'react'

export type MascotMood = 'idle' | 'watching' | 'hiding' | 'peeking' | 'thinking' | 'error' | 'joy' | 'sleepy' | 'wave' | 'hungry' | 'hot'

export type FocusPoint = { x: number; y: number }

export type MascotControl = {
  mood: MascotMood
  setMood: (mood: MascotMood) => void
  /** Screen position Journie should look at while a field has focus (null = follow the pointer). */
  focusPoint: FocusPoint | null
  setFocusPoint: (point: FocusPoint | null) => void
  /** Screen position of something Journie should point at (the control under the pointer); null = arms at rest. */
  pointAt?: FocusPoint | null
  /** Bumps whenever something goes wrong, so Journie can shake its head again. */
  errorTick: number
  /** Where Journie stands on screen; the portal transition grows from here. */
  originRef: { current: HTMLDivElement | null }
}

export const MascotContext = createContext<MascotControl | null>(null)

export function useMascot() {
  const value = useContext(MascotContext)
  if (!value) throw new Error('useMascot must be used inside a MascotContext provider')
  return value
}
