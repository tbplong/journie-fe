import { useEffect } from 'react'
import { cancelFrame, frame } from 'motion/react'
import Lenis from 'lenis'

/**
 * Inertial page scroll. Lenis is driven by motion's frame loop, so scroll position and
 * scroll-linked animation update in the same frame instead of racing two rAF loops.
 * Skipped entirely when the visitor prefers reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      wheelMultiplier: 1,
      anchors: true,
    })

    const update = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp)
    frame.update(update, true)

    return () => {
      cancelFrame(update)
      lenis.destroy()
    }
  }, [])

  return null
}
