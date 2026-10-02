import type { MotionValue } from 'motion/react'
import { cssVars } from '../../utils/css'
import { ParallaxLayer, SceneFrame, Waves } from './primitives'

const waveLayers = [
  { height: 34, amplitude: 14, color: 'rgba(23,63,53,0.35)', duration: 38 },
  { height: 27, amplitude: 18, color: 'rgba(23,63,53,0.55)', duration: 30, reverse: true },
  { height: 20, amplitude: 22, color: 'rgba(23,63,53,0.78)', duration: 24 },
  { height: 12, amplitude: 26, color: 'rgba(24,35,31,0.95)', duration: 18, reverse: true },
] as const

function Palm({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  const fronds = [-70, -38, -8, 24, 54, 84, 118]

  return (
    <svg viewBox="0 0 220 320" className={className} fill="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <g
        className="scene-sway"
        style={{
          transformBox: 'view-box',
          transformOrigin: '96px 320px',
          ...cssVars({ '--dur': '7s', '--delay': flip ? '-3s' : '0s' }),
        }}
      >
        <path d="M96 320C100 240 108 170 138 96" stroke="#18231f" strokeWidth="9" strokeLinecap="round" />
        <g transform="translate(138 96)" fill="#18231f">
          {fronds.map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle})`}
              d="M0 0C30-34 92-40 138-6C94-22 40-14 0 0Z"
            />
          ))}
        </g>
      </g>
    </svg>
  )
}

/** Phú Quốc: the sun sinking behind a long swell, palms leaning in from the edges. */
export function SunsetScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <SceneFrame>
      <ParallaxLayer progress={progress} from={90} to={-30} className="right-[8%] top-[8%] w-[min(26rem,62vw)]">
        <div className="relative">
          <div className="scene-sun-halo absolute -inset-1/2" />
          <div className="scene-sun-disc relative aspect-square w-full rounded-full" />
        </div>
      </ParallaxLayer>

      <div className="absolute inset-x-0 bottom-[28%] h-[10%] overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className="scene-glint"
            style={{
              top: `${index * 17}%`,
              right: `${14 + (index % 3) * 4}%`,
              width: `${20 - index * 2}%`,
              ...cssVars({ '--dur': `${3 + index * 0.6}s`, '--delay': `${-index * 0.7}s` }),
            }}
          />
        ))}
      </div>

      <Waves layers={waveLayers} className="h-[38%]" />

      <Palm className="absolute -right-8 bottom-[3%] w-44 sm:right-[2%] sm:w-56" />
      <Palm flip className="absolute bottom-[1%] right-[22%] hidden w-32 opacity-90 sm:block lg:right-[24%]" />
    </SceneFrame>
  )
}
