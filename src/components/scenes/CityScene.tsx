import { useMemo } from 'react'
import type { MotionValue } from 'motion/react'
import { cssVars, seededRandom } from '../../utils/css'
import { Bokeh, ParallaxLayer, SceneFrame } from './primitives'

type Building = { x: number; w: number; h: number }

const midRise: Building[] = [
  { x: 20, w: 70, h: 120 }, { x: 96, w: 54, h: 170 }, { x: 156, w: 80, h: 110 },
  { x: 250, w: 60, h: 190 }, { x: 318, w: 88, h: 135 }, { x: 740, w: 70, h: 150 },
  { x: 818, w: 58, h: 205 }, { x: 884, w: 84, h: 125 }, { x: 980, w: 66, h: 180 },
  { x: 1054, w: 90, h: 140 }, { x: 1152, w: 62, h: 195 }, { x: 1222, w: 80, h: 120 },
  { x: 1312, w: 70, h: 165 }, { x: 1388, w: 60, h: 130 },
]

const lowRise: Building[] = Array.from({ length: 26 }, (_, index) => ({
  x: index * 58 - 10,
  w: 44 + ((index * 17) % 22),
  h: 50 + ((index * 37) % 60),
}))

const bokehColors = ['rgba(240,185,75,0.9)', 'rgba(217,103,69,0.85)', 'rgba(247,242,232,0.7)'] as const

/** Sài Gòn at dusk: Landmark 81, Bitexco and a skyline that lights up window by window. */
export function CityScene({ progress }: { progress: MotionValue<number> }) {
  const { staticPath, twinkling } = useMemo(() => {
    const random = seededRandom(81)
    const lit: { x: number; y: number; delay: number; duration: number }[] = []

    midRise.forEach((building) => {
      for (let row = 0; row < Math.floor(building.h / 16); row++) {
        for (let col = 0; col < Math.floor(building.w / 14); col++) {
          if (random() > 0.34) continue
          lit.push({
            x: building.x + 7 + col * 14,
            y: 330 - building.h + 10 + row * 16,
            delay: random() * 6,
            duration: 3 + random() * 5,
          })
        }
      }
    })

    // Landmark 81 (tall, stepped) at x≈560
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 3; col++) {
        if (random() > 0.5) continue
        lit.push({ x: 548 + col * 11, y: 118 + row * 8.5, delay: random() * 6, duration: 3 + random() * 5 })
      }
    }

    // Animating every window repaints the whole SVG each frame; keep most still and let a few twinkle.
    const twinkling = lit.filter((_, index) => index % 6 === 0)
    const staticPath = lit
      .filter((_, index) => index % 6 !== 0)
      .map((window) => `M${window.x} ${window.y}h3.5v5.5h-3.5z`)
      .join('')

    return { staticPath, twinkling }
  }, [])

  const stars = useMemo(() => {
    const random = seededRandom(7)
    return Array.from({ length: 26 }, () => ({
      x: random() * 100,
      y: random() * 42,
      size: 1 + random() * 1.8,
      duration: 2.5 + random() * 4,
      delay: -random() * 6,
    }))
  }, [])

  return (
    <SceneFrame>
      <div className="scene-dusk absolute inset-0" />

      <div className="scene-hide-rm absolute inset-x-0 top-0 h-[55%]">
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
        <span className="scene-shoot" />
      </div>

      <ParallaxLayer progress={progress} from={0} to={-40} className="inset-x-0 bottom-0 h-[15rem]">
        <svg className="h-full w-full" viewBox="0 0 1440 340" preserveAspectRatio="xMidYMax slice" fill="none">
          <g fill="#0e2a23" fillOpacity="0.55">
            {lowRise.map((building, index) => (
              <rect key={index} x={building.x} y={340 - building.h - 20} width={building.w} height={building.h + 20} />
            ))}
          </g>
        </svg>
      </ParallaxLayer>

      <ParallaxLayer progress={progress} from={0} to={-72} className="inset-x-0 bottom-0 h-[22rem]">
        <svg className="h-full w-full" viewBox="0 0 1440 340" preserveAspectRatio="xMidYMax slice" fill="none">
          <g fill="#0b221c">
            {midRise.map((building, index) => (
              <rect key={index} x={building.x} y={330 - building.h} width={building.w} height={building.h + 10} />
            ))}
            {/* Landmark 81 */}
            <path d="M540 340V150l6-12h34l6 12v190z" />
            <path d="M548 138V96l8-10h18l8 10v42z" />
            <path d="M559 86V40l5-22 5 22v46z" />
            {/* Bitexco */}
            <path d="M650 340V176q0-18 12-30l26 -16v210z" />
            <ellipse cx="658" cy="150" rx="22" ry="5" />
          </g>
          <g fill="#f0b94b">
            <path d={staticPath} fillOpacity="0.8" />
            {twinkling.map((window, index) => (
              <rect
                key={index}
                className="scene-window"
                x={window.x}
                y={window.y}
                width="3.5"
                height="5.5"
                style={cssVars({ '--dur': `${window.duration}s`, '--delay': `${window.delay}s` })}
              />
            ))}
          </g>
        </svg>
      </ParallaxLayer>

      <div className="scene-hide-rm absolute inset-x-0 bottom-0 h-8 overflow-hidden">
        {Array.from({ length: 9 }, (_, index) => (
          <span
            key={index}
            className="scene-streak"
            style={{
              top: `${12 + (index % 3) * 28}%`,
              background:
                index % 2
                  ? 'linear-gradient(90deg, transparent, rgba(240,185,75,0.9), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(217,103,69,0.9), transparent)',
              ...cssVars({
                '--dur': `${5 + (index % 4) * 1.6}s`,
                '--delay': `${-index * 1.1}s`,
                '--dir': index % 2 ? 'reverse' : 'normal',
              }),
            }}
          />
        ))}
      </div>

      <Bokeh count={9} colors={bokehColors} seed={31} className="bottom-0 h-[28rem]" />
    </SceneFrame>
  )
}
