import type { Variants } from 'motion/react'

/** The house ease-out: quick start, long soft landing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Rise-and-settle used by every <StaggerItem>; also usable as `variants` on any motion element inside a <Stagger>. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
}

/** Fades and slides in from the side; for rows, chips and side panels. */
export const slideItem: Variants = {
  hidden: { opacity: 0, x: -22 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

/** Pops in with a small overshoot; for badges, pins and icons. */
export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 22 } },
}
