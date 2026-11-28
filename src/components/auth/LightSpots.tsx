import type { CSSProperties, ReactNode } from 'react'
import { useTr } from '../../hooks/useTr'
import { useLit } from './use-lit'

function Spot({ className = '', style, radius, children, hint = true }: { className?: string; style?: CSSProperties; radius?: number; children: (lit: boolean) => ReactNode; hint?: boolean }) {
  const { ref, lit, on } = useLit(radius)
  return (
    <div ref={ref} className={`spot ${className}`} style={style} data-lit={lit} data-on={on}>
      {children(lit)}
      {hint && <span className="spot-hint" aria-hidden="true" />}
    </div>
  )
}

/* ───────── scenery spots (behind the card, in the margins) ───────── */

function Lantern({ small = false }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 60 118" className={small ? 'w-9' : 'w-12'} aria-hidden="true">
      <path d="M30 0V24" stroke="#2a1a12" strokeWidth="2" />
      <rect x="19" y="23" width="22" height="7" rx="2.5" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2.4" />
      <path className="lantern-body" d="M16 32C4 42 4 68 16 77H44C56 68 56 42 44 32Z" fill="#d96745" stroke="#2a1a12" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M30 32V77M22 33C16 46 16 62 22 77M38 33C44 46 44 62 38 77" stroke="#2a1a12" strokeOpacity="0.55" strokeWidth="1.8" fill="none" />
      <ellipse className="lantern-flame" cx="30" cy="55" rx="9" ry="14" fill="#ffd36e" />
      <rect x="19" y="76" width="22" height="7" rx="2.5" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2.4" />
      <path d="M30 83V104M25 83L23 100M35 83L37 100" stroke="#f0b94b" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function LanternSpot({ className = '', style, small }: { className?: string; style?: CSSProperties; small?: boolean }) {
  return (
    <Spot className={`lantern ${className}`} style={style} radius={110}>
      {() => <Lantern small={small} />}
    </Spot>
  )
}

export function ChestSpot({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <Spot className={`chest ${className}`} style={style} radius={120}>
      {() => (
        <svg viewBox="0 0 120 100" className="w-24" aria-hidden="true">
          <g className="chest-rays">
            <path d="M60 52L8 6M60 52L36 -2M60 52L60 -6M60 52L84 -2M60 52L112 6" stroke="#ffd36e" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
          </g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} className="chest-coin" style={{ ['--i' as string]: i }}>
              <circle cx={44 + i * 8} cy="50" r="6.5" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2" />
              <path d={`M${44 + i * 8 - 2.4} ${50 - 3}V${50 + 3}`} stroke="#2a1a12" strokeWidth="1.6" strokeLinecap="round" />
            </g>
          ))}
          <path d="M14 52H106V92H14Z" fill="#8a5a3b" stroke="#2a1a12" strokeWidth="3.4" strokeLinejoin="round" />
          <path d="M34 52V92M86 52V92" stroke="#f0b94b" strokeWidth="6" />
          <path d="M14 52H106" stroke="#2a1a12" strokeWidth="3" />
          <g className="chest-lid">
            <path d="M14 52C14 22 106 22 106 52Z" fill="#a0693a" stroke="#2a1a12" strokeWidth="3.4" strokeLinejoin="round" />
            <path d="M34 36V52M86 36V52" stroke="#f0b94b" strokeWidth="6" />
          </g>
          <rect x="52" y="48" width="16" height="14" rx="3" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2.6" />
          <circle cx="60" cy="55" r="2.2" fill="#2a1a12" />
        </svg>
      )}
    </Spot>
  )
}

export function LotusSpot({ className = '', style }: { className?: string; style?: CSSProperties }) {
  const flower = (cx: number, cy: number, scale: number, delay: number) => (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`} style={{ ['--d' as string]: `${delay}ms` }}>
      {[-64, -32, 0, 32, 64].map((a) => (
        <path key={a} className="lotus-petal" style={{ ['--a' as string]: `${a}deg` }} d="M0 0C-9 -10 -9 -28 0 -38C9 -28 9 -10 0 0Z" fill={Math.abs(a) > 40 ? '#e98763' : '#f3a58a'} stroke="#2a1a12" strokeWidth="2" strokeLinejoin="round" />
      ))}
      <circle className="lotus-heart" cx="0" cy="-6" r="5" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2" />
    </g>
  )
  return (
    <Spot className={`lotus ${className}`} style={style} radius={120}>
      {() => (
        <svg viewBox="0 0 150 90" className="w-32" aria-hidden="true">
          <ellipse cx="75" cy="82" rx="68" ry="7" fill="#2f7a66" opacity="0.4" />
          <ellipse cx="26" cy="76" rx="22" ry="7" fill="#3f9a7f" stroke="#2a1a12" strokeWidth="2" />
          <ellipse cx="126" cy="78" rx="20" ry="6.5" fill="#3f9a7f" stroke="#2a1a12" strokeWidth="2" />
          <path d="M56 80C56 66 58 60 60 54M78 80C78 62 76 54 74 46M100 80C100 68 100 62 98 58" stroke="#2f7a66" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          {flower(60, 54, 0.82, 0)}
          {flower(74, 46, 1.05, 140)}
          {flower(98, 58, 0.72, 260)}
        </svg>
      )}
    </Spot>
  )
}

/** Night only: seven stars that join up into a map pin when the light touches them. */
export function ConstellationSpot({ className = '', style }: { className?: string; style?: CSSProperties }) {
  const { tr } = useTr()
  const stars: [number, number][] = [
    [30, 68],
    [62, 30],
    [104, 14],
    [150, 34],
    [172, 70],
    [132, 74],
    [100, 94],
  ]
  return (
    <Spot className={`constellation ${className}`} style={style} radius={150}>
      {() => (
        <div className="relative w-56">
          <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
            <path className="constellation-line" d={`M${stars.map((s) => s.join(' ')).join('L')}`} pathLength="1" fill="none" stroke="#fdeeb8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            {stars.map(([x, y], i) => (
              <path key={i} className="constellation-star" style={{ ['--i' as string]: i }} d={`M${x} ${y - 5.5}Q${x + 1} ${y - 1} ${x + 5.5} ${y}Q${x + 1} ${y + 1} ${x} ${y + 5.5}Q${x - 1} ${y + 1} ${x - 5.5} ${y}Q${x - 1} ${y - 1} ${x} ${y - 5.5}Z`} fill="#fff4cf" />
            ))}
          </svg>
          <p className="constellation-label">{tr('điểm dừng tiếp theo?', 'next stop?')}</p>
        </div>
      )}
    </Spot>
  )
}

/** Day only: a kite that sulks on a short string until the light finds it. */
export function KiteSpot({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <Spot className={`kite ${className}`} style={style} radius={150}>
      {() => (
        <svg viewBox="0 0 120 150" className="w-20" aria-hidden="true">
          <g className="kite-body">
            <path d="M60 4L92 44L60 96L28 44Z" fill="#d96745" stroke="#2a1a12" strokeWidth="3" strokeLinejoin="round" />
            <path d="M60 4V96M28 44H92" stroke="#2a1a12" strokeWidth="2.2" />
            <path d="M60 4L92 44H60Z" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M60 96C54 108 68 114 58 128C52 138 62 144 56 150" stroke="#2a1a12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M58 112L48 108L50 118Z M58 130L68 126L66 136Z" fill="#4fb8a4" stroke="#2a1a12" strokeWidth="1.8" strokeLinejoin="round" />
          </g>
        </svg>
      )}
    </Spot>
  )
}

/** Swallows by day, bats by night: perched until the light wakes them, then they scatter. */
export function FlockSpot({ night, className = '', style }: { night: boolean; className?: string; style?: CSSProperties }) {
  const color = night ? '#c9b8ff' : '#173f35'
  return (
    <Spot className={`flock ${className}`} style={style} radius={130}>
      {() => (
        <svg viewBox="0 0 140 50" className="w-36" aria-hidden="true">
          <path d="M4 38H136" stroke="#2a1a12" strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray="1 6" strokeLinecap="round" />
          {[22, 62, 104].map((x, i) => (
            <g key={x} className="flock-bird" style={{ ['--i' as string]: i }}>
              <path d={night ? `M${x - 14} 28Q${x - 6} 22 ${x} 32Q${x + 6} 22 ${x + 14} 28Q${x + 8} 36 ${x} 34Q${x - 8} 36 ${x - 14} 28Z` : `M${x - 15} 26Q${x - 6} 24 ${x} 32Q${x + 6} 24 ${x + 15} 26Q${x + 7} 22 ${x} 29Q${x - 7} 22 ${x - 15} 26Z`} fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
            </g>
          ))}
        </svg>
      )}
    </Spot>
  )
}

/* ───────── spots inside the arch photo ───────── */

export function FishSpot({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <Spot className={`fish ${className}`} style={style} radius={110}>
      {() => (
        <svg viewBox="0 0 120 80" className="w-28" aria-hidden="true">
          <g className="fish-ripples" fill="none" stroke="#e9fff8" strokeWidth="1.6">
            <ellipse cx="34" cy="68" rx="14" ry="4" />
            <ellipse cx="34" cy="68" rx="26" ry="7" />
          </g>
          <g className="fish-body">
            <path d="M12 38C24 22 52 22 66 36C52 54 24 54 12 38Z" fill="#f08a4b" stroke="#2a1a12" strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M66 36L86 22C84 32 84 42 86 52Z" fill="#f08a4b" stroke="#2a1a12" strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M32 24C36 18 44 17 48 22" fill="#f0b94b" stroke="#2a1a12" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="24" cy="36" r="2.6" fill="#2a1a12" />
            <circle cx="42" cy="33" r="3.4" fill="#fff7de" opacity="0.9" />
            <circle cx="52" cy="38" r="2.6" fill="#fff7de" opacity="0.9" />
          </g>
          <g className="fish-drops" fill="#e9fff8">
            <circle cx="46" cy="14" r="2.4" />
            <circle cx="58" cy="10" r="1.8" />
            <circle cx="30" cy="12" r="1.6" />
          </g>
        </svg>
      )}
    </Spot>
  )
}

export function CliffNoteSpot({ text, className = '', style }: { text: string; className?: string; style?: CSSProperties }) {
  return (
    <Spot className={`cliff-note ${className}`} style={style} radius={120} hint={false}>
      {() => <p className="cliff-note-text">{text}</p>}
    </Spot>
  )
}

export function FirefliesSpot({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <Spot className={`fireflies ${className}`} style={style} radius={110}>
      {() => (
        <div className="relative size-24" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className="firefly" style={{ ['--i' as string]: i }} />
          ))}
        </div>
      )}
    </Spot>
  )
}
