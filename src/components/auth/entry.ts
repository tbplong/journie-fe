import { createContext, useContext, useEffect, useState } from 'react'
import { stagger, type Variants } from 'motion/react'
import { EASE_OUT, riseItem } from '../motion/variants'

/** `arrive`: the auth card is new on screen. `switch`: sign-in and sign-up swapped places, so the card stays put. */
export type AuthEntry = 'arrive' | 'switch'

export const AuthEntryContext = createContext<AuthEntry>('arrive')

let live = 0
let leftAt = Number.NEGATIVE_INFINITY

/** Login and register are separate routes, so the shell remounts between them; this tells a fresh visit from a swap. */
export function useAuthArrival(): AuthEntry {
  const [entry] = useState<AuthEntry>(() => (live > 0 || performance.now() - leftAt < 1500 ? 'switch' : 'arrive'))
  useEffect(() => {
    live += 1
    return () => {
      live -= 1
      leftAt = performance.now()
    }
  }, [])
  return entry
}

export const formStagger: Record<AuthEntry, Variants> = {
  arrive: { hidden: {}, show: { transition: { delayChildren: stagger(0.04, { startDelay: 0.12 }) } } },
  switch: { hidden: {}, show: { transition: { delayChildren: stagger(0.045, { startDelay: 0.04 }) } } },
}

const fromLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

const fromRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

/** Variants for one row of an auth form: rises on a fresh visit, slides in from `side` on a swap. */
export function useAuthItem(side: 'left' | 'right'): Variants {
  const entry = useContext(AuthEntryContext)
  if (entry === 'arrive') return riseItem
  return side === 'left' ? fromLeft : fromRight
}

export function useAuthEntry() {
  return useContext(AuthEntryContext)
}
