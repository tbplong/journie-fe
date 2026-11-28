import { useMemo, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import type { Phase, Weather } from '../../store/weatherStore'
import { Di } from './Di'
import { MascotContext, type FocusPoint, type MascotControl, type MascotMood } from './mascot-context'

/** Journie outside the auth form: a fixed mood, still tracking the pointer, blinking and dressing for the sky. */
export function DiAvatar({ mood = 'idle', className = '', phase, weather, trail = true, energy, roll, pointAt = null }: { mood?: MascotMood; className?: string; phase?: Phase; weather?: Weather; trail?: boolean; energy?: MotionValue<number>; roll?: MotionValue<number>; pointAt?: FocusPoint | null }) {
  const originRef = useRef<HTMLDivElement | null>(null)
  const value = useMemo<MascotControl>(
    () => ({ mood, setMood: () => undefined, focusPoint: null, setFocusPoint: () => undefined, pointAt, errorTick: 0, originRef }),
    [mood, pointAt],
  )
  return (
    <MascotContext.Provider value={value}>
      <Di className={className} phase={phase} weather={weather} trail={trail} energy={energy} roll={roll} />
    </MascotContext.Provider>
  )
}
