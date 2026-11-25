import { useCallback, useRef, useState } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { useLight } from './light-context'

/**
 * Hidden things that wake up when the torch's light falls on them. Each spot watches the distance
 * between its own centre and the light, and flips `lit` only when that crosses a threshold, so React
 * renders on the few frames that matter instead of every frame the light moves.
 */
export function useLit(radius = 130) {
  const { on, x, y } = useLight()
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    if (box.width === 0) return
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const hit = Math.hypot(x.get() - cx, y.get() - cy) < radius + Math.max(box.width, box.height) * 0.3
    setNear((prev) => (prev === hit ? prev : hit))
  }, [radius, x, y])
  useMotionValueEvent(x, 'change', check)
  useMotionValueEvent(y, 'change', check)
  return { ref, lit: on && near, on }
}
