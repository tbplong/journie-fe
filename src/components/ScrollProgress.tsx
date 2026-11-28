import { motion, useScroll } from 'motion/react'

export function ScrollProgress() {
  const { scrollYProgress: scaleX } = useScroll()

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-terracotta via-sun to-terracotta"
      style={{ scaleX }}
    />
  )
}
