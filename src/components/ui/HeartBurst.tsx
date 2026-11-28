import { motion } from 'motion/react'
import { Heart } from 'lucide-react'

/** A handful of tiny hearts that pop out of a button the moment something is saved. */
export function HeartBurst() {
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      <motion.span
        className="absolute size-9 rounded-full border-2 border-terracotta"
        initial={{ opacity: 0.85, scale: 0.3 }}
        animate={{ opacity: 0, scale: 1.9 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
        const reach = 30 + (i % 3) * 8
        return (
          <motion.span
            key={i}
            className="absolute text-terracotta"
            initial={{ opacity: 1, scale: 0.4, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: 0, scale: 1 + (i % 2) * 0.3, x: Math.cos(angle) * reach, y: Math.sin(angle) * reach - 6, rotate: (i % 2 ? 1 : -1) * 28 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: i * 0.012 }}
          >
            <Heart size={10 + (i % 3) * 2} fill="currentColor" />
          </motion.span>
        )
      })}
    </span>
  )
}
