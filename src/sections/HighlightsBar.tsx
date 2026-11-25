import { motion, type Variants } from 'motion/react'
import { Diamond } from 'lucide-react'
import { EASE_OUT } from '../components/motion/variants'
import { useLanguage } from '../hooks/useLanguage'

const COPIES = 3
/** Items past this many share the last delay, so off-screen copies never hold the cascade. */
const CASCADE = 10

const delayFor = (index: number) => Math.min(index, CASCADE) * 0.05

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: delayFor(index), ease: EASE_OUT },
  }),
}

const diamondVariants: Variants = {
  hidden: { scale: 0, rotate: -135 },
  show: (index: number) => ({
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 380, damping: 18, delay: delayFor(index) + 0.15 },
  }),
}

/** Value props drifting past as a ticker. Only the first copy is exposed to assistive tech. */
export function HighlightsBar() {
  const { messages } = useLanguage()
  const count = messages.highlights.length

  return (
    <motion.div
      className="bg-forest py-4 text-paper has-[.marquee:focus-visible]:outline-2 has-[.marquee:focus-visible]:-outline-offset-4 has-[.marquee:focus-visible]:outline-sun"
      aria-label={messages.accessibility.highlights}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
    >
      <div className="marquee" role="group" tabIndex={0} aria-label={messages.accessibility.highlights}>
        <div className="marquee-track">
          {Array.from({ length: COPIES * 2 }, (_, copy) => (
            <ul
              key={copy}
              className="flex shrink-0 items-center"
              aria-hidden={copy === 0 ? undefined : true}
            >
              {/* Keyed by position so a language switch updates items in place instead of remounting them hidden. */}
              {messages.highlights.map((highlight, index) => (
                <motion.li
                  key={index}
                  custom={copy * count + index}
                  variants={itemVariants}
                  className="flex items-center gap-7 pr-7 text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                >
                  <span className="whitespace-nowrap">{highlight}</span>
                  <motion.span custom={copy * count + index} variants={diamondVariants} className="grid shrink-0">
                    <Diamond aria-hidden="true" size={9} className="shrink-0 fill-sun text-sun" />
                  </motion.span>
                </motion.li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

