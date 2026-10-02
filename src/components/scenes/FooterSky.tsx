import { useMemo } from 'react'
import { cssVars, seededRandom } from '../../utils/css'
import { SceneFrame } from './primitives'

/** Night sky for the footer: stars, a drifting dotted route echoing the logo, and a rare wishing star. */
export function FooterSky() {
  const stars = useMemo(() => {
    const random = seededRandom(23)
    return Array.from({ length: 42 }, () => ({
      x: random() * 100,
      y: random() * 100,
      size: 1 + random() * 2,
      duration: 2.5 + random() * 4.5,
      delay: -random() * 6,
    }))
  }, [])

  return (
    <SceneFrame>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 46% 70% at 14% 60%, rgba(79,184,164,0.2), transparent 70%), radial-gradient(ellipse 40% 55% at 88% 6%, rgba(112,92,196,0.24), transparent 70%), radial-gradient(ellipse 30% 40% at 50% 110%, rgba(240,185,75,0.12), transparent 70%)',
        }}
      />

      <div className="scene-hide-rm absolute inset-0">
        {stars.map((star, index) => (
          <span
            key={index}
            className="scene-star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              ...cssVars({ '--dur': `${star.duration}s`, '--delay': `${star.delay}s` }),
            }}
          />
        ))}
        <span className="scene-shoot" style={{ top: '8%', left: '58%' }} />
      </div>

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 1440 520"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          className="route-flow"
          d="M300 212C470 120 560 262 720 196S980 118 1100 176"
          stroke="rgba(240,185,75,0.5)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 15"
        />
        <circle cx="1100" cy="176" r="5" fill="#f0b94b" fillOpacity="0.85" />
      </svg>
    </SceneFrame>
  )
}
