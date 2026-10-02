import { useRef } from 'react'
import { useScroll } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Magnetic } from '../components/motion/Magnetic'
import { RevealHeading } from '../components/motion/RevealHeading'
import { SunsetScene } from '../components/scenes/SunsetScene'
import { useLanguage } from '../hooks/useLanguage'

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

      <div className="container-shell relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/75">{messages.cta.kicker}</p>
          <RevealHeading
            className="mt-5 max-w-4xl font-display text-[clamp(3rem,6vw,6rem)] font-medium leading-[0.96] tracking-[-0.055em]"
            parts={[{ text: messages.cta.title }]}
          />
        </div>
        <div className="lg:pt-6">
          <p className="max-w-md text-base leading-7 text-paper/85">{messages.cta.description}</p>
          <Magnetic className="mt-7 inline-block">
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
        </div>
      </div>
    </section>
  )
}
