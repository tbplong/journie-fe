import type { PointerEvent, ReactNode } from 'react'
import { motion, useSpring } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'

type Props = {
  children: ReactNode
  className?: string
  /** Maximum rotation in degrees. */
  max?: number
}

/** 3D card tilt with a light glare that tracks the cursor. */
export function Tilt({ children, className = '', max = 6 }: Props) {
  const { canPointerFx } = useMotionPrefs()
  const rotateX = useSpring(0, { stiffness: 160, damping: 18, mass: 0.5 })
  const rotateY = useSpring(0, { stiffness: 160, damping: 18, mass: 0.5 })

  if (!canPointerFx) return <div className={className}>{children}</div>

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height

    rotateY.set((px - 0.5) * 2 * max)
    rotateX.set(-(py - 0.5) * 2 * max)
    event.currentTarget.style.setProperty('--mx', `${px * 100}%`)
    event.currentTarget.style.setProperty('--my', `${py * 100}%`)
  }

  const reset = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.div
      className={`tilt ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      {children}
      <span aria-hidden="true" className="tilt-glare" />
    </motion.div>
  )
}
