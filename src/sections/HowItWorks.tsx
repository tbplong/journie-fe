import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { ArrowRight, Compass, Route, Sparkles, type LucideIcon } from 'lucide-react'
import { RevealHeading } from '../components/motion/RevealHeading'
import { trackSpotlight } from '../components/motion/Spotlight'
import { LanternScene } from '../components/scenes/LanternScene'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs } from '../hooks/useMotionPrefs'

const stepIcons: LucideIcon[] = [Compass, Sparkles, Route]

type StepProps = {
  index: number
  total: number
  title: string
  description: string
  progress: MotionValue<number>
}

/** A step lights up as the route line reaches it. */
function Step({ index, total, title, description, progress }: StepProps) {
  const { reduced } = useMotionPrefs()
  const Icon = stepIcons[index]
  const reach = (index + 0.15) / total
  const lit = useTransform(progress, [reach - 0.12, reach + 0.04], reduced ? [1, 1] : [0, 1])

  return (
    <motion.article
      initial={{ opacity: 0, y: 56 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.95, delay: index * 0.16, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={trackSpotlight}
      className="spotlight hover-line group relative border-forest/15 bg-paper p-7 not-last:border-b sm:p-10 lg:min-h-[25rem] lg:not-last:border-b-0 lg:not-last:border-r"
    >
      <div className="flex items-start justify-between">
        <span className="relative font-display text-5xl italic text-forest/18">
          0{index + 1}
          <motion.span aria-hidden="true" style={{ opacity: lit }} className="absolute inset-0 text-terracotta">
            0{index + 1}
          </motion.span>
        </span>
        <motion.span style={{ scale: useTransform(lit, [0, 1], [0.85, 1]) }} className="text-terracotta">
          <Icon
            aria-hidden="true"
            size={29}
            strokeWidth={1.45}
            className="transition-transform duration-700 group-hover:rotate-[18deg]"
          />
        </motion.span>
      </div>
      <div className="mt-18 lg:mt-28">
        <h3 className="font-display text-3xl font-medium tracking-[-0.025em]">{title}</h3>
        <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
      </div>
      {index < total - 1 && (
        <ArrowRight
          className="absolute -right-3 top-1/2 z-10 hidden size-6 rounded-full bg-forest p-1 text-paper lg:block"
          aria-hidden="true"
        />
      )}
    </motion.article>
  )
}

export function HowItWorks() {
  const { messages } = useLanguage()
  const gridRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: gridRef, offset: ['start 78%', 'end 58%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 })
  const headLeft = useTransform(progress, (value) => `${value * 100}%`)

  return (
    <section id="cach-hoat-dong" className="section-padding relative scroll-mt-20 overflow-hidden bg-paper">
      <LanternScene />

      <div className="container-shell relative">
        <div className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[1fr_0.34fr] lg:gap-16 lg:pb-20">
          <div>
            <RevealHeading
              className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]"
              parts={[{ text: messages.howItWorks.title }]}
            />
            <p className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
              {messages.howItWorks.description}
            </p>
          </div>
          <p className="section-kicker text-right">{messages.howItWorks.kicker}</p>
        </div>

        <div ref={gridRef} className="relative mt-14 lg:mt-20">
          <div aria-hidden="true" className="absolute inset-x-0 -top-px z-20 hidden h-[3px] lg:block">
            <motion.span
              style={{ scaleX: progress }}
              className="absolute inset-0 origin-left bg-gradient-to-r from-terracotta to-sun"
            />
            <motion.span
              style={{ left: headLeft }}
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-terracotta shadow-[0_0_0_6px_rgba(217,103,69,0.18)]"
            />
          </div>

          <div className="grid border border-forest/15 lg:grid-cols-3">
            {messages.howItWorks.steps.map(({ title, description }, index) => (
              <Step
                key={index}
                index={index}
                total={messages.howItWorks.steps.length}
                title={title}
                description={description}
                progress={progress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
