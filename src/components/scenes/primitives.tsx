import { useId, useMemo, useRef, type ReactNode } from 'react'
import { motion, useInView, type MotionValue } from 'motion/react'
import { useParallax } from '../../hooks/useMotionPrefs'
import { cssVars, seededRandom } from '../../utils/css'
import { wavePath } from './shapes'

/**
 * Absolute backdrop that pauses every CSS animation inside it while off-screen
 * (see `.scene` in index.css), so only the visible chapter is animating.
 */
export function SceneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const live = useInView(ref, { margin: '160px 0px' })

  return (
    <div ref={ref} aria-hidden="true" data-live={live} className={`scene ${className}`}>
      {children}
    </div>
  )
}

export function ParallaxLayer({
  progress,
  from,
  to,
  className = '',
  children,
}: {
  progress: MotionValue<number>
  from: number
  to: number
  className?: string
  children: ReactNode
}) {
  const y = useParallax(progress, from, to)

  return (
    <motion.div className={`absolute will-change-transform ${className}`} style={{ y }}>
      {children}
    </motion.div>
  )
}

type MistProps = {
  count?: number
  /** CSS colour of the mist, usually semi-transparent white. */
  color?: string
  seed?: number
  className?: string
}

/** Soft horizontal bands of fog drifting at different speeds. */
export function Mist({ count = 4, color = 'rgba(255, 252, 244, 0.85)', seed = 3, className = 'top-0 h-full' }: MistProps) {
  const bands = useMemo(() => {
    const random = seededRandom(seed)
    return Array.from({ length: count }, (_, index) => ({
      top: 6 + (index / count) * 78 + random() * 8,
      width: 55 + random() * 40,
      left: -10 + random() * 60,
      height: 16 + random() * 14,
      duration: 26 + random() * 24,
      delay: -random() * 30,
      opacity: 0.45 + random() * 0.4,
    }))
  }, [count, seed])

  return (
    <div className={`absolute inset-x-0 ${className}`}>
      {bands.map((band, index) => (
        <span
          key={index}
          className="scene-mist"
          style={{
            top: `${band.top}%`,
            left: `${band.left}%`,
            width: `${band.width}%`,
            height: `${band.height}%`,
            opacity: band.opacity,
            background: `radial-gradient(closest-side, ${color}, transparent)`,
            ...cssVars({ '--dur': `${band.duration}s`, '--delay': `${band.delay}s` }),
          }}
        />
      ))}
    </div>
  )
}

// Each divides 1440 exactly, so the 200%-wide strip loops seamlessly at -50%.
const WAVELENGTHS = [480, 360, 288, 240] as const

type WaveLayer = {
  /** Height of the layer as a percentage of the frame. */
  height: number
  amplitude: number
  color: string
  duration: number
  reverse?: boolean
}

/** Looping wave bands stacked from back to front. */
export function Waves({ layers, className = 'h-full' }: { layers: readonly WaveLayer[]; className?: string }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 ${className}`}>
      {layers.map((layer, index) => (
        <div
          key={index}
          className="absolute inset-x-0 bottom-0 overflow-hidden"
          style={{ height: `${layer.height}%` }}
        >
          <svg
            className="scene-wave h-full w-[200%] max-w-none"
            viewBox="0 0 2880 200"
            preserveAspectRatio="none"
            style={cssVars({
              '--dur': `${layer.duration}s`,
              '--dir': layer.reverse ? 'reverse' : 'normal',
            })}
          >
            <path d={wavePath(2880, 200, layer.amplitude, WAVELENGTHS[index % WAVELENGTHS.length])} fill={layer.color} />
          </svg>
        </div>
      ))}
    </div>
  )
}

const lanternPalette = [
  ['#e0583a', '#f0b94b'],
  ['#f0b94b', '#e0583a'],
  ['#c8402c', '#f6d27a'],
  ['#d96745', '#f7e0a0'],
] as const

export function Lantern({ palette = 0, size, className = '' }: { palette?: number; size?: number; className?: string }) {
  const [shell, glow] = lanternPalette[palette % lanternPalette.length]
  const id = `lantern-${useId().replace(/:/g, '')}`

  return (
    <svg viewBox="0 0 40 72" className={className} style={size ? { width: size } : undefined} fill="none">
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={glow} />
          <stop offset="100%" stopColor={shell} />
        </radialGradient>
      </defs>
      <rect x="14" y="2" width="12" height="5" rx="1.5" fill="#173f35" />
      <ellipse cx="20" cy="30" rx="17" ry="22" fill={`url(#${id})`} />
      <path d="M20 8c-8 9-8 35 0 44M20 8c8 9 8 35 0 44M20 8v44" stroke="#173f35" strokeOpacity=".28" strokeWidth=".9" />
      <rect x="14" y="51" width="12" height="5" rx="1.5" fill="#173f35" />
      <path d="M20 56v13M17 56l-1 11M23 56l1 11" stroke={shell} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

type RisingLanternsProps = {
  count?: number
  seed?: number
  className?: string
  /** Fraction of the frame width kept clear in the middle, so copy stays readable. */
  clearCenter?: boolean
}

/** Lanterns that drift upward and fade, with near ones large and sharp, far ones small and soft. */
export function RisingLanterns({ count = 8, seed = 11, clearCenter = false, className = 'top-0 h-full' }: RisingLanternsProps) {
  const items = useMemo(() => {
    const random = seededRandom(seed)
    return Array.from({ length: count }, (_, index) => {
      const depth = random()
      const side = index % 2 === 0 ? 0 : 1
      const x = clearCenter ? (side ? 70 + random() * 26 : 2 + random() * 24) : 4 + random() * 92
      return {
        x,
        size: 16 + depth * 34,
        blur: (1 - depth) * 1.6,
        opacity: 0.45 + depth * 0.5,
        duration: 18 + (1 - depth) * 18 + random() * 6,
        delay: -random() * 30,
        drift: (random() - 0.5) * 90,
        palette: index,
      }
    })
  }, [count, seed, clearCenter])

  return (
    <div className={`scene-hide-rm absolute inset-x-0 ${className}`}>
      {items.map((item, index) => (
        <span
          key={index}
          className="scene-lantern"
          style={{
            left: `${item.x}%`,
            width: item.size,
            filter: item.blur > 0.3 ? `blur(${item.blur.toFixed(1)}px)` : undefined,
            ...cssVars({
              '--o': item.opacity.toFixed(2),
              '--dur': `${item.duration}s`,
              '--delay': `${item.delay}s`,
              '--drift': `${item.drift}px`,
            }),
          }}
        >
          <Lantern palette={item.palette} className="block w-full" />
        </span>
      ))}
    </div>
  )
}

/** Diagonal rain streaks. Hidden entirely under reduced motion. */
export function Rain({ count = 26, color = 'rgba(23, 63, 53, 0.35)', seed = 5, className = 'top-0 h-full' }: {
  count?: number
  color?: string
  seed?: number
  className?: string
}) {
  const drops = useMemo(() => {
    const random = seededRandom(seed)
    return Array.from({ length: count }, () => ({
      x: random() * 100,
      length: 18 + random() * 26,
      duration: 0.9 + random() * 0.9,
      delay: -random() * 2,
      opacity: 0.25 + random() * 0.55,
    }))
  }, [count, seed])

  return (
    <div className={`scene-hide-rm absolute inset-x-0 overflow-hidden ${className}`}>
      {drops.map((drop, index) => (
        <span
          key={index}
          className="scene-rain"
          style={{
            left: `${drop.x}%`,
            height: drop.length,
            opacity: drop.opacity,
            background: `linear-gradient(to bottom, transparent, ${color})`,
            ...cssVars({ '--dur': `${drop.duration}s`, '--delay': `${drop.delay}s` }),
          }}
        />
      ))}
    </div>
  )
}

/** Out-of-focus city lights and glints. */
export function Bokeh({ count = 16, colors, seed = 17, className = 'top-0 h-full' }: {
  count?: number
  colors: readonly string[]
  seed?: number
  className?: string
}) {
  const dots = useMemo(() => {
    const random = seededRandom(seed)
    return Array.from({ length: count }, (_, index) => ({
      x: random() * 100,
      y: 30 + random() * 65,
      size: 10 + random() * 46,
      color: colors[index % colors.length],
      duration: 4 + random() * 7,
      delay: -random() * 8,
      opacity: 0.25 + random() * 0.5,
    }))
  }, [count, colors, seed])

  return (
    <div className={`absolute inset-x-0 ${className}`}>
      {dots.map((dot, index) => (
        <span
          key={index}
          className="scene-bokeh"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            background: `radial-gradient(circle, ${dot.color}, transparent 70%)`,
            ...cssVars({ '--o': dot.opacity.toFixed(2), '--dur': `${dot.duration}s`, '--delay': `${dot.delay}s` }),
          }}
        />
      ))}
    </div>
  )
}

/** A few birds crossing the sky. */
export function Birds({ color = 'rgba(23, 63, 53, 0.55)', className = '' }: { color?: string; className?: string }) {
  const flock = [
    { top: 14, size: 22, duration: 46, delay: -6 },
    { top: 21, size: 15, duration: 58, delay: -26 },
    { top: 9, size: 12, duration: 70, delay: -40 },
  ]

  return (
    <div className={`scene-hide-rm absolute inset-0 ${className}`}>
      {flock.map((bird, index) => (
        <span
          key={index}
          className="scene-bird"
          style={{
            top: `${bird.top}%`,
            width: bird.size,
            ...cssVars({ '--dur': `${bird.duration}s`, '--delay': `${bird.delay}s` }),
          }}
        >
          <svg viewBox="0 0 24 10" fill="none" className="scene-flap block w-full">
            <path d="M0 6q6-8 12-1 6-7 12 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  )
}
