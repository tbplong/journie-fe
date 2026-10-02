import { AnimatePresence, motion } from 'motion/react'
import type { Atmosphere } from '../../content/site'
import { cssVars } from '../../utils/css'
import { Birds, Bokeh, Mist, RisingLanterns, SceneFrame, Waves } from './primitives'

const cityColors = ['rgba(240,185,75,0.95)', 'rgba(217,103,69,0.9)', 'rgba(247,242,232,0.8)'] as const

const bayWaves = [
  { height: 26, amplitude: 14, color: 'rgba(247,242,232,0.10)', duration: 34 },
  { height: 17, amplitude: 18, color: 'rgba(247,242,232,0.14)', duration: 26, reverse: true },
  { height: 10, amplitude: 22, color: 'rgba(247,242,232,0.2)', duration: 20 },
] as const

const mistWhite = 'rgba(247, 250, 246, 0.8)'

function Glints() {
  return (
    <div className="scene-hide-rm absolute inset-x-0 bottom-[8%] h-[24%] overflow-hidden">
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="scene-glint"
          style={{
            top: `${(index * 29) % 92}%`,
            left: `${(index * 37) % 88}%`,
            width: `${6 + (index % 4) * 3}%`,
            ...cssVars({ '--dur': `${2.4 + (index % 5) * 0.7}s`, '--delay': `${-index * 0.6}s` }),
          }}
        />
      ))}
    </div>
  )
}

function Layers({ kind }: { kind: Atmosphere }) {
  switch (kind) {
    case 'highland':
      return <Mist count={6} color={mistWhite} seed={41} className="top-[20%] h-[75%]" />
    case 'bay':
      return (
        <>
          <Mist count={3} color={mistWhite} seed={43} className="top-[35%] h-[45%]" />
          <Waves layers={bayWaves} className="h-[30%]" />
        </>
      )
    case 'karst':
      return (
        <>
          <Mist count={4} color={mistWhite} seed={47} className="top-[30%] h-[60%]" />
          <Birds color="rgba(247,242,232,0.7)" />
        </>
      )
    case 'lanterns':
      return <RisingLanterns count={11} seed={49} />
    case 'city':
      return <Bokeh count={20} colors={cityColors} seed={53} className="top-[30%] h-[70%]" />
    case 'sunset':
      return (
        <>
          <Glints />
          <Waves
            layers={[
              { height: 14, amplitude: 16, color: 'rgba(247,242,232,0.12)', duration: 28 },
              { height: 8, amplitude: 20, color: 'rgba(247,242,232,0.2)', duration: 20, reverse: true },
            ]}
            className="h-[22%]"
          />
        </>
      )
  }
}

/** Light-toned weather and life layered over a destination photo; cross-fades when the place changes. */
export function DestinationAtmosphere({ kind }: { kind: Atmosphere }) {
  return (
    <SceneFrame>
      <AnimatePresence>
        <motion.div
          key={kind}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        >
          <Layers kind={kind} />
        </motion.div>
      </AnimatePresence>
    </SceneFrame>
  )
}
