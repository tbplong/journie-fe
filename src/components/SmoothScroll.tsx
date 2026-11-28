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

    // The frame loop sleeps once scrolling settles and wakes on any input that can scroll.
    let active = false
    let idle = 0
    const update = ({ timestamp }: { timestamp: number }) => {
      lenis.raf(timestamp)
      if (lenis.isScrolling) {
        idle = 0
      } else if (++idle > 30) {
        cancelFrame(update)
        active = false
      }
    }
    const wake = () => {
      idle = 0
      if (active) return
      active = true
      // Reset Lenis' clock so the first frame after a sleep does not see a huge delta.
      lenis.raf(performance.now())
      frame.update(update, true)
    }

    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'click', 'hashchange'] as const
    for (const name of events) window.addEventListener(name, wake, { passive: true, capture: true })
    window.addEventListener('scroll', wake, { passive: true })
    wake()

    return () => {
      for (const name of events) window.removeEventListener(name, wake, { capture: true })
      window.removeEventListener('scroll', wake)
      cancelFrame(update)
      lenis.destroy()
    }
  }, [])

  return null
}
