import type { MotionValue } from 'motion/react'
import { Mist, ParallaxLayer, SceneFrame } from './primitives'
import { ridgePath } from './shapes'

const ridges = Array.from({ length: 9 }, (_, index) => ({
  path: ridgePath(1440, 130 + index * 44, 560, 16 + index * 2.4, index * 0.9, 1.25 + index * 0.08),
  opacity: 0.014 + index * 0.0045,
  strokeOpacity: 0.07 + index * 0.008,
}))

// Rows nearer the viewer drift further as the section scrolls. Grouping keeps it to four composited layers.
const layers = [
  { ridges: ridges.slice(0, 2), shift: -8 },
  { ridges: ridges.slice(2, 4), shift: -22 },
  { ridges: ridges.slice(4, 7), shift: -42 },
  { ridges: ridges.slice(7), shift: -64 },
]

/** Hà Giang: terraced hillsides stacked into the distance, with cloud sliding between them. */
export function TerracesScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <SceneFrame>
      <div className="absolute inset-x-0 bottom-0 h-[78%]">
        {layers.map((layer, index) => (
          <ParallaxLayer
            key={index}
            progress={progress}
            from={0}
            to={layer.shift}
            className="inset-x-0 bottom-0 h-full"
          >
            <svg className="h-full w-full" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" fill="none">
              {layer.ridges.map((ridge, ridgeIndex) => (
                <path
                  key={ridgeIndex}
                  d={ridge.path}
                  fill="#173f35"
                  fillOpacity={ridge.opacity}
                  stroke="#173f35"
                  strokeOpacity={ridge.strokeOpacity}
                  strokeWidth="1.2"
                />
              ))}
            </svg>
          </ParallaxLayer>
        ))}
      </div>
      <Mist count={5} seed={21} className="top-[22%] h-[60%]" />
    </SceneFrame>
  )
}
