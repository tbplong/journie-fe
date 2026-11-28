import { createContext, useContext } from 'react'
import type { MotionValue } from 'motion/react'

export type LightControl = {
  on: boolean
  setOn: (on: boolean) => void
  /** Soft-follow position of the light in viewport pixels. */
  x: MotionValue<number>
  y: MotionValue<number>
  /** Where the light should go next (the pointer overrides this as soon as it moves). */
  aimAt: (x: number, y: number) => void
}

export const LightContext = createContext<LightControl | null>(null)

export function useLight() {
  const value = useContext(LightContext)
  if (!value) throw new Error('useLight must be used inside the auth shell')
  return value
}
