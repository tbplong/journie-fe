import { useEffect, useId, useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import { useSky, type Phase, type Weather } from '../../store/weatherStore'
import { useMascot, type MascotMood } from './mascot-context'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/*
 * One warm clay for the whole body with a deeper shade of the same hue for limbs and shadow, cream for the face and
 * belly, and the app's own terracotta, gold and jade: a terracotta carpet with a gold edge and a matching fez, which
 * stand out against both the green scenery and the cream pages. Flat fills only: no highlights and no glossy
 * parts, so Journie reads as one soft shape instead of a toy made of pieces.
 */
const FUR = '#c08c66'
const FUR_SHADE = '#a8764f'
const EAR_IN = '#e2bd9f'
const CREAM = '#f6e8d2'
const CREAM_SHADE = '#ecd9bc'
const EYE = '#2a1c15'
const BROW = '#6a4630'
const CHEEK = '#e8a090'
const GOLD = '#e2bd6a'
const GOLD_DEEP = '#b98f43'
const RUG = '#cc5636'
const RUG_DEEP = '#a23b27'
const FEZ = '#e0714d'
const FEZ_DEEP = '#b9553a'
const CAP = '#58bfa9'
const CAP_DEEP = '#3a9a86'
const SKIN_DEEP = '#7a2f22'

type Point = readonly [number, number]

/* ───────── arms: two short bones of fixed length, so a limb never stretches ───────── */

const BONE = 20
const REACH = BONE * 2
const SHOULDER = { left: [86, 134] as Point, right: [154, 134] as Point }

/** Two-bone IK: the elbow that reaches `target` with bones of fixed length, bent outward from the body. */
function solveArm(shoulder: Point, target: Point) {
  const dx = target[0] - shoulder[0]
  const dy = target[1] - shoulder[1]
  const dist = Math.hypot(dx, dy) || 1
  const d = clamp(dist, 6, REACH - 0.4)
  const hx = shoulder[0] + (dx / dist) * d
  const hy = shoulder[1] + (dy / dist) * d
  const base = Math.atan2(dy, dx)
  const bend = Math.acos(clamp(d / (2 * BONE), -1, 1))
  const a = [shoulder[0] + BONE * Math.cos(base + bend), shoulder[1] + BONE * Math.sin(base + bend)]
  const b = [shoulder[0] + BONE * Math.cos(base - bend), shoulder[1] + BONE * Math.sin(base - bend)]
  const outward = Math.abs(a[0] - 120) >= Math.abs(b[0] - 120) ? a : b
  return { ex: outward[0], ey: outward[1], hx, hy }
}

const REST: Record<'left' | 'right', Point> = { left: [74, 166], right: [166, 166] }
const UMBRELLA_HAND: Point = [188, 118]
const FAN_HAND: Point = [176, 114]

/** Where each hand goes for a mood (absolute, in the 240-wide drawing). Reach is clamped, so these only set direction. */
function handTargets(mood: MascotMood, umbrella: boolean): { left: Point; right: Point } {
  const t: { left: Point; right: Point } = (() => {
    switch (mood) {
      case 'hiding':
        return { left: [104, 101], right: [136, 101] }
      case 'peeking':
        return { left: [104, 101], right: REST.right }
      case 'thinking':
        return { left: REST.left, right: [132, 128] }
      case 'joy':
        return { left: [58, 102], right: [182, 102] }
      case 'wave':
        return { left: REST.left, right: [182, 100] }
      case 'hungry':
        return { left: [104, 172], right: [138, 172] }
      case 'hot':
        return { left: REST.left, right: FAN_HAND }
      case 'error':
        return { left: [92, 120], right: [148, 120] }
      default:
        return { left: REST.left, right: REST.right }
    }
  })()
  if (umbrella && mood !== 'hiding' && mood !== 'peeking') t.right = UMBRELLA_HAND
  return t
}

type ArmMotion = { hx: MotionValue<number>; hy: MotionValue<number>; finger: MotionValue<number>; angle: MotionValue<number> }

function useArm(side: 'left' | 'right'): ArmMotion {
  const hx = useSpring(REST[side][0], { stiffness: 190, damping: 18 })
  const hy = useSpring(REST[side][1], { stiffness: 190, damping: 18 })
  const finger = useSpring(0, { stiffness: 220, damping: 20 })
  const angle = useMotionValue(0)
  return { hx, hy, finger, angle }
}

function Arm({ side, arm }: { side: 'left' | 'right'; arm: ArmMotion }) {
  const shoulder = SHOULDER[side]
  const geometry = useTransform([arm.hx, arm.hy] as MotionValue<number>[], ([x, y]: number[]) => solveArm(shoulder, [x, y]))
  const d = useTransform(geometry, (g) => `M${shoulder[0]} ${shoulder[1]}L${g.ex.toFixed(1)} ${g.ey.toFixed(1)}L${g.hx.toFixed(1)} ${g.hy.toFixed(1)}`)
  const handX = useTransform(geometry, (g) => g.hx)
  const handY = useTransform(geometry, (g) => g.hy)
  return (
    <g>
      <motion.path d={d} stroke={FUR_SHADE} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <motion.g style={{ x: handX, y: handY }}>
        <circle r="8" fill={FUR_SHADE} />
        <motion.g style={{ rotate: arm.angle, scale: arm.finger, originX: 0, originY: 0 }}>
          <rect x="4" y="-3" width="13" height="6" rx="3" fill={FUR_SHADE} />
        </motion.g>
      </motion.g>
    </g>
  )
}

/* ───────── the flying carpet: a short ribbon that ripples, drawn fresh every frame ───────── */

const RUG_L = 40
const RUG_R = 200
const RUG_MID = (RUG_L + RUG_R) / 2
const RUG_HALF = (RUG_R - RUG_L) / 2
const STEPS = 26

function rugEdge(x: number, t: number, base: number, amp: number, phase: number) {
  const u = (x - RUG_MID) / RUG_HALF
  const wave = Math.sin(u * 3.1 + t * 2 + phase) * amp + Math.sin(u * 6.3 - t * 1.3 + phase) * amp * 0.3
  const curl = Math.abs(u) ** 3 * 7
  return base + wave - curl
}

const fmt = (n: number) => n.toFixed(1)

function buildRug(t: number, energy: number) {
  const amp = 1.6 + energy * 3.2
  const top: Point[] = []
  const bot: Point[] = []
  for (let i = 0; i <= STEPS; i += 1) {
    const x = lerp(RUG_L, RUG_R, i / STEPS)
    top.push([x, rugEdge(x, t, 211, amp, 0)])
    bot.push([x, rugEdge(x, t, 227, amp, 0.7)])
  }
  const at = (i: number, k: number): Point => [top[i][0], lerp(top[i][1], bot[i][1], k)]
  const poly = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p[0])} ${fmt(p[1])}`).join('')
  const body = `${poly(top)}${[...bot].reverse().map((p) => `L${fmt(p[0])} ${fmt(p[1])}`).join('')}Z`
  const trim = poly(top.map((_, i) => at(i, 0.3)))
  let dots = ''
  for (const u of [-0.45, 0, 0.45]) {
    const i = Math.round(((u * RUG_HALF + RUG_HALF) / (RUG_HALF * 2)) * STEPS)
    const c = at(i, 0.66)
    const slope = (at(Math.min(STEPS, i + 1), 0.66)[1] - at(Math.max(0, i - 1), 0.66)[1]) / 2
    const r = 2.6
    dots += `M${fmt(c[0] - r)} ${fmt(c[1] - slope)}L${fmt(c[0])} ${fmt(c[1] - r - slope)}L${fmt(c[0] + r)} ${fmt(c[1] + slope)}L${fmt(c[0])} ${fmt(c[1] + r + slope)}Z`
  }
  const tassel = (side: -1 | 1) => {
    const i = side < 0 ? 0 : STEPS
    let d = ''
    for (let k = 0; k <= 2; k += 1) {
      const p = at(i, 0.2 + k * 0.3)
      const sway = Math.sin(t * 2.6 + k * 0.9) * 1.3
      d += `M${fmt(p[0])} ${fmt(p[1])}Q${fmt(p[0] + side * 4)} ${fmt(p[1] + 0.5 + sway)} ${fmt(p[0] + side * 8)} ${fmt(p[1] + 1.4 + sway)}`
    }
    return d
  }
  return { body, top: poly(top), trim, dots, left: tassel(-1), right: tassel(1) }
}

function Carpet({ time, energy, uid }: { time: MotionValue<number>; energy: MotionValue<number>; uid: string }) {
  const rug = useTransform([time, energy], ([t, e]: number[]) => buildRug(t, e))
  const body = useTransform(rug, (r) => r.body)
  const topEdge = useTransform(rug, (r) => r.top)
  const trim = useTransform(rug, (r) => r.trim)
  const dots = useTransform(rug, (r) => r.dots)
  const left = useTransform(rug, (r) => r.left)
  const right = useTransform(rug, (r) => r.right)
  return (
    <g>
      <motion.path d={left} stroke={GOLD_DEEP} strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <motion.path d={right} stroke={GOLD_DEEP} strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <motion.path d={body} fill={`url(#${uid}-rug)`} />
      <motion.path d={trim} stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <motion.path d={topEdge} stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <motion.path d={dots} fill={GOLD} fillOpacity="0.8" />
    </g>
  )
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <path
      className="di-twinkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} ${y - size}Q${x + size * 0.18} ${y - size * 0.18} ${x + size} ${y}Q${x + size * 0.18} ${y + size * 0.18} ${x} ${y + size}Q${x - size * 0.18} ${y + size * 0.18} ${x - size} ${y}Q${x - size * 0.18} ${y - size * 0.18} ${x} ${y - size}Z`}
      fill={GOLD}
    />
  )
}

type Props = {
  className?: string
  /** Override the sky Journie dresses for (defaults to the current sky). */
  phase?: Phase
  weather?: Weather
  /** A few glints around the carpet. */
  trail?: boolean
  /** 0..1, how fast the carpet should flutter. */
  energy?: MotionValue<number>
  roll?: MotionValue<number>
}

/**
 * Journie: a small monkey mascot on a flying carpet, drawn as one soft flat shape (a round head-and-body bean, short
 * limbs of fixed length, a heart-shaped cream face) in the app's own colours. Looks at the pointer, points at the
 * control under it, covers its eyes for passwords, shakes its head on errors, pats its tummy when it is hungry,
 * fans itself when it is hot and dresses for the sky (fez or nightcap, sunglasses, umbrella). The umbrella stays up
 * whatever the mood while it rains.
 */
export function Di({ className = '', phase, weather, trail = true, energy, roll }: Props) {
  const { mood, focusPoint, pointAt = null, errorTick, originRef } = useMascot()
  const sky = useSky()
  const { tr } = useTr()
  const ph = phase ?? sky.phase
  const wx = weather ?? sky.weather
  const { reduced } = useMotionPrefs()
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId().replace(/:/g, '')

  const time = useMotionValue(0)
  const calmEnergy = useMotionValue(0)
  useAnimationFrame((t) => {
    if (!reduced) time.set(t / 1000)
  })

  const lookX = useMotionValue(0)
  const lookY = useMotionValue(0)
  const eyeX = useSpring(useTransform(lookX, (v) => v * 3.2), { stiffness: 220, damping: 20 })
  const eyeY = useSpring(useTransform(lookY, (v) => v * 2.6), { stiffness: 220, damping: 20 })
  const faceX = useSpring(useTransform(lookX, (v) => v * 5), { stiffness: 140, damping: 18 })
  const faceY = useSpring(useTransform(lookY, (v) => v * 3), { stiffness: 140, damping: 18 })
  const hatX = useSpring(useTransform(lookX, (v) => v * 2), { stiffness: 120, damping: 18 })
  const lean = useSpring(useTransform(lookX, (v) => v * 2), { stiffness: 60, damping: 16 })
  const rugTilt = useSpring(useTransform(lookX, (v) => v * 2), { stiffness: 70, damping: 14 })
  const noRoll = useMotionValue(0)
  const bodyRoll = useSpring(roll ?? noRoll, { stiffness: 120, damping: 16 })

  const left = useArm('left')
  const right = useArm('right')
  const target = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef(0)

  const raining = wx === 'rain' || wx === 'storm'
  const showUmbrella = raining && mood !== 'hiding' && mood !== 'peeking'
  const shades = ph === 'day' && wx === 'clear' && !pointAt && ['idle', 'watching', 'wave', 'hot'].includes(mood)
  const cap = ph === 'night'

  // Arms follow the mood. A few moods keep moving: the wave goes up and down, the tummy gets rubbed.
  useEffect(() => {
    const pointing = !!pointAt && !['hiding', 'peeking', 'sleepy'].includes(mood)
    if (pointing) return
    const base = handTargets(mood, showUmbrella)
    const apply = (dl: Point = [0, 0], dr: Point = [0, 0]) => {
      left.hx.set(base.left[0] + dl[0])
      left.hy.set(base.left[1] + dl[1])
      right.hx.set(base.right[0] + dr[0])
      right.hy.set(base.right[1] + dr[1])
    }
    left.finger.set(0)
    right.finger.set(0)
    apply()
    if (mood === 'wave' && !showUmbrella) {
      let up = true
      const timer = window.setInterval(() => {
        apply([0, 0], up ? [-5, 6] : [4, -6])
        up = !up
      }, 320)
      return () => window.clearInterval(timer)
    }
    if (mood === 'hungry') {
      let step = 0
      const timer = window.setInterval(() => {
        step += 1
        const k = step % 2 ? 1 : -1
        apply([k * 4, k * -3], showUmbrella ? [0, 0] : [-k * 4, k * -3])
      }, 520)
      return () => window.clearInterval(timer)
    }
  }, [mood, showUmbrella, pointAt, left, right])

  // Point at the control under the pointer with the arm on that side (not while the right hand holds the umbrella).
  useEffect(() => {
    const svg = svgRef.current
    if (!pointAt || !svg || ['hiding', 'peeking', 'sleepy'].includes(mood)) return
    const box = svg.getBoundingClientRect()
    const px = (pointAt.x - box.left) * (240 / box.width)
    const py = (pointAt.y - box.top) * (240 / box.height)
    const side: 'left' | 'right' = px < 120 ? 'left' : 'right'
    if (side === 'right' && showUmbrella) return
    const [sx, sy] = SHOULDER[side]
    const dist = Math.hypot(px - sx, py - sy) || 1
    const arm = side === 'left' ? left : right
    const other = side === 'left' ? right : left
    const rest = handTargets(mood, showUmbrella)[side === 'left' ? 'right' : 'left']
    arm.hx.set(sx + ((px - sx) / dist) * (REACH - 2))
    arm.hy.set(sy + ((py - sy) / dist) * (REACH - 2))
    arm.angle.set((Math.atan2(py - sy, px - sx) * 180) / Math.PI)
    arm.finger.set(1)
    other.hx.set(rest[0])
    other.hy.set(rest[1])
    other.finger.set(0)
  }, [pointAt, mood, showUmbrella, left, right])

  const aimLook = (x: number, y: number) => {
    const svg = svgRef.current
    if (!svg) return
    const box = svg.getBoundingClientRect()
    const headX = box.left + box.width * 0.5
    const headY = box.top + box.height * 0.41
    lookX.set(clamp((x - headX) / (box.width * 0.9), -1, 1))
    lookY.set(clamp((y - headY) / (box.height * 0.9), -1, 1))
  }

  useEffect(() => {
    target.current = focusPoint
    if (focusPoint) aimLook(focusPoint.x, focusPoint.y)
  })

  useEffect(() => {
    if (reduced) return
    const onMove = (event: PointerEvent) => {
      lastPointer.current = performance.now()
      if (!target.current) aimLook(event.clientX, event.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
    // aimLook only reads refs and stable motion values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  // Some moods have somewhere to look: down at the tummy when hungry, up when thinking.
  useEffect(() => {
    if (mood === 'hungry') {
      lookX.set(0)
      lookY.set(1)
    } else if (mood === 'thinking') {
      lookX.set(0.7)
      lookY.set(-0.8)
    }
  }, [mood, lookX, lookY])

  // When nobody is moving the pointer, Journie glances around on its own.
  useEffect(() => {
    if (reduced || mood === 'hungry' || mood === 'thinking') return
    const timer = window.setInterval(() => {
      if (target.current || performance.now() - lastPointer.current < 5000) return
      const still = Math.random() < 0.25
      lookX.set(still ? 0 : Math.random() * 1.6 - 0.8)
      lookY.set(still ? 0 : Math.random() * 0.9 - 0.4)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [reduced, mood, lookX, lookY])

  const happy = mood === 'joy'
  const sleepy = mood === 'sleepy'
  const hungry = mood === 'hungry'
  const hot = mood === 'hot'
  const worried = mood === 'error' || wx === 'storm'
  const covering = mood === 'hiding'
  const g = (name: string) => `url(#${uid}-${name})`

  return (
    <div ref={originRef} className={`relative ${className}`}>
      <motion.div
        key={errorTick}
        className="size-full"
        style={{ rotate: bodyRoll, originY: '85%' }}
        animate={mood === 'error' ? { x: [0, -6, 6, -5, 5, -2, 0] } : undefined}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <motion.div
          className="size-full"
          key={happy ? 'hop' : 'still'}
          animate={happy ? { y: [0, -16, 0, -7, 0], scaleY: [1, 1.04, 0.95, 1.02, 1] } : { y: 0, scaleY: 1 }}
          style={{ originY: '100%' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="di-float size-full">
            <svg ref={svgRef} viewBox="0 0 240 240" className="size-full overflow-visible" role="img" aria-label={tr('Journie, linh vật du lịch', 'Journie, the travel mascot')}>
              <defs>
                <linearGradient id={`${uid}-fur`} gradientUnits="userSpaceOnUse" x1="0" y1="36" x2="0" y2="212">
                  <stop offset="0" stopColor={FUR} />
                  <stop offset="0.6" stopColor={FUR} />
                  <stop offset="1" stopColor={FUR_SHADE} />
                </linearGradient>
                <linearGradient id={`${uid}-rug`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={RUG} />
                  <stop offset="1" stopColor={RUG_DEEP} />
                </linearGradient>
                <filter id={`${uid}-soft`} x="-30%" y="-80%" width="160%" height="260%">
                  <feGaussianBlur stdDeviation="3.2" />
                </filter>
              </defs>

              {/* one soft shadow on the floor */}
              <ellipse className="di-shadow" cx="120" cy="232" rx="62" ry="5.5" fill="#08201a" opacity="0.34" filter={g('soft')} />

              {trail && (
                <g>
                  <Sparkle x={18} y={196} size={5.5} delay={0} />
                  <Sparkle x={224} y={204} size={5} delay={1.2} />
                </g>
              )}

              {/* tail, behind everything */}
              <g className="di-tail" style={{ transformOrigin: '160px 192px', transformBox: 'view-box' }}>
                <path d="M158 194C196 198 208 162 188 146" stroke={FUR_SHADE} strokeWidth="9" strokeLinecap="round" fill="none" />
              </g>

              <motion.g style={{ rotate: rugTilt, originX: '50%', originY: '90%', transformBox: 'view-box' }}>
                <Carpet time={time} energy={energy ?? calmEnergy} uid={uid} />
              </motion.g>

              {/* ears */}
              <motion.g style={{ x: lean }}>
                <circle cx="60" cy="78" r="16" fill={g('fur')} />
                <circle cx="61" cy="79" r="8.5" fill={EAR_IN} />
                <circle cx="180" cy="78" r="16" fill={g('fur')} />
                <circle cx="179" cy="79" r="8.5" fill={EAR_IN} />
              </motion.g>

              {/* head and body are one shape */}
              <motion.g style={{ x: lean }}>
                <ellipse cx="120" cy="170" rx="48" ry="40" fill={g('fur')} />
                <ellipse cx="120" cy="140" rx="54" ry="30" fill={g('fur')} />
                <circle cx="120" cy="98" r="62" fill={g('fur')} />
                <ellipse cx="120" cy="173" rx="28" ry="26" fill={CREAM_SHADE} />
                <ellipse cx="120" cy="170" rx="26" ry="24" fill={CREAM} />
              </motion.g>

              {/* little feet */}
              <ellipse cx="98" cy="207" rx="15" ry="8.5" fill={FUR_SHADE} />
              <ellipse cx="142" cy="207" rx="15" ry="8.5" fill={FUR_SHADE} />

              {/* face */}
              <motion.g style={{ x: faceX, y: faceY }}>
                <g fill={CREAM}>
                  <circle cx="103" cy="100" r="22" />
                  <circle cx="137" cy="100" r="22" />
                  <ellipse cx="120" cy="114" rx="34" ry="26" />
                </g>

                <motion.g style={{ x: eyeX, y: eyeY }}>
                  {!happy && !sleepy && !covering && (
                    <g className="di-eyes">
                      {[104, 136].map((cx) => (
                        <g key={cx}>
                          <ellipse cx={cx} cy="98" rx={mood === 'error' ? 6.4 : 5.4} ry={mood === 'error' ? 7.4 : 6.6} fill={EYE} />
                          <circle cx={cx + 1.9} cy="95.6" r="1.9" fill="#fff" />
                        </g>
                      ))}
                    </g>
                  )}
                </motion.g>
                {happy && (
                  <g stroke={EYE} strokeWidth="3.4" strokeLinecap="round" fill="none">
                    <path d="M96 101Q104 91 112 101" />
                    <path d="M128 101Q136 91 144 101" />
                  </g>
                )}
                {sleepy && (
                  <g stroke={EYE} strokeWidth="3.4" strokeLinecap="round" fill="none">
                    <path d="M96 97Q104 105 112 97" />
                    <path d="M128 97Q136 105 144 97" />
                  </g>
                )}
                {shades && (
                  <g>
                    <rect x="90" y="88" width="28" height="19" rx="8" fill="#241a15" />
                    <rect x="122" y="88" width="28" height="19" rx="8" fill="#241a15" />
                    <path d="M118 96H122" stroke="#241a15" strokeWidth="3" />
                    <path d="M90 94L80 91M150 94L160 91" stroke="#241a15" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M95 93L104 91.6M127 93L136 91.6" stroke="#fff" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
                  </g>
                )}
                {(worried || hungry) && !happy && !sleepy && !shades && !covering && (
                  <g stroke={BROW} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85">
                    {hungry ? <path d="M96 87Q104 84 111 88M129 88Q136 84 144 87" /> : <path d="M96 90Q104 83 112 91M128 91Q136 83 144 90" />}
                  </g>
                )}
                <ellipse cx="94" cy="118" rx="7.5" ry="4.4" fill={CHEEK} opacity={happy ? 0.5 : 0.3} />
                <ellipse cx="146" cy="118" rx="7.5" ry="4.4" fill={CHEEK} opacity={happy ? 0.5 : 0.3} />
                <ellipse cx="120" cy="112" rx="4.6" ry="3.2" fill="#5c4030" />
                {happy ? (
                  <g>
                    <path d="M110 118Q120 136 130 118Z" fill={SKIN_DEEP} />
                    <path d="M115.5 128Q120 133 124.5 128Q120 125 115.5 128Z" fill="#e48b74" />
                  </g>
                ) : mood === 'error' ? (
                  <ellipse cx="120" cy="124" rx="4" ry="5" fill={SKIN_DEEP} />
                ) : hungry ? (
                  <g>
                    <ellipse cx="120" cy="124" rx="5" ry="6" fill={SKIN_DEEP} />
                    <ellipse cx="120" cy="127" rx="3" ry="2.4" fill="#e48b74" />
                  </g>
                ) : hot ? (
                  <path d="M111 119Q120 131 129 119Q120 122 111 119Z" fill={SKIN_DEEP} />
                ) : mood === 'thinking' || covering ? (
                  <path d="M113 123Q116.5 120 120 123T127 123" stroke={BROW} strokeWidth="2.4" strokeLinecap="round" fill="none" />
                ) : sleepy ? (
                  <ellipse cx="120" cy="123" rx="3.4" ry="2.6" fill={SKIN_DEEP} />
                ) : (
                  <path d="M111 119Q120 128 129 119" stroke={BROW} strokeWidth="2.6" strokeLinecap="round" fill="none" />
                )}
              </motion.g>

              {/* head wear: a fez by day, a nightcap after dark */}
              <motion.g style={{ x: hatX }}>
                {!cap ? (
                  <g>
                    <path d="M93 46L100 18Q120 12 140 18L147 46Q120 55 93 46Z" fill={FEZ} />
                    <ellipse cx="120" cy="18" rx="20" ry="4.6" fill={FEZ_DEEP} />
                    <path d="M94 41Q120 50 146 41" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" fill="none" />
                    <g className="di-tassel" style={{ transformOrigin: '120px 18px', transformBox: 'view-box' }}>
                      <path d="M120 18C133 18 141 26 143 38" stroke={GOLD_DEEP} strokeWidth="2" strokeLinecap="round" fill="none" />
                      <circle cx="143" cy="41" r="4.4" fill={GOLD} />
                    </g>
                  </g>
                ) : (
                  <g>
                    <path d="M90 48C92 18 118 4 148 14C160 18 170 16 182 28C168 37 156 37 148 34C130 28 108 34 90 48Z" fill={CAP} />
                    <path d="M89 50C108 36 130 33 152 38" stroke={CREAM} strokeWidth="5" strokeLinecap="round" fill="none" />
                    <circle cx="183" cy="28" r="6.4" fill={CREAM} />
                    <path d="M120 10C130 12 138 18 142 26" stroke={CAP_DEEP} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
                  </g>
                )}
              </motion.g>

              {/* arms on top so mitts can cover the face */}
              <Arm side="left" arm={left} />
              <Arm side="right" arm={right} />

              {showUmbrella && (
                <g className="di-umbrella">
                  <path d="M188 138V22" stroke="#4a3426" strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M140 38C140 -4 236 -4 236 38C228 30 220 30 212 38C204 30 196 30 188 38C180 30 172 30 164 38C156 30 148 30 140 38Z" fill={RUG} />
                  <path d="M188 3C170 8 154 20 148 38M188 3C206 8 222 20 228 38" stroke={RUG_DEEP} strokeWidth="1.6" fill="none" />
                  {[150, 176, 202, 228].map((x, i) => (
                    <path key={x} className="di-drop" style={{ animationDelay: `${i * 0.33}s` }} d={`M${x} 48q-2.8 5 0 7q2.8 -2.2 0 -7Z`} fill="#a9d8cc" opacity="0.8" />
                  ))}
                </g>
              )}

              {hot && (
                <g>
                  <g className="di-fan" style={{ transformOrigin: '184px 108px', transformBox: 'view-box' }}>
                    <path d="M184 108L166 90Q184 78 202 90Z" fill={GOLD} />
                    <path d="M184 108L175 87M184 108L193 87" stroke={GOLD_DEEP} strokeWidth="1" fill="none" />
                  </g>
                  <g className="di-drop" style={{ animationDuration: '2s' }}>
                    <path d="M74 60c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12Z" fill="#a9d8cc" opacity="0.9" />
                  </g>
                </g>
              )}

              {hungry && (
                <g stroke={GOLD_DEEP} strokeWidth="2" strokeLinecap="round" fill="none">
                  <path className="di-rumble" d="M68 168Q63 173 68 178" />
                  <path className="di-rumble" style={{ animationDelay: '0.25s' }} d="M61 164Q53 173 61 182" />
                  <path className="di-rumble" d="M172 168Q177 173 172 178" />
                  <path className="di-rumble" style={{ animationDelay: '0.25s' }} d="M179 164Q187 173 179 182" />
                </g>
              )}

              {mood === 'error' && (
                <g key={`sweat-${errorTick}`} className="di-drop" style={{ animationIterationCount: 2 }}>
                  <path d="M170 66c-5 7-7 11-7 14a7 7 0 0 0 14 0c0-3-2-7-7-14Z" fill="#a9d8cc" opacity="0.9" />
                </g>
              )}

              {sleepy && (
                <g fontFamily="'Journie Display', serif" fontWeight="600" fill="#d9f0e8" opacity="0.9">
                  <text className="di-zzz" x="168" y="52" fontSize="22">z</text>
                  <text className="di-zzz" style={{ animationDelay: '0.9s' }} x="182" y="38" fontSize="16">z</text>
                  <text className="di-zzz" style={{ animationDelay: '1.7s' }} x="194" y="26" fontSize="12">z</text>
                </g>
              )}

              {happy && (
                <>
                  <Sparkle x={22} y={62} size={8} delay={0} />
                  <Sparkle x={220} y={54} size={9} delay={0.4} />
                  <Sparkle x={226} y={140} size={6} delay={0.8} />
                  <Sparkle x={12} y={146} size={7} delay={0.2} />
                </>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
