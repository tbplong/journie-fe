import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import {
  BedDouble,
  CalendarDays,
  Clock3,
  CloudRain,
  CloudSun,
  Heart,
  Landmark,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { RevealHeading } from '../components/motion/RevealHeading'
import { trackSpotlight } from '../components/motion/Spotlight'
import { TerracesScene } from '../components/scenes/TerracesScene'
import { siteConfig } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs } from '../hooks/useMotionPrefs'

const pillarIcons = [Heart, CalendarDays, CloudRain] as const

const scatteredChips: { Icon: LucideIcon; dx: number; dy: number; rotate: number }[] = [
  { Icon: BedDouble, dx: -70, dy: -54, rotate: -16 },
  { Icon: Landmark, dx: 46, dy: 58, rotate: 12 },
  { Icon: Clock3, dx: -30, dy: 66, rotate: -9 },
  { Icon: Wallet, dx: 84, dy: -58, rotate: 17 },
  { Icon: CloudSun, dx: -92, dy: 34, rotate: 10 },
]

function Chip({ Icon, dx, dy, rotate, progress }: (typeof scatteredChips)[number] & { progress: MotionValue<number> }) {
  const { reduced } = useMotionPrefs()
  const x = useTransform(progress, [0, 1], reduced ? [0, 0] : [dx, 0])
  const y = useTransform(progress, [0, 1], reduced ? [0, 0] : [dy, 0])
  const rotation = useTransform(progress, [0, 1], reduced ? [0, 0] : [rotate, 0])
  const opacity = useTransform(progress, [0, 0.5], reduced ? [1, 1] : [0.55, 1])

  return (
    <motion.span
      style={{ x, y, rotate: rotation, opacity }}
      className="relative z-10 grid size-11 place-items-center border border-forest/20 bg-paper text-forest shadow-[0_10px_24px_-14px_rgba(23,63,53,0.5)] sm:size-14"
    >
      <Icon aria-hidden="true" size={21} strokeWidth={1.6} />
    </motion.span>
  )
}

/** Scattered planning chips drift into a single line that ends at the Journie mark as the band scrolls in. */
function ScatteredPieces() {
  const ref = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 92%', 'start 42%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })
  const lineScale = useTransform(progress, [0.55, 1], reduced ? [1, 1] : [0, 1])
  const markScale = useTransform(progress, [0.6, 1], reduced ? [1, 1] : [0.55, 1])
  const markOpacity = useTransform(progress, [0.6, 1], reduced ? [1, 1] : [0, 1])

  return (
    <div ref={ref} aria-hidden="true" className="relative mt-12 flex items-center justify-between py-14 sm:max-w-2xl">
      <span className="absolute inset-x-6 top-1/2 h-px bg-forest/12" />
      <motion.span
        style={{ scaleX: lineScale }}
        className="absolute inset-x-6 top-1/2 h-0.5 origin-left bg-gradient-to-r from-terracotta to-sun"
      />
      {scatteredChips.map((chip, index) => (
        <Chip key={index} {...chip} progress={progress} />
      ))}
      <motion.img
        src={siteConfig.logoMark}
        alt=""
        width="384"
        height="512"
        style={{ scale: markScale, opacity: markOpacity }}
        className="relative z-10 h-16 w-auto sm:h-20"
      />
    </div>
  )
}

export function Story() {
  const { messages } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <section ref={ref} id="cau-chuyen" className="section-padding relative scroll-mt-20 overflow-hidden bg-cream">
      <TerracesScene progress={scrollYProgress} />

      <div className="container-shell relative">
        <div className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[0.34fr_1fr] lg:gap-16 lg:pb-20">
          <p className="section-kicker">{messages.story.kicker}</p>
          <div>
            <RevealHeading
              className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]"
              parts={[
                { text: messages.story.title },
                { text: messages.story.titleAccent, className: 'italic text-terracotta' },
              ]}
            />
            <p className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
              {messages.story.description}
            </p>
            <ScatteredPieces />
          </div>
        </div>

        <div className="grid border-b border-forest/15 md:grid-cols-3">
          {messages.story.pillars.map(({ label, title, description }, index) => {
            const Icon = pillarIcons[index]
            return (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -12% 0px' }}
                transition={{ duration: 0.9, delay: index * 0.14, ease: [0.22, 1, 0.36, 1] }}
                onPointerMove={trackSpotlight}
                className="spotlight hover-line group border-forest/15 py-9 md:border-r md:px-8 md:py-12 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center border border-forest/20 text-forest transition-all duration-500 group-hover:-rotate-6 group-hover:bg-forest group-hover:text-paper">
                    <Icon aria-hidden="true" size={21} strokeWidth={1.7} />
                  </span>
                  <span className="font-display text-lg italic text-ink/35">0{index + 1}</span>
                </div>
                <p className="mt-9 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{label}</p>
                <h3 className="mt-3 max-w-xs font-display text-2xl font-medium leading-tight">{title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
