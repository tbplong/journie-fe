import { useMemo, useRef, type PointerEvent } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform, type Variants } from 'motion/react'
import { ArrowDownRight, Check, SunMedium } from 'lucide-react'
import { Magnetic } from '../components/motion/Magnetic'
import { RevealHeading } from '../components/motion/RevealHeading'
import { Stagger } from '../components/motion/Stagger'
import { EASE_OUT, popItem, slideItem } from '../components/motion/variants'
import { DrawnBackdrop } from '../components/DrawnBackdrop'
import { WishLamp } from '../components/WishLamp'
import { formatCoords, heroPlace } from '../content/heroPlaces'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs, useParallax } from '../hooks/useMotionPrefs'

const spring = { stiffness: 80, damping: 20, mass: 0.6 }
const WIPE_EASE = [0.7, 0, 0.2, 1] as const

const enter = (delay: number, from: { x?: number; y?: number } = { y: 24 }) => ({
  initial: { opacity: 0, ...from },
  animate: { opacity: 1, x: 0, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE_OUT },
})

const ctaRise: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } },
}

/** Springs in with a small overshoot while the opacity eases in on its own. */
const settle = (delay: number) => ({
  delay,
  type: 'spring' as const,
  stiffness: 240,
  damping: 18,
  opacity: { duration: 0.3, delay },
})

export function Hero() {
  const { messages, language } = useLanguage()
  const place = useMemo(() => heroPlace(), [])
  const i = language === 'vi' ? 0 : 1
  const { canPointerFx, reduced } = useMotionPrefs()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, spring)
  const smoothY = useSpring(pointerY, spring)

  const range = (amount: number): [number, number] => (canPointerFx ? [-amount, amount] : [0, 0])
  const archRotateY = useTransform(smoothX, [-0.5, 0.5], range(-3))
  const archRotateX = useTransform(smoothY, [-0.5, 0.5], range(2.5))
  const outlineX = useTransform(smoothX, [-0.5, 0.5], range(-10))
  const outlineY = useTransform(smoothY, [-0.5, 0.5], range(-8))
  const cardX = useTransform(smoothX, [-0.5, 0.5], range(-12))
  const cardPointerY = useTransform(smoothY, [-0.5, 0.5], range(-8))
  const compassX = useTransform(smoothX, [-0.5, 0.5], range(14))
  const compassPointerY = useTransform(smoothY, [-0.5, 0.5], range(10))

  const copyY = useParallax(scrollYProgress, 0, -80)
  const archY = useParallax(scrollYProgress, 0, 56)
  const photoY = useParallax(scrollYProgress, -16, 44)
  const cardScrollY = useParallax(scrollYProgress, 0, -110)
  const compassScrollY = useParallax(scrollYProgress, 0, -40)
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], reduced ? [1, 1] : [1, 0.6])

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
      {/* The day's destination, redrawn from its poster, sunk into the foot of the hero */}
      <DrawnBackdrop src={place.drawing} night={false} className="absolute" />

      <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="relative z-10 will-change-transform lg:pb-8">
          <motion.p
            {...enter(0, { x: -14 })}
            className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest/70"
          >
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
              className="h-px w-9 origin-left bg-terracotta"
            />
            {messages.hero.eyebrow}
          </motion.p>
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
          <motion.p
            {...enter(0.25)}
            className="mt-8 max-w-xl text-base leading-7 text-ink/67 sm:text-lg sm:leading-8"
          >
            {messages.hero.description}
          </motion.p>
          <Stagger delay={0.3} gap={0.08} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <motion.div variants={ctaRise} whileTap={{ scale: 0.97 }} className="grid">
              <Magnetic className="flex">
                <a href="#hanh-trinh" className="button-primary flex-1 justify-center">
                  {messages.hero.primaryCta}
                  <ArrowDownRight aria-hidden="true" size={18} />
                </a>
              </Magnetic>
            </motion.div>
            <motion.div variants={ctaRise} whileTap={{ scale: 0.97 }} className="grid">
              <Magnetic className="flex">
                <a href="#cach-hoat-dong" className="button-secondary flex-1 justify-center">
                  {messages.hero.secondaryCta}
                </a>
              </Magnetic>
            </motion.div>
          </Stagger>
          <Stagger
            delay={0.55}
            gap={0.07}
            className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-forest/15 pt-5 text-xs font-medium text-ink/60"
          >
            {messages.hero.benefits.map((benefit) => (
              <motion.span key={benefit} variants={slideItem} className="flex items-center gap-2">
                <motion.span variants={popItem} className="grid">
                  <Check aria-hidden="true" size={14} className="text-terracotta" />
                </motion.span>
                {benefit}
              </motion.span>
            ))}
          </Stagger>
        </motion.div>

        <div className="relative mx-auto w-full max-w-2xl px-4 pb-14 sm:px-10 lg:mx-0 lg:max-w-none lg:pl-16 lg:pr-0">
          <motion.div style={{ y: archY }} className="relative ml-auto w-full max-w-[35rem]">
            {/* Starts tucked behind the arch, then slides out to its offset. */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, x: -20, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.9, delay: 0.75, ease: EASE_OUT }}
              className="absolute inset-0"
            >
              <motion.div
                style={{ x: outlineX, y: outlineY }}
                className="absolute inset-0 translate-x-5 translate-y-5 rounded-b-2xl rounded-t-[18rem] border border-terracotta/55"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: EASE_OUT }}
            >
              <motion.div
                style={{ rotateX: archRotateX, rotateY: archRotateY, transformPerspective: 1200 }}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-b-2xl rounded-t-[18rem] bg-forest shadow-[0_44px_90px_-34px_rgba(23,63,53,0.6)]"
              >
                <motion.div
                  className="absolute inset-0"
                  initial={reduced ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
                  animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
                  transition={{ duration: 1.05, delay: 0.25, ease: WIPE_EASE }}
                >
                  <motion.div
                    className="h-full w-full"
                    initial={{ scale: 1.14 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1.6, delay: 0.25, ease: EASE_OUT }}
                  >
                    <motion.img
                      src={place.image}
                      alt={place.alt[i]}
                      className="h-full w-full object-cover will-change-transform"
                      style={{ y: photoY, scale: 1.14, objectPosition: place.focus }}
                      width="1280"
                      height="854"
                      fetchPriority="high"
                    />
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                </motion.div>
                <motion.div {...enter(1)} className="absolute bottom-7 left-7 text-paper">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">
                    {formatCoords(place)}
                  </p>
                  <p className="mt-2 font-display text-3xl">{place.name[i]}</p>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              style={{ x: cardX, y: cardY }}
              className="absolute -right-3 top-[18%] hidden sm:-right-8 sm:block"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={settle(1.05)}
                className="origin-left border border-paper/40 bg-forest/92 px-4 py-3 text-paper shadow-xl backdrop-blur"
              >
                <p className="flex items-center gap-2 text-xs font-medium">
                  <SunMedium aria-hidden="true" size={15} className="text-sun" />
                  {messages.hero.weather.replace(/\d+°C/, `${place.temp}°C`)}
                </p>
                <p className="mt-1 text-[0.65rem] text-paper/60">{place.note[i]}</p>
              </motion.div>
            </motion.div>

            <motion.div
              style={{ x: compassX, y: compassY }}
              className="absolute -left-5 bottom-20 hidden sm:block lg:-left-10"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.45, rotate: -28 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={settle(1.2)}
              >
                <WishLamp />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

