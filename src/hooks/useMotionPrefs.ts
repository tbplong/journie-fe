import { useReducedMotion, useTransform, type MotionValue } from 'motion/react'

export function useMotionPrefs() {
  const reduced = useReducedMotion() ?? false
  const canHover =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

  return { reduced, canHover, canPointerFx: !reduced && canHover }
}

/** Scroll-linked parallax that collapses to a static value under reduced motion. */
export function useParallax(progress: MotionValue<number>, from: number, to: number) {
  const { reduced } = useMotionPrefs()
  return useTransform(progress, [0, 1], reduced ? [0, 0] : [from, to])
}
