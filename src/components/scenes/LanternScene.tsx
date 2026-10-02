import { Lantern, RisingLanterns, SceneFrame } from './primitives'
import { cssVars } from '../../utils/css'

// Strings hang from the top edge; lengths stay inside the section's top padding so copy is never covered.
const canopy = [
  { x: 4, string: 14, size: 30, palette: 0, delay: 0 },
  { x: 11, string: 40, size: 34, palette: 1, delay: -1.4 },
  { x: 19, string: 22, size: 28, palette: 2, delay: -0.6 },
  { x: 33, string: 36, size: 32, palette: 3, delay: -2.2 },
  { x: 47, string: 16, size: 28, palette: 0, delay: -3 },
  { x: 62, string: 38, size: 34, palette: 2, delay: -1 },
  { x: 74, string: 20, size: 30, palette: 1, delay: -2.6 },
  { x: 86, string: 42, size: 34, palette: 3, delay: -0.3 },
  { x: 95, string: 18, size: 28, palette: 0, delay: -1.8 },
] as const

/** Hội An: a canopy of swaying lanterns above, and a few drifting up from the river. */
export function LanternScene() {
  return (
    <SceneFrame>
      <div className="scene-glow absolute inset-x-0 top-0 h-48" />

      <div className="absolute left-0 top-0 h-48 w-full origin-top-left max-sm:w-[139%] max-sm:scale-[0.72]">
        {canopy.map((item, index) => (
          <div
            key={index}
            className="scene-sway absolute top-0 flex origin-top flex-col items-center"
            style={{
              left: `${item.x}%`,
              ...cssVars({ '--delay': `${item.delay}s`, '--dur': `${5 + (index % 3)}s` }),
            }}
          >
            <span className="block w-px bg-forest/35" style={{ height: item.string }} />
            <Lantern palette={item.palette} size={item.size} className="block" />
          </div>
        ))}
      </div>

      <RisingLanterns count={7} seed={14} clearCenter className="top-[20%]" />
    </SceneFrame>
  )
}
