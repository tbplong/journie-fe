import type { MotionValue } from 'motion/react'
import { Mist, ParallaxLayer, Rain, SceneFrame, Waves } from './primitives'
import { karstPath, type Peak } from './shapes'

const islets: Peak[] = [[160, 90, 70], [330, 140, 62], [540, 70, 56], [900, 120, 74], [1080, 80, 58], [1270, 130, 66]]

const waveLayers = [
  { height: 30, amplitude: 14, color: 'rgba(23,63,53,0.10)', duration: 34 },
  { height: 22, amplitude: 18, color: 'rgba(23,63,53,0.16)', duration: 26, reverse: true },
  { height: 15, amplitude: 22, color: 'rgba(23,63,53,0.24)', duration: 20 },
] as const

/** Hạ Long: islets in a bay, a junk riding the swell, and light rain — the weather case from the copy. */
export function BayScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <SceneFrame>
      <Rain count={22} className="top-0 h-[55%]" />

      <ParallaxLayer progress={progress} from={0} to={-18} className="inset-x-0 bottom-0 h-[10rem]">
        <svg className="h-full w-full" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d={karstPath(1440, 150, 200, islets)} fill="#173f35" fillOpacity="0.14" />
        </svg>
      </ParallaxLayer>

      <Mist count={3} seed={12} className="bottom-4 h-[9rem]" />

      <div className="scene-bob absolute bottom-[3.2rem] left-[58%] w-24 sm:w-32">
        <svg viewBox="0 0 120 80" fill="none" className="block w-full">
          <path d="M8 62h104l-12 12H22z" fill="#173f35" fillOpacity=".75" />
          <path d="M44 60V10l30 6-30 44z" fill="#d96745" fillOpacity=".8" />
          <path d="M80 60V22l22 5-22 33z" fill="#d96745" fillOpacity=".65" />
          <path d="M44 10v50M80 22v38" stroke="#173f35" strokeOpacity=".6" strokeWidth="1.6" />
        </svg>
      </div>

      <Waves layers={waveLayers} className="h-[7rem]" />
    </SceneFrame>
  )
}
