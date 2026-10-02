import type { PointerEvent, ReactNode } from 'react'
import { motion, useSpring } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'

type Props = {
  children: ReactNode
  className?: string
  strength?: number
}

/** Pulls its child gently toward the cursor. Pointer-only; inert on touch and reduced motion. */
export function Magnetic({ children, className = '', strength = 0.3 }: Props) {
  const { canPointerFx } = useMotionPrefs()
  const x = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 })
  const y = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 })

  if (!canPointerFx) return <div className={className}>{children}</div>

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      className={className}
      style={{ x, y }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  )
}
