import { useRef, type ReactNode } from 'react'
import { motion, stagger, useInView, type Variants } from 'motion/react'
import { riseItem } from './variants'

const Tags = { div: motion.div, ul: motion.ul, ol: motion.ol, section: motion.section, li: motion.li, article: motion.article } as const
type Tag = keyof typeof Tags

type GroupProps = {
  children: ReactNode
  className?: string
  as?: Tag
  /** Seconds between children. */
  gap?: number
  /** Seconds before the first child. */
  delay?: number
  /** Play when scrolled into view instead of on mount. */
  inView?: boolean
}

/**
 * Plays its <StaggerItem> children one after another (on mount, or when scrolled into view).
 * Reduced motion is handled by the app-wide MotionConfig: only the fade remains.
 */
export function Stagger({ children, className, as = 'div', gap = 0.07, delay = 0, inView = false }: GroupProps) {
  const Component = Tags[as]
  const ref = useRef(null)
  // useInView + animate (not whileInView), so items that mount after the group has played still end at 'show'.
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const variants: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(gap, { startDelay: delay }) } } }
  return (
    <Component ref={ref} className={className} variants={variants} initial="hidden" animate={!inView || seen ? 'show' : 'hidden'}>
      {children}
    </Component>
  )
}

type ItemProps = { children: ReactNode; className?: string; as?: Tag; variants?: Variants }

/** One child of <Stagger>; rises into place by default. */
export function StaggerItem({ children, className, as = 'div', variants = riseItem }: ItemProps) {
  const Component = Tags[as]
  return (
    <Component className={className} variants={variants}>
      {children}
    </Component>
  )
}
