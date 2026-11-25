import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useScroll, type Variants } from 'motion/react'
import { Pause, Play } from 'lucide-react'
import { Coordinates } from '../components/motion/Coordinates'
import { RevealHeading } from '../components/motion/RevealHeading'
import { Stagger } from '../components/motion/Stagger'
import { EASE_OUT, riseItem, slideItem } from '../components/motion/variants'
import { DestinationAtmosphere } from '../components/scenes/DestinationAtmosphere'
import { destinations } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs, useParallax } from '../hooks/useMotionPrefs'

const AUTOPLAY_SECONDS = 8
const ease = EASE_OUT

// The cards carry no visual values of their own (their opacity and lift are CSS), only the stagger.
const pickerCard: Variants = { hidden: {}, show: {} }

const pickerCurtain: Variants = {
  hidden: { scaleY: 1 },
  show: { scaleY: 0, transition: { duration: 0.75, ease: [0.7, 0, 0.2, 1] } },
}

const pickerImage: Variants = {
  hidden: { scale: 1.35 },
  show: { scale: 1, transition: { duration: 1.1, ease } },
}

const pickerName: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.3, ease } },
}

export function Explore() {
  const { messages } = useLanguage()
  const { reduced } = useMotionPrefs()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const nearby = useInView(ref, { margin: '100% 0px', once: true })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const backdropY = useParallax(scrollYProgress, -50, 50)

  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovering, setHovering] = useState(false)

  // Decode every backdrop before the section arrives so switching places never hitches.
  useEffect(() => {
    if (!nearby) return
    destinations.forEach((item) => {
      const image = new Image()
      image.src = item.image
      void image.decode().catch(() => undefined)
    })
  }, [nearby])

  const autoplay = !reduced && !paused && !hovering && inView
  const destination = destinations[active]
  const copy = messages.explore.destinations[active]

  return (
    <section
      ref={ref}
      id="kham-pha"
      className="relative isolate scroll-mt-20 overflow-hidden bg-ink text-paper"
    >
      <motion.div
        aria-hidden="true"
        style={{ y: backdropY }}
        className="absolute inset-x-0 -inset-y-[8%] -z-10 will-change-transform"
      >
        <AnimatePresence initial={false}>
          <motion.img
            key={destination.id}
            src={destination.image}
            alt=""
            width="1280"
            height="854"
            decoding="async"
            className="ken-burns absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </AnimatePresence>
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ backgroundColor: destination.tint }}
          style={{ opacity: 0.36 }}
          transition={{ duration: 1.1 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/20 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/55" />
      </motion.div>

      <DestinationAtmosphere kind={destination.atmosphere} />

      <div
        className="container-shell relative flex min-h-[44rem] flex-col justify-between gap-12 py-24 sm:py-28 lg:min-h-[52rem]"
        onPointerEnter={(event) => event.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        <Stagger inView gap={0.2} className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <motion.p variants={slideItem} className="section-kicker text-paper/70">
              {messages.explore.kicker}
            </motion.p>
            <RevealHeading
              className="section-title mt-5 max-w-3xl"
              parts={[{ text: messages.explore.title }]}
            />
          </div>
          <motion.p
            variants={riseItem}
            className="max-w-md text-sm leading-6 text-paper/85 [text-shadow:0_1px_14px_rgba(0,0,0,0.55)]"
          >
            {messages.explore.description}
          </motion.p>
        </Stagger>

        <div aria-live={autoplay ? 'off' : 'polite'} className="min-h-[15rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={destination.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.2em] text-paper/75">
                <span className="h-px w-9 bg-sun" />
                {copy.region}
                <Coordinates
                  latitude={destination.coordinates[0]}
                  longitude={destination.coordinates[1]}
                  className="text-paper/55"
                />
              </p>
              <h3
                aria-label={copy.name}
                className="mt-3 font-display text-[clamp(4rem,13vw,11rem)] font-medium leading-[0.92] tracking-[-0.05em]"
              >
                {Array.from(copy.name.normalize('NFC')).map((character, index) => (
                  <motion.span
                    key={`${character}-${index}`}
                    aria-hidden="true"
                    className="inline-block whitespace-pre"
                    initial={{ y: reduced ? 0 : '45%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.65, delay: 0.2 + Math.min(index * 0.035, 0.35), ease }}
                  >
                    {character}
                  </motion.span>
                ))}
              </h3>
              <p className="mt-5 max-w-lg text-base leading-7 text-paper/90 [text-shadow:0_1px_16px_rgba(0,0,0,0.55)]">
                {copy.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <Stagger inView gap={0.07}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <motion.p variants={slideItem} className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/60">
              {messages.accessibility.destinationPicker}
            </motion.p>
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? messages.accessibility.playSlideshow : messages.accessibility.pauseSlideshow}
                className="grid size-9 place-items-center rounded-full border border-paper/30 text-paper/80 transition-colors hover:border-paper hover:text-paper"
              >
                {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label={messages.accessibility.destinationPicker}
            className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0"
          >
            {destinations.map((item, index) => {
              const isActive = index === active
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  variants={pickerCard}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={isActive}
                  onClick={() => setActive(index)}
                  onPointerEnter={(event) => event.pointerType === 'mouse' && setActive(index)}
                  className={`group relative h-36 w-32 shrink-0 snap-start overflow-hidden text-left outline-offset-4 transition-[translate,opacity,box-shadow] duration-300 sm:h-40 sm:w-auto ${
                    isActive
                      ? '-translate-y-2 ring-1 ring-paper/80'
                      : 'opacity-70 ring-1 ring-paper/15 hover:-translate-y-1 hover:opacity-100'
                  }`}
                >
                  <motion.span variants={pickerImage} className="absolute inset-0 block">
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </motion.span>
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                  <motion.span variants={pickerName} className="absolute inset-x-3 bottom-3 font-display text-lg leading-tight">
                    {messages.explore.destinations[index].name}
                  </motion.span>
                  {isActive && !reduced && (
                    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-paper/20">
                      <span
                        key={active}
                        className="explore-progress block h-full origin-left bg-sun"
                        style={{
                          animationDuration: `${AUTOPLAY_SECONDS}s`,
                          animationPlayState: autoplay ? 'running' : 'paused',
                        }}
                        onAnimationEnd={() => setActive((value) => (value + 1) % destinations.length)}
                      />
                    </span>
                  )}
                  {!reduced && (
                    <motion.span
                      aria-hidden="true"
                      variants={pickerCurtain}
                      className="pointer-events-none absolute inset-0 origin-top bg-ink"
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </Stagger>
      </div>
    </section>
  )
}

