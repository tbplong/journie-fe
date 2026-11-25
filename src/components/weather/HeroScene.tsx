import { AnimatePresence, motion } from 'motion/react'
import { useSky, useWeatherStore, type Phase, type Weather } from '../../store/weatherStore'

/** How much of the sun or the moon still shows through the weather. */
const BODY_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.62, rain: 0.24, storm: 0.08 }

/** Cloud banks per weather: x/y in %, width in rem, drift seconds, tone. */
const CLOUDS: Record<Weather, { x: number; y: number; w: number; d: number; o: number }[]> = {
  clear: [],
  cloudy: [
    { x: 6, y: 10, w: 11, d: 62, o: 0.34 },
    { x: 52, y: 4, w: 14, d: 78, o: 0.3 },
    { x: 78, y: 30, w: 9, d: 70, o: 0.26 },
  ],
  rain: [
    { x: 0, y: 0, w: 15, d: 70, o: 0.55 },
    { x: 34, y: -2, w: 18, d: 86, o: 0.6 },
    { x: 66, y: 2, w: 16, d: 74, o: 0.55 },
    { x: 86, y: 18, w: 11, d: 64, o: 0.4 },
  ],
  storm: [
    { x: -2, y: -3, w: 17, d: 58, o: 0.72 },
    { x: 28, y: -5, w: 20, d: 72, o: 0.78 },
    { x: 58, y: -3, w: 19, d: 64, o: 0.74 },
    { x: 84, y: 8, w: 14, d: 52, o: 0.6 },
  ],
}

const DROPS: Record<Weather, number> = { clear: 0, cloudy: 0, rain: 12, storm: 18 }

const TINT: Record<Phase, Record<Weather, string>> = {
  day: {
    clear: 'radial-gradient(ellipse 60% 80% at 92% 0, rgba(246,203,90,0.2), transparent 62%)',
    cloudy: 'linear-gradient(180deg, rgba(120,140,140,0.18), transparent 70%)',
    rain: 'linear-gradient(180deg, rgba(40,68,72,0.5), rgba(14,38,40,0.22))',
    storm: 'linear-gradient(180deg, rgba(22,36,48,0.66), rgba(10,24,30,0.34))',
  },
  night: {
    clear: 'transparent',
    cloudy: 'linear-gradient(180deg, rgba(8,24,26,0.28), transparent 70%)',
    rain: 'linear-gradient(180deg, rgba(6,20,26,0.5), rgba(6,20,24,0.22))',
    storm: 'linear-gradient(180deg, rgba(4,12,20,0.66), rgba(4,12,18,0.32))',
  },
}

function Cloud({ w, o, dark }: { w: number; o: number; dark: boolean }) {
  const fill = dark ? '#8fa3a6' : '#f4efe2'
  return (
    <svg viewBox="0 0 120 52" style={{ width: `${w}rem`, opacity: o }} className="block h-auto" aria-hidden="true">
      <defs>
        <linearGradient id={`hc-${dark ? 'd' : 'l'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fill} />
          <stop offset="1" stopColor={dark ? '#4f6468' : '#cfc9b6'} />
        </linearGradient>
      </defs>
      <path d="M22 46a16 16 0 0 1-1.5-31.9A24 24 0 0 1 66 8a20 20 0 0 1 29 13.5A15.5 15.5 0 0 1 98 46Z" fill={`url(#hc-${dark ? 'd' : 'l'})`} />
    </svg>
  )
}

/**
 * Everything behind the dashboard hero that follows the sky: the sun or moon (dimmed by the weather),
 * drifting clouds, a rain veil and the odd lightning flash. Mounted first inside the hero panel so the
 * greeting and Journie stay above it.
 */
export function HeroScene() {
  const sky = useSky()
  const effects = useWeatherStore((state) => state.effects)
  const clouds = CLOUDS[sky.weather]
  const drops = effects ? DROPS[sky.weather] : 0
  const wet = drops > 0
  const dark = sky.weather === 'rain' || sky.weather === 'storm' || sky.night

  return (
    <div className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden" aria-hidden="true" data-weather={sky.weather}>
      <div className="absolute inset-0 transition-[background] duration-[1400ms]" style={{ background: TINT[sky.phase][sky.weather] }} />

      <div className="absolute right-[5.5%] top-5 hidden size-[5.2rem] transition-[opacity,filter] duration-[1400ms] lg:block" style={{ opacity: BODY_SHOW[sky.weather], filter: wet ? 'blur(2px)' : 'none' }}>
        <AnimatePresence mode="wait" initial={false}>
          {sky.night ? (
            <motion.svg key="moon" viewBox="0 0 100 100" className="size-full overflow-visible" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              <circle cx="50" cy="50" r="46" fill="rgba(255,244,205,0.14)" />
              <path d="M58 10A40 40 0 1 0 58 90A32 32 0 1 1 58 10Z" fill="#fff1c4" />
              <circle cx="36" cy="44" r="4" fill="#d9c98f" opacity="0.6" />
              <circle cx="44" cy="68" r="6" fill="#d9c98f" opacity="0.5" />
            </motion.svg>
          ) : (
            <motion.div key="sun" className="relative size-full" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              <div className="sky-sun-rays" style={{ inset: '-25%' }} />
              <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_36%_34%,#fff3c4,#f6c75a_55%,#eda63b)] shadow-[0_0_40px_10px_rgba(240,185,75,0.4)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {clouds.map((cloud, index) => (
          <motion.div key={`${sky.weather}-${index}`} className="hero-cloud" style={{ left: `${cloud.x}%`, top: `${cloud.y}%`, ['--dur' as string]: `${cloud.d}s`, ['--delay' as string]: `${-index * 9}s` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            <Cloud w={cloud.w} o={cloud.o} dark={dark} />
          </motion.div>
        ))}
      </AnimatePresence>

      {wet && (
        <div className="absolute inset-0">
          {Array.from({ length: drops }, (_, i) => (
            <span
              key={i}
              className="hero-drop"
              style={{
                left: `${(i * 37 + 11) % 104}%`,
                ['--len' as string]: `${14 + ((i * 13) % 20)}px`,
                ['--d' as string]: `${(sky.weather === 'storm' ? 1 : 1.5) + ((i * 7) % 5) * 0.12}s`,
                ['--delay' as string]: `${-((i * 0.37) % 1.4)}s`,
                opacity: 0.22 + ((i * 11) % 5) * 0.05,
              }}
            />
          ))}
          <div className="hero-mist" />
        </div>
      )}

      {effects && sky.weather === 'storm' && <div className="hero-flash" />}
    </div>
  )
}
