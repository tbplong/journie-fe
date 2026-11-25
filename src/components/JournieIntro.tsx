import { useLayoutEffect, useRef } from 'react'
import { animate, motion } from 'motion/react'

/** Total length of the sequence before the next page is opened under it (ms). */
export const INTRO_MS = 2400

const WORD = 'Journie'
const VIEW_W = 1000
const VIEW_H = 320
const FONT_SIZE = 210
const BASELINE = 220
/** The pen starts after the dark has spread, and writes the whole word in one continuous stroke. */
const WRITE_DELAY = 0.45
const WRITE_S = 1.45
/** Slow start, steady middle, gentle finish, like a hand writing. */
const HAND = [0.45, 0.05, 0.25, 1] as const

/** A smooth curve through the points (Catmull-Rom turned into cubic Béziers), so the pen never turns a sharp corner. */
function smoothPath(points: [number, number][]) {
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [points[Math.max(0, i - 1)], points[i], points[i + 1], points[Math.min(points.length - 1, i + 2)]]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/**
 * The title between the sign-in pages and the app (both ways): on a dark stage the word Journie is written in one flowing
 * stroke, letter joined to letter, a glowing pen tip leading the ink, with a soft gold glow under it; a dotted route then
 * runs under the word onto a pin, and the portal flies into it (PortalWipe). The pen follows a path laid through each
 * letter as the font draws it, and the ink is that path, thick, used as a mask over the word.
 */
export function JournieIntro({ settled = false }: { settled?: boolean }) {
  const textRef = useRef<SVGTextElement>(null)
  const inkRef = useRef<SVGPathElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const penRef = useRef<SVGCircleElement>(null)

  useLayoutEffect(() => {
    if (settled) return
    const text = textRef.current
    const ink = inkRef.current
    const trail = trailRef.current
    const pen = penRef.current
    if (!text || !ink || !trail || !pen) return
    let stop: (() => void) | undefined
    let cancelled = false

    void document.fonts.load(`${FONT_SIZE}px "Journie Display"`).finally(() => {
      if (cancelled) return
      // A zigzag through every letter: up to its top, down to the baseline, and on to the next, so the word is joined up
      const points: [number, number][] = []
      for (let index = 0; index < WORD.length; index++) {
        const box = text.getExtentOfChar(index)
        const top = box.y + box.height * (index === 0 ? 0.2 : 0.42)
        const base = box.y + box.height * 0.8
        if (index === 0) points.push([box.x + box.width * 0.1, base])
        points.push([box.x + box.width * 0.3, top], [box.x + box.width * 0.55, base], [box.x + box.width * 0.85, top + (base - top) * 0.35])
      }
      const last = text.getExtentOfChar(WORD.length - 1)
      points.push([last.x + last.width * 1.05, last.y + last.height * 0.7])
      const d = smoothPath(points)
      ink.setAttribute('d', d)
      trail.setAttribute('d', d)
      const length = ink.getTotalLength()
      for (const path of [ink, trail]) {
        path.style.strokeDasharray = `${length} ${length}`
        path.style.strokeDashoffset = `${length}`
      }
      // One clock for the ink, the trail and the pen, so the three never drift apart
      const run = animate(0, 1, {
        duration: WRITE_S,
        delay: WRITE_DELAY,
        ease: HAND,
        onUpdate: (progress) => {
          const done = length * progress
          ink.style.strokeDashoffset = `${length - done}`
          trail.style.strokeDashoffset = `${length - done}`
          const tip = ink.getPointAtLength(done)
          pen.setAttribute('cx', `${tip.x}`)
          pen.setAttribute('cy', `${tip.y}`)
          pen.style.opacity = progress < 0.98 ? '1' : `${(1 - progress) * 50}`
        },
      })
      stop = () => run.stop()
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [settled])

  return (
    <div className="journie-intro absolute inset-0 grid place-items-center overflow-hidden">
      <motion.div initial={settled ? false : { scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 2.3, ease: [0.25, 0.1, 0.25, 1] }}>
        <svg className="block w-[min(88vw,60rem)] overflow-visible" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true">
          <defs>
            <mask id="journie-ink" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={VIEW_H}>
              <path ref={inkRef} fill="none" stroke="#fff" strokeWidth={FONT_SIZE * 0.5} strokeLinecap="round" strokeLinejoin="round" />
              {/* Whatever the pen's path missed is filled in as it lifts */}
              <motion.rect width={VIEW_W} height={VIEW_H} fill="#fff" initial={settled ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: WRITE_DELAY + WRITE_S - 0.15 }} />
            </mask>
            <filter id="journie-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="16" />
            </filter>
            <linearGradient id="journie-trail" x1="0" x2="1">
              <stop offset="0" stopColor="#d96745" />
              <stop offset="0.5" stopColor="#f0b94b" />
              <stop offset="1" stopColor="#4fb8a4" />
            </linearGradient>
          </defs>

          <g mask="url(#journie-ink)">
            <text x={VIEW_W / 2} y={BASELINE} textAnchor="middle" fontFamily="'Journie Display', serif" fontSize={FONT_SIZE} fill="#f0b94b" opacity="0.55" filter="url(#journie-glow)">
              {WORD}
            </text>
            <text ref={textRef} x={VIEW_W / 2} y={BASELINE} textAnchor="middle" fontFamily="'Journie Display', serif" fontSize={FONT_SIZE} fill="#f7f2e8">
              {WORD}
            </text>
          </g>

          {/* The pen's own line: a thin ribbon of the brand colours joining the letters, fading once the word is written */}
          {!settled && (
            <motion.g initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, delay: WRITE_DELAY + WRITE_S }}>
              <path ref={trailRef} fill="none" stroke="url(#journie-trail)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
              <circle ref={penRef} r="7" fill="#fff6dc" style={{ opacity: 0, filter: 'drop-shadow(0 0 10px #f0b94b) drop-shadow(0 0 22px #f0b94b)' }} />
            </motion.g>
          )}

          {/* A dotted route under the word, landing on a pin */}
          <motion.path
            d={`M${VIEW_W * 0.24} ${BASELINE + 62} H${VIEW_W * 0.72}`}
            stroke="#4fb8a4"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="1.5 15"
            initial={settled ? false : { clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.55, delay: WRITE_DELAY + WRITE_S - 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.circle
            cx={VIEW_W * 0.75}
            cy={BASELINE + 62}
            r="11"
            fill="none"
            stroke="#d96745"
            strokeWidth="5"
            initial={settled ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: WRITE_DELAY + WRITE_S + 0.25 }}
            style={{ transformOrigin: `${VIEW_W * 0.75}px ${BASELINE + 62}px` }}
          />
        </svg>
      </motion.div>
    </div>
  )
}
