import { useRef } from 'react'
import { motion, stagger, useScroll, type Variants } from 'motion/react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Magnetic } from '../components/motion/Magnetic'
import { RevealHeading } from '../components/motion/RevealHeading'
import { EASE_OUT, riseItem, slideItem } from '../components/motion/variants'
import { SunsetScene } from '../components/scenes/SunsetScene'
import { useLanguage } from '../hooks/useLanguage'

const panel: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 40 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT, delayChildren: stagger(0.1, { startDelay: 0.25 }) },
  },
}

export function Cta() {
  const { messages } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <section
      ref={ref}
      id="khoi-hanh"
      className="relative min-h-[34rem] overflow-hidden bg-terracotta py-18 text-paper sm:py-24 lg:min-h-[40rem]"
    >
      <SunsetScene progress={scrollYProgress} />

      <motion.div
        variants={panel}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '0px 0px -12% 0px' }}
        className="container-shell relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start"
      >
        <div>
          <motion.p variants={slideItem} className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/75">
            {messages.cta.kicker}
          </motion.p>
          <RevealHeading
            delay={0.2}
            className="mt-5 max-w-4xl font-display text-[clamp(3rem,6vw,6rem)] font-medium leading-[0.96] tracking-[-0.055em]"
            parts={[{ text: messages.cta.title }]}
          />
        </div>
        <div className="lg:pt-6">
          <motion.p variants={riseItem} className="max-w-md text-base leading-7 text-paper/85">
            {messages.cta.description}
          </motion.p>
          <motion.div variants={riseItem} whileTap={{ scale: 0.97 }} className="w-fit">
            <Magnetic className="mt-7 inline-block">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 bg-paper px-6 py-3.5 text-sm font-bold text-forest transition-transform duration-300 hover:-translate-y-0.5"
              >
                {messages.cta.start}
                <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
          </motion.div>
          <motion.div variants={riseItem}>
            <Magnetic className="mt-5 block">
              <a
                href="#top"
                className="group inline-flex items-center gap-2 border-b border-paper pb-1 text-sm font-semibold"
              >
                {messages.cta.backToTop}
                <ArrowRight
                  aria-hidden="true"
                  size={16}
                  className="-rotate-90 transition-transform duration-300 group-hover:-translate-y-1"
                />
              </a>
            </Magnetic>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

