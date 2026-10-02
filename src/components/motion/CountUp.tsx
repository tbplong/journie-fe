import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'

type Props = {
  value: number
  format: (value: number) => string
  duration?: number
  className?: string
}

/** Counts up to `value` the first time it scrolls into view. */
export function CountUp({ value, format, duration = 1.6, className }: Props) {
  const { reduced } = useMotionPrefs()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const progress = useMotionValue(0)
  const text = useTransform(progress, (latest) => format(latest * value))

  useEffect(() => {
    if (!inView || reduced) return
    const controls = animate(progress, 1, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, reduced, progress, duration])

  if (reduced) return <span className={className}>{format(value)}</span>

  return (
    <motion.span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      {text}
    </motion.span>
  )
}
