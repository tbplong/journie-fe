import { useCallback, useEffect, useRef } from 'react'
import { useMascot } from '../mascot/mascot-context'

/**
 * Wires an input to Journie: it looks along the text while you type, and covers its eyes
 * (or peeks, when the lamp reveals the password) on secret fields.
 */
export function useMascotField(kind: 'text' | 'secret', revealed = false) {
  const { setMood, setFocusPoint } = useMascot()
  const ref = useRef<HTMLInputElement>(null)
  const focused = useRef(false)
  const mood = kind === 'secret' ? (revealed ? 'peeking' : 'hiding') : 'watching'

  const track = useCallback(() => {
    const el = ref.current
    if (!el || !focused.current) return
    const rect = el.getBoundingClientRect()
    setFocusPoint({
      x: rect.left + Math.min(rect.width - 28, 30 + el.value.length * 8.6),
      y: rect.top + rect.height / 2,
    })
  }, [setFocusPoint])

  useEffect(() => {
    if (!focused.current) return
    setMood(mood)
    track()
  }, [mood, setMood, track])

  return {
    ref,
    track,
    onFocus: () => {
      focused.current = true
      setMood(mood)
      track()
    },
    onBlur: () => {
      focused.current = false
      setMood('idle')
      setFocusPoint(null)
    },
  }
}
