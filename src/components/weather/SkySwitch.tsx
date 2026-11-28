import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { hashString } from '../../domain/conditions'
import { useTr } from '../../hooks/useTr'
import { useWeatherStore, type Phase } from '../../store/weatherStore'

/** Whole change, and the moment (while the screen is covered) the app switches to the new sky. */
const TOTAL = 2.4
const COMMIT_AT = 1.65
/** The sun and moon keep their own timings, scaled from the original 3.6s scene. */
const S = TOTAL / 3.6

const SKY: Record<Phase, string> = {
  day: 'linear-gradient(180deg, #a5dbd0 0%, #e7f0da 46%, #fbebc9 78%, #f6d7a0 100%)',
  night: 'linear-gradient(180deg, #05171a 0%, #0c2b26 48%, #164036 84%, #1f5546 100%)',
}

const RIDGES: Record<Phase, [string, string, string]> = {
  day: ['#4b9a82', '#32755f', '#205543'],
  night: ['#0d2d27', '#0a2420', '#071a19'],
}

const STARS = Array.from({ length: 46 }, (_, i) => {
  const h = hashString(`star-${i}`)
  return { x: h % 100, y: (h >>> 8) % 58, r: 1 + ((h >>> 16) % 3) * 0.55, o: 0.45 + ((h >>> 20) % 5) * 0.12 }
})

const mk = (times: number[]) => ({ duration: TOTAL, times, ease: 'linear' as const })

function Sun() {
  return (
    <div className="relative size-full">
      <div className="sky-sun-rays" />
      <div className="sky-sun-disc" />
    </div>
  )
}

function Moon() {
  return (
    <div className="relative size-full">
      <div className="sky-moon-glow" />
      <svg viewBox="0 0 100 100" className="sky-moon-disc">
        <defs>
          <radialGradient id="shift-moon" cx="36%" cy="34%" r="75%">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset="0.6" stopColor="#f2e6bd" />
            <stop offset="1" stopColor="#d7c88f" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#shift-moon)" />
        <circle cx="36" cy="38" r="8" fill="#d3c387" opacity="0.55" />
        <circle cx="63" cy="30" r="5" fill="#d3c387" opacity="0.5" />
        <circle cx="60" cy="62" r="11" fill="#d3c387" opacity="0.45" />
        <circle cx="30" cy="66" r="4.5" fill="#d3c387" opacity="0.5" />
      </svg>
    </div>
  )
}

/**
 * The change from day to night (and back) as a short scene instead of a flip: the screen fills with a
 * quiet landscape, the old sun or moon sinks behind the ridges, the new one climbs slowly up from them,
 * and only once it is up does the app switch its theme underneath. Calm motion users get the plain switch.
 */
export function SkySwitch() {
  const shift = useWeatherStore((state) => state.shift)
  const setPhaseMode = useWeatherStore((state) => state.setPhaseMode)
  const endShift = useWeatherStore((state) => state.endShift)
  const { tr } = useTr()

  useEffect(() => {
    if (!shift) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhaseMode(shift.mode)
      endShift()
      return
    }
    let committed = false
    const commit = window.setTimeout(() => {
      committed = true
      setPhaseMode(shift.mode)
    }, COMMIT_AT * 1000)
    const done = window.setTimeout(endShift, TOTAL * 1000)
    // A click or Escape skips the scene; the new sky still has to land.
    const skip = (event: Event) => {
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return
      if (!committed) setPhaseMode(shift.mode)
      endShift()
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.clearTimeout(commit)
      window.clearTimeout(done)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [shift, setPhaseMode, endShift])

  return <AnimatePresence>{shift && <Scene key={shift.id} to={shift.to} from={shift.from} caption={shift.to === 'night' ? tr('Trăng đang lên…', 'The moon is rising…') : tr('Bình minh đang tới…', 'Dawn is coming…')} />}</AnimatePresence>
}

function Scene({ from, to, caption }: { from: Phase; to: Phase; caption: string }) {
  const toNight = to === 'night'
  const fromRidges = RIDGES[from]
  const toRidges = RIDGES[to]
  const ridgeMove = (i: 0 | 1 | 2) => ({ fill: [fromRidges[i], fromRidges[i], toRidges[i], toRidges[i]] })
  const ridgeTime = mk([0, 0.15, 0.62, 1])

  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[400] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={mk([0, 0.1, 0.8, 1])} aria-hidden="true">
      <div className="absolute inset-0" style={{ background: SKY[to] }} />
      <motion.div className="absolute inset-0" style={{ background: SKY[from] }} initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0, 0] }} transition={mk([0, 0.15, 0.62, 1])} />

      <motion.div className="absolute inset-x-0 top-0 h-[70%]" initial={{ opacity: toNight ? 0 : 1 }} animate={{ opacity: toNight ? [0, 0, 1, 1] : [1, 1, 0, 0] }} transition={toNight ? mk([0, 0.3, 0.72, 1]) : mk([0, 0.15, 0.5, 1])}>
        {STARS.map((star, i) => (
          <span key={i} className="absolute rounded-full bg-[#fff6dc]" style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.r * 2, height: star.r * 2, opacity: star.o }} />
        ))}
      </motion.div>

      {/* The horizon glow that makes it dusk or dawn halfway through. */}
      <motion.div className="absolute inset-0" style={{ background: toNight ? 'radial-gradient(ellipse 70% 40% at 64% 70%, rgba(217,103,69,0.5), transparent 70%)' : 'radial-gradient(ellipse 70% 42% at 64% 70%, rgba(246,203,90,0.55), transparent 70%)' }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.2, 1, 1, 0.2] }} transition={mk([0, 0.1, 0.42, 0.66, 1])} />

      {/* Old body sinks, new body climbs; both start and end behind the ridges. */}
      <motion.div className="absolute size-[clamp(6.5rem,17vmin,11rem)] -translate-x-1/2" style={{ left: '64%', top: '22vh' }} initial={{ y: '0vh' }} animate={{ y: '64vh' }} transition={{ duration: 0.95 * S, delay: 0.1 * S, ease: [0.45, 0, 0.85, 0.6] }}>
        {toNight ? <Sun /> : <Moon />}
      </motion.div>
      <motion.div className="absolute size-[clamp(6.5rem,17vmin,11rem)] -translate-x-1/2" style={{ left: '64%', top: '22vh' }} initial={{ y: '64vh' }} animate={{ y: '0vh' }} transition={{ duration: 2.1 * S, delay: 0.8 * S, ease: [0.3, 0.55, 0.3, 1] }}>
        {toNight ? <Moon /> : <Sun />}
      </motion.div>

      <svg viewBox="0 0 1440 420" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 block h-[46vh] w-full">
        <motion.path initial={{ fill: fromRidges[0] }} animate={ridgeMove(0)} transition={ridgeTime} d="M0 170C120 120 220 90 330 130S520 190 640 140 860 60 980 110 1250 190 1440 120V420H0Z" />
        <motion.path initial={{ fill: fromRidges[1] }} animate={ridgeMove(1)} transition={ridgeTime} d="M0 250C140 200 260 220 380 190S600 150 720 210 980 280 1120 220 1340 170 1440 230V420H0Z" />
        <motion.path initial={{ fill: fromRidges[2] }} animate={ridgeMove(2)} transition={ridgeTime} d="M0 330C160 300 300 340 460 310S760 280 900 320 1200 350 1440 300V420H0Z" />
      </svg>

      <motion.p className="h-display absolute inset-x-0 bottom-[7vh] text-center text-[1.35rem] text-paper" initial={{ opacity: 0, y: 8 }} animate={{ opacity: [0, 0, 0.9, 0.9, 0], y: [8, 8, 0, 0, -4] }} transition={mk([0, 0.28, 0.42, 0.8, 1])}>
        {caption}
      </motion.p>
    </motion.div>
  )
}
