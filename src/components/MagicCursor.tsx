import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '../hooks/useMotionPrefs'

/** Window event other components can dispatch to scatter a burst of lamp-dust at a screen position. */
export const SPARKLE_EVENT = 'journie:sparkle'

export type SparkleDetail = { x: number; y: number; count?: number }

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  color: string
  star: boolean
  spin: number
}

const COLORS = [
  '#f0b94b',
  '#f0b94b',
  '#f6d27a',
  '#d96745',
  '#4fb8a4',
  '#fff6dc',
] as const

const MAX_PARTICLES = 90
const SPAWN_DISTANCE = 20

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.quadraticCurveTo(size * 0.14, -size * 0.14, size, 0)
  ctx.quadraticCurveTo(size * 0.14, size * 0.14, 0, size)
  ctx.quadraticCurveTo(-size * 0.14, size * 0.14, -size, 0)
  ctx.quadraticCurveTo(-size * 0.14, -size * 0.14, 0, -size)
  ctx.fill()
}

function CursorLayer() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!dot || !ring || !canvas || !ctx) return

    const particles: Particle[] = []
    const pointer = { x: -100, y: -100, seen: false }
    const follower = { x: -100, y: -100 }
    let lastSpawn = { x: -100, y: -100 }
    let pressed = false
    let interactive = false
    let frameId = 0
    let lastTime = 0
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawn = (x: number, y: number, count: number, burst = false) => {
      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = burst ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 1.6
        const speed = burst ? 40 + Math.random() * 90 : 8 + Math.random() * 26
        particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (burst ? 14 : 12),
          age: 0,
          life: 0.8 + Math.random() * 0.9,
          size: burst ? 3 + Math.random() * 4 : 2 + Math.random() * 3.4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          star: Math.random() < 0.62,
          spin: (Math.random() - 0.5) * 3,
        })
      }
    }

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time

      const ease = 1 - Math.exp(-dt / 0.07)
      follower.x += (pointer.x - follower.x) * ease
      follower.y += (pointer.y - follower.y) * ease
      const scale = pressed ? 0.8 : interactive ? 1.75 : 1
      ring.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0) translate(-50%, -50%) scale(${scale})`

      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]
        particle.age += dt
        if (particle.age >= particle.life) {
          particles.splice(i, 1)
          continue
        }
        particle.vx *= 1 - dt * 1.4
        particle.vy = particle.vy * (1 - dt * 1.2) - dt * 14
        particle.x += particle.vx * dt
        particle.y += particle.vy * dt

        const t = particle.age / particle.life
        const twinkle = 0.7 + 0.3 * Math.sin(particle.age * 18 + particle.spin * 5)
        ctx.globalAlpha = (1 - t) * (1 - t) * twinkle
        ctx.fillStyle = particle.color
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.spin * particle.age)
        const size = particle.size * (1 - t * 0.55)
        if (particle.star) {
          drawStar(ctx, size * 1.7)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      ctx.globalAlpha = 1

      const settled = Math.abs(pointer.x - follower.x) < 0.3 && Math.abs(pointer.y - follower.y) < 0.3
      if (particles.length > 0 || !settled) {
        frameId = requestAnimationFrame(render)
      } else {
        frameId = 0
      }
    }

    const wake = () => {
      if (frameId) return
      lastTime = performance.now()
      frameId = requestAnimationFrame(render)
    }

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointer.x = event.clientX
      pointer.y = event.clientY
      // A release outside the window never reaches pointerup, so recover from the first move without a button.
      if (pressed && event.buttons === 0) pressed = false

      if (!pointer.seen) {
        pointer.seen = true
        follower.x = pointer.x
        follower.y = pointer.y
        lastSpawn = { x: pointer.x, y: pointer.y }
        dot.style.opacity = '1'
        ring.style.opacity = '1'
      }

      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`

      if (Math.hypot(pointer.x - lastSpawn.x, pointer.y - lastSpawn.y) > SPAWN_DISTANCE) {
        spawn(pointer.x, pointer.y, 1)
        lastSpawn = { x: pointer.x, y: pointer.y }
      }
      wake()
    }

    const handleOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const next = Boolean(target?.closest('a, button, summary, [data-cursor]'))
      if (next !== interactive) {
        interactive = next
        ring.dataset.active = String(next)
        wake()
      }
    }

    const handleDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pressed = true
      spawn(event.clientX, event.clientY, 12, true)
      wake()
    }

    const handleUp = () => {
      pressed = false
      wake()
    }

    const handleLeave = () => {
      dot.style.opacity = '0'
      ring.style.opacity = '0'
      pointer.seen = false
    }

    const handleSparkle = (event: Event) => {
      const { x, y, count = 14 } = (event as CustomEvent<SparkleDetail>).detail
      spawn(x, y, count, true)
      wake()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handleMove, { passive: true })
    window.addEventListener('pointerover', handleOver, { passive: true })
    window.addEventListener('pointerdown', handleDown, { passive: true })
    window.addEventListener('pointerup', handleUp, { passive: true })
    window.addEventListener('pointercancel', handleUp, { passive: true })
    window.addEventListener('blur', handleUp)
    document.documentElement.addEventListener('pointerleave', handleLeave)
    window.addEventListener(SPARKLE_EVENT, handleSparkle)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerover', handleOver)
      window.removeEventListener('pointerdown', handleDown)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      window.removeEventListener('blur', handleUp)
      document.documentElement.removeEventListener('pointerleave', handleLeave)
      window.removeEventListener(SPARKLE_EVENT, handleSparkle)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[56]">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div ref={ringRef} data-active="false" className="magic-ring" style={{ opacity: 0 }} />
      <div ref={dotRef} className="magic-dot" style={{ opacity: 0 }} />
    </div>
  )
}

/** Soft lamp-glow cursor with a trail of stardust. Mouse and trackpad only; off under reduced motion. */
export function MagicCursor() {
  const { canPointerFx } = useMotionPrefs()
  return canPointerFx ? <CursorLayer /> : null
}
