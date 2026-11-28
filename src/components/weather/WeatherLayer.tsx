import { useEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import type { Phase, Weather } from '../../store/weatherStore'

/**
 * Weather over the whole screen. Clouds are a cheap CSS layer that cross-fades; everything that
 * moves (rain with ground ripples, lightning, fireflies, stars, sun motes) lives on one canvas that
 * fades each effect in and out, stops itself when nothing is moving and pauses when the tab is hidden.
 * Time of day and weather are independent, so a rainy night has stars behind the clouds, light rain
 * and no sun.
 */

type Cloud = { top: string; scale: number; dur: number; delay: number; opacity: number }

const CLOUDS: Cloud[] = [
  { top: '4%', scale: 1.2, dur: 110, delay: -20, opacity: 1 },
  { top: '16%', scale: 0.8, dur: 150, delay: -90, opacity: 0.85 },
  { top: '9%', scale: 1.6, dur: 190, delay: -140, opacity: 0.7 },
  { top: '24%', scale: 1, dur: 130, delay: -60, opacity: 0.8 },
]

function CloudShape() {
  return (
    <svg viewBox="0 0 220 90" width="220" height="90" aria-hidden="true">
      <path
        d="M40 82C18 82 6 68 8 54C10 40 24 33 38 36C42 18 58 8 78 10C92 -2 122 -2 136 16C150 8 172 14 178 32C198 30 214 44 210 60C207 74 194 82 178 82Z"
        fill="currentColor"
      />
    </svg>
  )
}

const CLOUD_COLOR: Record<Phase, Record<Weather, string>> = {
  day: { clear: 'rgba(255,255,255,0.55)', cloudy: 'rgba(255,255,255,0.78)', rain: 'rgba(120,140,133,0.6)', storm: 'rgba(52,72,68,0.7)' },
  night: { clear: 'rgba(79,184,164,0.0)', cloudy: 'rgba(120,175,164,0.2)', rain: 'rgba(70,112,106,0.3)', storm: 'rgba(14,34,30,0.7)' },
}

type Props = {
  phase: Phase
  weather: Weather
  className?: string
  /** Gentler particles and clouds so content stays easy to read (used behind the workspace). */
  calm?: boolean
  /** Draw no moving particles at all (rain, lightning, fireflies); the clouds stay. */
  still?: boolean
}

export function WeatherLayer({ phase, weather, className = '', calm = false, still = false }: Props) {
  const reduced = (useReducedMotion() ?? false) || still
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const skyRef = useRef({ phase, weather, calm })
  const wake = useRef<() => void>(() => undefined)

  useEffect(() => {
    skyRef.current = { phase, weather, calm }
    wake.current()
  }, [phase, weather, calm])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reduced) return
    return startEngine(canvas, skyRef, (fn) => {
      wake.current = fn
    })
  }, [reduced])

  const cloudColor = CLOUD_COLOR[phase][weather]
  const cloudOpacity = useMemo(() => (weather === 'clear' ? (phase === 'day' ? 0.7 : 0) : 1) * (calm ? 0.55 : 1), [weather, phase, calm])

  return (
    <div className={className} aria-hidden="true">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-[opacity,color] duration-[1400ms]" style={{ opacity: cloudOpacity, color: cloudColor }}>
        {CLOUDS.map((cloud, index) => (
          <div key={index} className="sky-cloud" style={{ top: cloud.top, ['--dur' as string]: `${cloud.dur}s`, ['--delay' as string]: `${cloud.delay}s`, opacity: cloud.opacity }}>
            <div style={{ transform: `scale(${cloud.scale})`, transformOrigin: 'left top' }}>
              <CloudShape />
            </div>
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[45] size-full" />
    </div>
  )
}

/* ───────── particle engine ───────── */

type Drop = { x: number; y: number; len: number; speed: number; groundY: number; b: number }
type Ripple = { x: number; y: number; r: number; max: number }
type Fly = { x: number; y: number; ph: number; f: number; s: number }
type Star = { x: number; y: number; r: number; ph: number; f: number }
type Mote = { x: number; y: number; ph: number; s: number; r: number }

const RAIN_ALPHA = [0.25, 0.4, 0.55, 0.7]
const rand = (a: number, b: number) => a + Math.random() * (b - a)

type SkyRef = { current: { phase: Phase; weather: Weather; calm: boolean } }

function startEngine(canvas: HTMLCanvasElement, skyRef: SkyRef, register: (wake: () => void) => void) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  let w = 0
  let h = 0
  let raf = 0
  let last = 0
  let running = false
  let flash = 0
  let nextBolt = 6
  let bolt: [number, number][] | null = null
  let boltLife = 0
  let shoot: { x: number; y: number; life: number } | null = null
  let nextShoot = 5
  let time = 0

  // Per-effect intensity, eased toward 1 when active and 0 otherwise.
  const level = { rain: 0, storm: 0, night: 0, sun: 0, clarity: 1 }

  const drops: Drop[] = []
  const ripples: Ripple[] = []
  const flies: Fly[] = Array.from({ length: 26 }, () => ({ x: Math.random(), y: rand(0.45, 0.95), ph: rand(0, 6.28), f: rand(0.2, 0.55), s: rand(0.6, 1) }))
  const calmFlies = flies.slice(0, 9)
  const stars: Star[] = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.62, r: rand(0.5, 1.5), ph: rand(0, 6.28), f: rand(0.6, 2) }))
  const motes: Mote[] = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), ph: rand(0, 6.28), s: rand(0.015, 0.05), r: rand(1, 2.6) }))

  const glow = document.createElement('canvas')
  glow.width = glow.height = 48
  const gctx = glow.getContext('2d')!
  const grad = gctx.createRadialGradient(24, 24, 0, 24, 24, 24)
  grad.addColorStop(0, 'rgba(255,236,170,1)')
  grad.addColorStop(0.25, 'rgba(240,185,75,0.7)')
  grad.addColorStop(1, 'rgba(240,185,75,0)')
  gctx.fillStyle = grad
  gctx.fillRect(0, 0, 48, 48)

  const resize = () => {
    w = window.innerWidth
    h = window.innerHeight
    const pw = Math.round(w * dpr)
    const ph = Math.round(h * dpr)
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }
  resize()
  let pendingResize = 0
  const onResize = () => {
    cancelAnimationFrame(pendingResize)
    pendingResize = requestAnimationFrame(resize)
  }
  window.addEventListener('resize', onResize)

  const spawnDrop = (storm: boolean): Drop => ({
    x: rand(-60, w + 60),
    y: rand(-h * 0.2, h),
    len: rand(10, storm ? 30 : 22),
    speed: rand(storm ? 950 : 620, storm ? 1500 : 940),
    groundY: rand(h * 0.82, h * 0.99),
    b: Math.floor(Math.random() * RAIN_ALPHA.length),
  })

  const makeBolt = (): [number, number][] => {
    const pts: [number, number][] = []
    let x = rand(w * 0.15, w * 0.85)
    let y = -10
    const end = rand(h * 0.35, h * 0.62)
    while (y < end) {
      pts.push([x, y])
      x += rand(-26, 26)
      y += rand(18, 42)
    }
    return pts
  }

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    last = now
    time += dt
    const { phase, weather, calm } = skyRef.current
    const dark = phase === 'night'
    const ease = 1 - Math.exp(-dt * 2.2)
    const target = {
      rain: weather === 'rain' ? 1 : 0,
      storm: weather === 'storm' ? 1 : 0,
      night: phase === 'night' ? 1 : 0,
      sun: phase === 'day' ? (weather === 'clear' ? 1 : weather === 'cloudy' ? 0.35 : 0) : 0,
      // how much of the night sky is visible through the weather
      clarity: { clear: 1, cloudy: 0.55, rain: 0.14, storm: 0 }[weather],
    }

    ;(Object.keys(level) as (keyof typeof level)[]).forEach((key) => {
      level[key] += (target[key] - level[key]) * ease
    })

    const clarity = level.clarity
    ctx.clearRect(0, 0, w, h)

    /* rain and storm */
    const wet = Math.max(level.rain, level.storm)
    if (wet > 0.01) {
      const stormy = level.storm > level.rain
      const want = Math.round(Math.min(220, Math.max(50, w / 8)) * (stormy ? 1.35 : 1) * (calm ? 0.45 : 0.8))
      while (drops.length < want) drops.push(spawnDrop(stormy))
      if (drops.length > want + 40) drops.length = want

      const gust = stormy ? 0.26 + Math.sin(time * 0.7) * 0.07 : 0.12 + Math.sin(time * 0.4) * 0.02
      ctx.lineCap = 'round'
      ctx.lineWidth = stormy ? 1.3 : 1
      const rgb = dark ? '196,228,224' : '36,82,72'
      const alphaScale = wet * (dark ? 0.8 : 0.55) * (calm ? 0.42 : 0.7)
      for (const d of drops) {
        d.y += d.speed * dt
        d.x -= d.speed * dt * gust
        if (d.y >= d.groundY) {
          if (ripples.length < (calm ? 14 : 30) && Math.random() < 0.4) ripples.push({ x: d.x, y: d.groundY, r: 1, max: rand(10, 24) })
          Object.assign(d, spawnDrop(stormy), { y: -rand(10, 80) })
        }
      }
      // One path per alpha bucket instead of one stroke (and one colour string) per drop.
      for (let b = 0; b < RAIN_ALPHA.length; b += 1) {
        ctx.strokeStyle = `rgba(${rgb},${RAIN_ALPHA[b] * alphaScale})`
        ctx.beginPath()
        for (const d of drops) {
          if (d.b !== b) continue
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + d.len * gust, d.y - d.len)
        }
        ctx.stroke()
      }
      ctx.lineWidth = 1
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i]
        r.r += dt * 34
        const p = r.r / r.max
        if (p >= 1) {
          ripples.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `rgba(${rgb},${(1 - p) * 0.4 * wet * (calm ? 0.45 : 0.8)})`
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, r.r, r.r * 0.32, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      if (level.storm > 0.3) {
        nextBolt -= dt
        if (nextBolt <= 0) {
          // Lightning is rare, and inside the workspace it is only a faint, slow glow (no bolt, no white-out).
          nextBolt = calm ? rand(20, 38) : rand(12, 22)
          if (!calm) {
            bolt = makeBolt()
            boltLife = 0.28
          }
          flash = 1
        }
      }
    } else if (drops.length) {
      drops.length = 0
      ripples.length = 0
    }

    if (bolt) {
      boltLife -= dt
      const a = Math.max(0, boltLife / 0.28)
      ctx.strokeStyle = `rgba(255,252,235,${a})`
      ctx.shadowColor = 'rgba(190,220,255,0.9)'
      ctx.shadowBlur = 14
      ctx.lineWidth = 2.2
      ctx.beginPath()
      bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
      ctx.shadowBlur = 0
      if (boltLife <= 0) bolt = null
    }
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(240,248,255,${flash * (calm ? 0.045 : 0.12)})`
      ctx.fillRect(0, 0, w, h)
      flash *= Math.exp(-dt * (calm ? 2.2 : 5))
    }

    /* night: stars, fireflies, a shooting star */
    if (level.night > 0.01 && clarity > 0.01) {
      const n = level.night
      for (const s of stars) {
        const tw = 0.45 + 0.55 * Math.sin(time * s.f + s.ph)
        ctx.fillStyle = `rgba(247,242,232,${tw * 0.85 * n * clarity * (calm ? 0.8 : 1)})`
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283)
        ctx.fill()
      }
      for (const f of calm ? calmFlies : flies) {
        const x = (f.x + Math.sin(time * f.f + f.ph) * 0.05) * w
        const y = (f.y + Math.cos(time * f.f * 0.8 + f.ph) * 0.04) * h
        const blink = 0.35 + 0.65 * Math.max(0, Math.sin(time * 1.4 * f.s + f.ph))
        ctx.globalAlpha = blink * n * (calm ? 0.5 : 0.9) * Math.max(0, clarity - 0.2)
        const size = 18 + 12 * f.s
        ctx.drawImage(glow, x - size / 2, y - size / 2, size, size)
      }
      ctx.globalAlpha = 1
      nextShoot -= dt
      if (nextShoot <= 0 && !shoot) {
        shoot = { x: rand(w * 0.1, w * 0.6), y: rand(0, h * 0.25), life: 1 }
        nextShoot = rand(8, 14)
      }
      if (shoot) {
        shoot.life -= dt * 1.4
        shoot.x += dt * 520
        shoot.y += dt * 240
        const g = ctx.createLinearGradient(shoot.x - 90, shoot.y - 42, shoot.x, shoot.y)
        g.addColorStop(0, 'rgba(255,240,190,0)')
        g.addColorStop(1, `rgba(255,240,190,${Math.max(0, shoot.life) * 0.9 * n})`)
        ctx.strokeStyle = g
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(shoot.x - 90, shoot.y - 42)
        ctx.lineTo(shoot.x, shoot.y)
        ctx.stroke()
        if (shoot.life <= 0) shoot = null
      }
    }

    /* sunny: warm dust drifting up through the light */
    if (level.sun > 0.01) {
      for (const m of motes) {
        m.y -= m.s * dt
        m.x += Math.sin(time * 0.6 + m.ph) * dt * 0.012
        if (m.y < -0.05) {
          m.y = 1.05
          m.x = Math.random()
        }
        const tw = 0.4 + 0.6 * Math.sin(time * 1.3 + m.ph)
        ctx.fillStyle = `rgba(240,185,75,${tw * (calm ? 0.35 : 0.55) * level.sun})`
        ctx.beginPath()
        ctx.arc(m.x * w, m.y * h, m.r, 0, 6.283)
        ctx.fill()
      }
    }

    const busy = target.rain + target.storm + target.night + target.sun > 0 || level.rain + level.storm + level.night + level.sun > 0.01 || Math.abs(level.clarity - target.clarity) > 0.01 || flash > 0.01
    if (busy && !document.hidden) raf = requestAnimationFrame(frame)
    else running = false
  }

  const wake = () => {
    if (running || document.hidden) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  register(wake)
  const onVisibility = () => wake()
  document.addEventListener('visibilitychange', onVisibility)
  wake()

  return () => {
    cancelAnimationFrame(raf)
    running = false
    cancelAnimationFrame(pendingResize)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
