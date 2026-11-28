import type { Phase, Weather } from '../../store/weatherStore'

/** How much of each body shows through the weather. */
const SUN_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.55, rain: 0.2, storm: 0.06 }
const MOON_SHOW: Record<Weather, number> = { clear: 1, cloudy: 0.6, rain: 0.28, storm: 0.1 }

/**
 * The sun by day and the moon by night, parked in the top corner of the workspace. When the time of day
 * changes one sinks and the other rises on the same slow arc (CSS transitions, transform only).
 */
export function SkyBody({ phase, weather, hidden = false }: { phase: Phase; weather: Weather; hidden?: boolean }) {
  const day = phase === 'day'
  if (hidden) return null
  return (
    <div className="sky-body" aria-hidden="true">
      <div className="sky-sun" data-up={day} style={{ ['--show' as string]: SUN_SHOW[weather] }}>
        <div className="sky-sun-rays" />
        <div className="sky-sun-disc" />
      </div>
      <div className="sky-moon" data-up={!day} style={{ ['--show' as string]: MOON_SHOW[weather] }}>
        <div className="sky-moon-glow" />
        <svg viewBox="0 0 100 100" className="sky-moon-disc">
          <defs>
            <radialGradient id="moon-fill" cx="36%" cy="34%" r="75%">
              <stop offset="0" stopColor="#fffbe8" />
              <stop offset="0.6" stopColor="#f2e6bd" />
              <stop offset="1" stopColor="#d7c88f" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#moon-fill)" />
          <circle cx="36" cy="38" r="8" fill="#d3c387" opacity="0.55" />
          <circle cx="63" cy="30" r="5" fill="#d3c387" opacity="0.5" />
          <circle cx="60" cy="62" r="11" fill="#d3c387" opacity="0.45" />
          <circle cx="30" cy="66" r="4.5" fill="#d3c387" opacity="0.5" />
        </svg>
      </div>
    </div>
  )
}
