import { useId } from 'react'
import type { MotionValue } from 'motion/react'
import { Birds, Mist, ParallaxLayer, SceneFrame } from './primitives'
import { karstPath, type Peak } from './shapes'

const farPeaks: Peak[] = [[90, 150, 62], [270, 230, 84], [470, 170, 70], [690, 265, 96], [900, 190, 76], [1110, 250, 92], [1330, 180, 72]]
const midPeaks: Peak[] = [[180, 190, 78], [410, 130, 64], [610, 240, 90], [830, 150, 70], [1040, 220, 86], [1260, 160, 74], [1420, 200, 60]]
const nearPeaks: Peak[] = [[40, 110, 60], [340, 160, 74], [560, 100, 58], [980, 140, 72], [1190, 120, 62], [1400, 170, 80]]

/** Ninh Bình: limestone towers fading into river mist under a low sun. */
export function KarstScene({ progress }: { progress: MotionValue<number> }) {
  const gradientId = `karst-${useId().replace(/:/g, '')}`

  return (
    <SceneFrame>
      <div className="absolute -right-[6%] top-[2%] size-[38rem] max-sm:size-[24rem] max-sm:opacity-60">
        <div className="scene-sun size-full rounded-full" />
      </div>

      <ParallaxLayer progress={progress} from={0} to={-26} className="inset-x-0 bottom-0 h-[64%]">
        <svg className="h-full w-full" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" fill="none">
          <defs>
            <linearGradient id={`${gradientId}-far`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#173f35" stopOpacity="0.16" />
              <stop offset="1" stopColor="#173f35" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${gradientId}-mid`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#173f35" stopOpacity="0.24" />
              <stop offset="1" stopColor="#173f35" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d={karstPath(1440, 380, 420, farPeaks)} fill={`url(#${gradientId}-far)`} />
        </svg>
      </ParallaxLayer>

      <Mist count={3} seed={4} className="top-[34%] h-[40%]" />

      <ParallaxLayer progress={progress} from={0} to={-54} className="inset-x-0 bottom-0 h-[50%]">
        <svg className="h-full w-full" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d={karstPath(1440, 290, 320, midPeaks)} fill={`url(#${gradientId}-mid)`} />
        </svg>
      </ParallaxLayer>

      <Mist count={3} seed={9} className="top-[54%] h-[38%]" />

      <ParallaxLayer progress={progress} from={0} to={-90} className="inset-x-0 bottom-0 h-[34%]">
        <svg className="h-full w-full" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d={karstPath(1440, 196, 220, nearPeaks)} fill="#173f35" fillOpacity="0.2" />
        </svg>
      </ParallaxLayer>

      <Birds />
    </SceneFrame>
  )
}
