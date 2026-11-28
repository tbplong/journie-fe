import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type Variants } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useHereWeather } from '../../hooks/useHereWeather'
import { useTr } from '../../hooks/useTr'
import { useSky, useWeatherStore, type Phase, type Weather } from '../../store/weatherStore'
import { LangSwitch } from '../LangSwitch'
import { MagicCursor } from '../MagicCursor'
import { Di } from '../mascot/Di'
import { MascotContext, useMascot, type FocusPoint, type MascotControl, type MascotMood } from '../mascot/mascot-context'
import { Birds } from '../scenes/primitives'
import { DrawnBackdrop } from '../DrawnBackdrop'
import { WeatherChip } from '../weather/WeatherChip'
import { WeatherLayer } from '../weather/WeatherLayer'
import { LightContext, type LightControl } from './light-context'
import { ChestSpot, CliffNoteSpot, ConstellationSpot, FirefliesSpot, FishSpot, FlockSpot, KiteSpot, LanternSpot, LotusSpot } from './LightSpots'
import { useLit } from './use-lit'
import { AuthEntryContext, formStagger, useAuthArrival, type AuthEntry } from './entry'
import { EASE_OUT } from '../motion/variants'
import { Logo } from '../Logo'
import { heroPlace } from '../../content/heroPlaces'

const KEYS = (['day', 'night'] as const).flatMap((phase) => (['clear', 'cloudy', 'rain', 'storm'] as const).map((weather) => `${phase}-${weather}` as const))

const SUN_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.35, rain: 0, storm: 0 }
const MOON_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.55, rain: 0.22, storm: 0 }

/** The moon, with a face that only shows when the torch finds it. */
function Moon({ weather }: { weather: Weather }) {
  const { ref, lit } = useLit(150)
  return (
    <div
      ref={ref}
      className="auth-moon absolute left-[2.5%] top-[24%] size-24 transition-opacity duration-[1400ms] max-lg:hidden"
      data-lit={lit}
      style={{ opacity: MOON_SHOW[weather] }}
    >
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <defs>
          <radialGradient id="auth-moon-fill" cx="36%" cy="34%" r="75%">
            <stop offset="0" stopColor="#fff7de" />
            <stop offset="0.6" stopColor="#f0e3b8" />
            <stop offset="1" stopColor="#d9c98f" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#auth-moon-fill)" />
        <circle cx="34" cy="36" r="7" fill="#d3c387" opacity="0.5" />
        <circle cx="66" cy="62" r="10" fill="#d3c387" opacity="0.42" />
        <g className="auth-moon-face" stroke="#4a3b1c" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M30 44Q36 38 42 44" />
          <path d="M58 44Q64 38 70 44" strokeDasharray="1 0" className="auth-moon-wink" />
          <path d="M38 58Q50 70 62 58" />
          <ellipse cx="28" cy="56" rx="6" ry="4" fill="#ec9a86" stroke="none" opacity="0.7" />
          <ellipse cx="72" cy="56" rx="6" ry="4" fill="#ec9a86" stroke="none" opacity="0.7" />
        </g>
      </svg>
    </div>
  )
}

/** Sun, moon and birds under the current sky, with the day's destination drawn faintly at the foot of the page. */
function Backdrop({ phase, weather }: { phase: Phase; weather: Weather }) {
  const night = phase === 'night'
  const place = useMemo(() => heroPlace(), [])
  const gloomy = weather === 'rain' || weather === 'storm'
  return (
    <div className="pointer-events-none absolute inset-0 -z-[2] overflow-hidden" aria-hidden="true">
      <div className="absolute -right-[8%] top-[-6%] size-[40rem] transition-opacity duration-[1400ms] max-sm:size-[22rem]" style={{ opacity: night ? 0 : SUN_SHOW[weather] }}>
        <div className="scene-sun size-full rounded-full" />
      </div>
      <div className="absolute inset-0 transition-opacity duration-[1400ms]" style={{ opacity: night ? 1 : 0 }}>
        <Moon weather={weather} />
      </div>
      {!night && !gloomy && (
        <div className="scene" data-live="true">
          <Birds />
        </div>
      )}
      <DrawnBackdrop src={night ? place.drawingNight : place.drawing} night={night} wide className="absolute" />
    </div>
  )
}

/** Things hidden in the margins of the page. They only show once the torch is on, and wake when the light reaches them. */
function BackdropSpots({ night }: { night: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-[1] max-lg:hidden" aria-hidden="true">
      <LanternSpot style={{ right: '5.2%', top: '19%' }} />
      <LanternSpot small style={{ right: '9.8%', top: '14%' }} />
      <ChestSpot style={{ left: '4.5%', bottom: '6.5%' }} />
      <LotusSpot style={{ right: '4.5%', bottom: '5%' }} />
      {night ? <ConstellationSpot style={{ left: '37%', top: '1.2%' }} /> : <KiteSpot style={{ left: '41%', top: '1.5%' }} />}
      <FlockSpot night={night} style={{ left: '57%', top: '4%' }} />
    </div>
  )
}

type Props = {
  children: ReactNode
  /** What Journie says for each mood on this page. */
  lines: Partial<Record<MascotMood, string>>
}

/** The poster opens from its foot like a sunrise, then its contents arrive one after another. */
const archVariants: Variants = {
  hidden: { clipPath: 'circle(0% at 50% 100%)' },
  show: { clipPath: 'circle(145% at 50% 100%)', transition: { duration: 1.15, ease: [0.65, 0, 0.35, 1], delay: 0.12 } },
}

const archText = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay } },
})

const taglineIn = archText(1.05)

const diIn: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.82 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 210, damping: 17, delay: 0.62 } },
}

const bubbleIn: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.6 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 20, delay: 0.85 } },
}

/** Visual half of the auth card: the day's destination poster with Journie standing on its photograph, and a few secrets in the photo. */
function Visual({ lines, entry }: { lines: Props['lines']; entry: AuthEntry }) {
  const { reduced } = useMotionPrefs()
  const arrive = entry === 'arrive'
  const { tr } = useTr()
  const place = useMemo(() => heroPlace(), [])
  const { mood, setMood } = useMascot()
  const { ref: diRef, lit } = useLit(120)
  const line = lines[mood] ?? lines.idle ?? ''
  const lastLit = useRef(false)

  // Shining the torch on Journie makes it wave, once per visit of the light.
  useEffect(() => {
    if (lit && !lastLit.current && mood === 'idle') {
      setMood('wave')
      const timer = window.setTimeout(() => setMood('idle'), 1800)
      lastLit.current = true
      return () => window.clearTimeout(timer)
    }
    if (!lit) lastLit.current = false
  }, [lit, mood, setMood])

  return (
    <div className="flex items-center p-3 sm:p-4">
      <motion.div className="auth-visual w-full" variants={archVariants} initial={arrive && !reduced ? 'hidden' : false} animate="show">
        <motion.div
          className="absolute inset-0 -z-[2]"
          initial={arrive ? { scale: 1.2 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 1.7, ease: EASE_OUT, delay: 0.1 }}
        >
          <img src={place.poster} alt={tr(...place.alt)} width="1200" height="1600" decoding="async" />
        </motion.div>
        <motion.p variants={taglineIn} className="absolute inset-x-0 top-[5%] px-6 text-center text-[0.8rem] font-medium leading-snug text-paper/90">{tr('Đi Việt Nam, theo cách của riêng bạn.', 'See Vietnam your own way.')}</motion.p>

        {/* Everything laid over the poster stays on its photograph, so the drawing and its text below are never covered. */}
        <CliffNoteSpot text={tr('Chào mừng trở lại!', 'Welcome back!')} style={{ left: '79%', top: '15%', transform: 'translateX(-50%) rotate(4deg)' }} />
        <FirefliesSpot style={{ left: '7%', top: '21%' }} />
        {place.water && <FishSpot style={{ left: '8%', top: '39%' }} />}

        <div className="absolute inset-x-0 bottom-1/2 z-10 flex flex-col items-center px-5 text-center">
          <motion.div variants={bubbleIn} style={{ originY: 1 }} className="di-bubble mb-3 max-w-[16.5rem]" data-tail="bottom" role="status" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                {line}
              </motion.p>
            </AnimatePresence>
          </motion.div>
          <motion.div ref={diRef} variants={diIn}>
            <Di className="aspect-square w-28 sm:w-32 md:w-36" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Full-screen auth page: landing-style scenery under the current sky (time of day and weather are
 * independent), and a split card with Journie on the left and the form on the right. A torch (the lamp
 * button in the password field) throws a soft light that follows the pointer and wakes hidden things.
 */
export function AuthShell({ children, lines }: Props) {
  const { tr } = useTr()
  const sky = useSky()
  // The weather where the visitor is (last known or already allowed position); the sign-in page never asks for it
  useHereWeather({ ask: false })
  const effects = useWeatherStore((state) => state.effects)
  const [mood, setMoodState] = useState<MascotMood>('idle')
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null)
  const [errorTick, setErrorTick] = useState(0)
  const [lightOn, setLightOn] = useState(false)
  const originRef = useRef<HTMLDivElement | null>(null)
  const entry = useAuthArrival()
  const arrive = entry === 'arrive'

  const setMood = useCallback((next: MascotMood) => {
    if (next === 'error') setErrorTick((tick) => tick + 1)
    setMoodState(next)
  }, [])

  const control = useMemo<MascotControl>(() => ({ mood, setMood, focusPoint, setFocusPoint, errorTick, originRef }), [mood, setMood, focusPoint, errorTick])

  // The light drifts after the pointer a little late, like a lantern on a string.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const lx = useSpring(px, { stiffness: 70, damping: 24, mass: 0.9 })
  const ly = useSpring(py, { stiffness: 70, damping: 24, mass: 0.9 })
  const lxPx = useTransform(lx, (v) => `${v}px`)
  const lyPx = useTransform(ly, (v) => `${v}px`)

  const aimAt = useCallback(
    (x: number, y: number) => {
      px.set(x)
      py.set(y)
    },
    [px, py],
  )

  useEffect(() => {
    if (!lightOn) return
    const onPointer = (event: PointerEvent) => aimAt(event.clientX, event.clientY)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [lightOn, aimAt])

  const light = useMemo<LightControl>(() => ({ on: lightOn, setOn: setLightOn, x: lx, y: ly, aimAt }), [lightOn, lx, ly, aimAt])
  const night = sky.night

  return (
    <LightContext.Provider value={light}>
      <MascotContext.Provider value={control}>
        <div className="auth-root" data-phase={sky.phase} data-weather={sky.weather} data-light={lightOn}>
          <MagicCursor />
          {KEYS.map((key) => (
            <div key={key} className="auth-sky" data-key={key} data-on={key === sky.key} aria-hidden="true" />
          ))}
          <Backdrop phase={sky.phase} weather={sky.weather} />
          <BackdropSpots night={night} />
          <motion.div className="light-dark" data-on={lightOn && night} style={{ ['--lx' as string]: lxPx, ['--ly' as string]: lyPx }} aria-hidden="true" />
          <WeatherLayer phase={sky.phase} weather={sky.weather} still={!effects} />

          <motion.header
            className="relative z-20 mx-auto flex w-[min(100%-2rem,72rem)] items-center justify-between py-4 sm:py-6"
            initial={arrive ? { opacity: 0, y: -16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
          >
            <Link to="/" className="group flex items-center gap-2.5" aria-label={tr('Về trang chủ Journie', 'Back to Journie home')}>
              <Logo tone={night ? 'light' : 'dark'} height="clamp(2.6rem, 6vw, 3.4rem)" className="transition-transform duration-500 group-hover:-rotate-3" />
              <span className="sr-only">Journie</span>
            </Link>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <Link to="/" className="hidden items-center gap-1.5 text-xs font-medium text-[color:var(--a-muted)] transition-colors hover:text-[color:var(--a-accent)] sm:inline-flex">
                <ArrowLeft size={14} aria-hidden="true" />
                {tr('Trang chủ', 'Home')}
              </Link>
              <WeatherChip tone={night ? 'dark' : 'light'} align="right" />
              <LangSwitch tone={night ? 'dark' : 'light'} />
            </div>
          </motion.header>

          <main id="main-content" className="relative z-10 mx-auto flex w-[min(100%-1.5rem,72rem)] justify-center pb-16 pt-2 md:min-h-[calc(100dvh-8rem)] md:items-center md:pb-10">
            <motion.div
              className="auth-card"
              initial={arrive ? { opacity: 0, y: 48, scale: 0.97 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, ease: EASE_OUT }}
            >
              <Visual lines={lines} entry={entry} />
              <AuthEntryContext.Provider value={entry}>
                <motion.section
                  className="relative flex flex-col justify-center px-6 pb-8 pt-3 sm:px-10 md:py-12"
                  aria-live="polite"
                  variants={formStagger[entry]}
                  initial="hidden"
                  animate="show"
                >
                  {children}
                </motion.section>
              </AuthEntryContext.Provider>
            </motion.div>
          </main>

          <motion.div className="light-glow" data-on={lightOn} style={{ ['--lx' as string]: lxPx, ['--ly' as string]: lyPx }} aria-hidden="true" />
        </div>
      </MascotContext.Provider>
    </LightContext.Provider>
  )
}
