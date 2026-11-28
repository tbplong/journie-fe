import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue, type Variants } from 'motion/react'
import { ArrowRight, Compass, Route, Sparkles, type LucideIcon } from 'lucide-react'
import { RevealHeading } from '../components/motion/RevealHeading'
import { trackSpotlight } from '../components/motion/Spotlight'
import { Stagger } from '../components/motion/Stagger'
import { EASE_OUT, riseItem, slideItem } from '../components/motion/variants'
import { LanternScene } from '../components/scenes/LanternScene'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs } from '../hooks/useMotionPrefs'

const stepIcons: LucideIcon[] = [Compass, Sparkles, Route]
const STEP = 0.1

const stepIn: Variants = {
  hidden: { opacity: 0, y: 44, scale: 0.97 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, delay: index * STEP, ease: EASE_OUT },
  }),
}

const numberIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.15 + index * STEP, ease: EASE_OUT },
  }),
}

const iconIn: Variants = {
  hidden: { opacity: 0, scale: 0.3, rotate: -60 },
  show: (index: number) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 300, damping: 17, delay: 0.25 + index * STEP },
  }),
}

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
      custom={index}
      variants={stepIn}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      onPointerMove={trackSpotlight}
      className="spotlight hover-line group relative border-forest/15 bg-paper p-7 not-last:border-b sm:p-10 lg:min-h-[25rem] lg:not-last:border-b-0 lg:not-last:border-r"
    >
      <div className="flex items-start justify-between">
        <motion.span custom={index} variants={numberIn} className="relative font-display text-5xl italic text-forest/18">
          0{index + 1}
          <motion.span aria-hidden="true" style={{ opacity: lit }} className="absolute inset-0 text-terracotta">
            0{index + 1}
          </motion.span>
        </motion.span>
        <motion.span style={{ scale: useTransform(lit, [0, 1], [0.85, 1]) }} className="text-terracotta">
          <motion.span custom={index} variants={iconIn} className="block">
            <Icon
              aria-hidden="true"
              size={29}
              strokeWidth={1.45}
              className="transition-transform duration-700 group-hover:rotate-[18deg]"
            />
          </motion.span>
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
  const progress = scrollYProgress
  const headX = useTransform(progress, (value) => `${value * 100}%`)

  return (
    <section id="cach-hoat-dong" className="section-padding relative scroll-mt-20 overflow-hidden bg-paper">
      <LanternScene />

      <div className="container-shell relative">
        <Stagger
          inView
          gap={0.18}
          className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[1fr_0.34fr] lg:gap-16 lg:pb-20"
        >
          <div>
            <RevealHeading
              className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]"
              parts={[{ text: messages.howItWorks.title }]}
            />
            <motion.p variants={riseItem} className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
              {messages.howItWorks.description}
            </motion.p>
          </div>
          <motion.p variants={slideItem} className="section-kicker text-right">
            {messages.howItWorks.kicker}
          </motion.p>
        </Stagger>

        <div ref={gridRef} className="relative mt-14 lg:mt-20">
          <div aria-hidden="true" className="absolute inset-x-0 -top-px z-20 hidden h-[3px] lg:block">
            <motion.span
              style={{ scaleX: progress }}
              className="absolute inset-0 origin-left bg-gradient-to-r from-terracotta to-sun"
            />
            <motion.span style={{ x: headX }} className="absolute inset-0">
              <span className="absolute left-0 top-1/2 block size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-terracotta shadow-[0_0_0_6px_rgba(217,103,69,0.18)]" />
            </motion.span>
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

