import { useRef, type PointerEvent } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowDownRight, Check, SunMedium } from 'lucide-react'
import { Magnetic } from '../components/motion/Magnetic'
import { RevealHeading } from '../components/motion/RevealHeading'
import { KarstScene } from '../components/scenes/KarstScene'
import { WishLamp } from '../components/WishLamp'
import { siteConfig } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs, useParallax } from '../hooks/useMotionPrefs'

const spring = { stiffness: 80, damping: 20, mass: 0.6 }

export function Hero() {
  const { messages } = useLanguage()
  const { canPointerFx, reduced } = useMotionPrefs()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, spring)
  const smoothY = useSpring(pointerY, spring)

  const range = (amount: number): [number, number] => (canPointerFx ? [-amount, amount] : [0, 0])
  const archRotateY = useTransform(smoothX, [-0.5, 0.5], range(-6))
  const archRotateX = useTransform(smoothY, [-0.5, 0.5], range(5))
  const outlineX = useTransform(smoothX, [-0.5, 0.5], range(-22))
  const outlineY = useTransform(smoothY, [-0.5, 0.5], range(-16))
  const cardX = useTransform(smoothX, [-0.5, 0.5], range(-26))
  const cardPointerY = useTransform(smoothY, [-0.5, 0.5], range(-16))
  const compassX = useTransform(smoothX, [-0.5, 0.5], range(30))
  const compassPointerY = useTransform(smoothY, [-0.5, 0.5], range(20))

  const copyY = useParallax(scrollYProgress, 0, -80)
  const archY = useParallax(scrollYProgress, 0, 56)
  const photoY = useParallax(scrollYProgress, -16, 44)
  const cardScrollY = useParallax(scrollYProgress, 0, -110)
  const compassScrollY = useParallax(scrollYProgress, 0, -40)
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], reduced ? [1, 1] : [1, 0.15])

  const cardY = useTransform([cardPointerY, cardScrollY], ([a, b]: number[]) => a + b)
  const compassY = useTransform([compassPointerY, compassScrollY], ([a, b]: number[]) => a + b)

  const handlePointer = (event: PointerEvent<HTMLElement>) => {
    if (!canPointerFx || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5)
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5)
  }

  const resetPointer = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
      className="relative scroll-mt-24 overflow-hidden pb-20 pt-12 lg:pb-30 lg:pt-20"
    >
      <KarstScene progress={scrollYProgress} />

      <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="relative z-10 will-change-transform lg:pb-8">
          <p className="hero-reveal mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest/70">
            <span className="h-px w-9 bg-terracotta" />
            {messages.hero.eyebrow}
          </p>
          <RevealHeading
            as="h1"
            immediate
            delay={0.15}
            stagger={0.07}
            className="max-w-3xl text-balance font-display text-[clamp(3.25rem,7vw,6.6rem)] font-medium leading-[0.95] tracking-[-0.06em] text-ink"
            parts={[
              { text: messages.hero.title },
              {
                text: messages.hero.titleAccent,
                block: true,
                className: 'mt-2 italic text-terracotta',
                wordClassName: 'text-shimmer',
              },
            ]}
          />
          <p className="hero-reveal hero-reveal-delay-2 mt-8 max-w-xl text-base leading-7 text-ink/67 sm:text-lg sm:leading-8">
            {messages.hero.description}
          </p>
          <div className="hero-reveal hero-reveal-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
            <Magnetic className="flex">
              <a href="#hanh-trinh" className="button-primary flex-1 justify-center">
                {messages.hero.primaryCta}
                <ArrowDownRight aria-hidden="true" size={18} />
              </a>
            </Magnetic>
            <Magnetic className="flex">
              <a href="#cach-hoat-dong" className="button-secondary flex-1 justify-center">
                {messages.hero.secondaryCta}
              </a>
            </Magnetic>
          </div>
          <div className="hero-reveal hero-reveal-delay-3 mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-forest/15 pt-5 text-xs font-medium text-ink/60">
            {messages.hero.benefits.map((benefit) => (
              <span key={benefit} className="flex items-center gap-2">
                <Check aria-hidden="true" size={14} className="text-terracotta" />
                {benefit}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="hero-reveal hero-reveal-delay-2 relative mx-auto w-full max-w-2xl px-4 pb-14 sm:px-10 lg:mx-0 lg:max-w-none lg:pl-16 lg:pr-0">
          <motion.div style={{ y: archY }} className="relative ml-auto w-full max-w-[35rem]">
            <motion.div
              aria-hidden="true"
              style={{ x: outlineX, y: outlineY }}
              className="absolute inset-0 translate-x-5 translate-y-5 rounded-b-2xl rounded-t-[18rem] border border-terracotta/55"
            />

            <motion.div
              style={{ rotateX: archRotateX, rotateY: archRotateY, transformPerspective: 1200 }}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-b-2xl rounded-t-[18rem] bg-forest shadow-[0_44px_90px_-34px_rgba(23,63,53,0.6)]"
            >
              <motion.img
                src={siteConfig.heroImage}
                alt={messages.hero.imageAlt}
                className="h-full w-full object-cover will-change-transform"
                style={{ y: photoY, scale: 1.14 }}
                width="1280"
                height="854"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
              <div className="absolute bottom-7 left-7 text-paper">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">
                  20.2506° N, 105.9745° E
                </p>
                <p className="mt-2 font-display text-3xl">{messages.hero.imageCaption}</p>
              </div>
            </motion.div>

            <motion.div
              style={{ x: cardX, y: cardY }}
              className="absolute -right-3 top-[18%] hidden sm:-right-8 sm:block"
            >
              <div className="scene-bob border border-paper/40 bg-forest/92 px-4 py-3 text-paper shadow-xl backdrop-blur">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <SunMedium aria-hidden="true" size={15} className="text-sun" />
                  {messages.hero.weather}
                </p>
                <p className="mt-1 text-[0.65rem] text-paper/60">{messages.hero.weatherNote}</p>
              </div>
            </motion.div>

            <motion.div
              style={{ x: compassX, y: compassY }}
              className="absolute -left-5 bottom-20 hidden sm:block lg:-left-10"
            >
              <WishLamp />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
