import { AnimatePresence, motion } from 'motion/react'
import { useMotionPrefs } from '../hooks/useMotionPrefs'

/**
 * A destination's drawing (its poster's shapes in their own colours, without any text) at the foot of the page, fading
 * out towards the top and the sides, so whatever sits over it stays readable. A new drawing dissolves in over the old one.
 * Position it with `className` (fixed for the app, absolute inside a section). `wide` spreads it across the whole width
 * (cropping its top) for pages where a card covers the middle.
 */
export function DrawnBackdrop({ src, night, wide = false, className = '' }: { src: string; night: boolean; wide?: boolean; className?: string }) {
  const { reduced } = useMotionPrefs()
  return (
    <div className={`drawn-backdrop ${className}`} data-night={night} data-wide={wide} aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.img
          key={src}
          src={src}
          alt=""
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 1.2, ease: 'easeInOut' }}
        />
      </AnimatePresence>
    </div>
  )
}
