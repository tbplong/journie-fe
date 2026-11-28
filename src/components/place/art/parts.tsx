import type { ReactNode } from 'react'

import { C, INK } from './palette'

/** Wraps shapes in the shared outline so every drawing has the same hand. */
export function Ink({ children, w = 2.2, className }: { children: ReactNode; w?: number; className?: string }) {
  return (
    <g stroke={INK} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" className={className}>
      {children}
    </g>
  )
}

/** Curved tiled roof with upturned eaves. `y` is the eave line, `h` the height above it. */
export function Roof({ x, y, w, h = 14, fill = C.terra, tiles = true }: { x: number; y: number; w: number; h?: number; fill?: string; tiles?: boolean }) {
  const l = x - w / 2
  const r = x + w / 2
  return (
    <g>
      <path d={`M${l - 9} ${y + 3}Q${l + 3} ${y} ${l + 9} ${y - h}H${r - 9}Q${r - 3} ${y} ${r + 9} ${y + 3}Z`} fill={fill} />
      {tiles && (
        <path d={`M${l + 4} ${y - 3}H${r - 4}M${l + 8} ${y - h * 0.5}H${r - 8}`} stroke={INK} strokeOpacity="0.4" strokeWidth="1.4" fill="none" />
      )}
    </g>
  )
}

export function Window({ x, y, w = 8, h = 11, fill = C.cream, arch = false }: { x: number; y: number; w?: number; h?: number; fill?: string; arch?: boolean }) {
  return arch ? (
    <path d={`M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`} fill={fill} strokeWidth="1.6" />
  ) : (
    <rect x={x} y={y} width={w} height={h} fill={fill} strokeWidth="1.6" rx="1" />
  )
}

export function Lantern({ x, y, r = 5, fill = C.terra, string = 0 }: { x: number; y: number; r?: number; fill?: string; string?: number }) {
  return (
    <g>
      {string > 0 && <path d={`M${x} ${y - string}V${y - r}`} strokeWidth="1.4" />}
      <ellipse cx={x} cy={y} rx={r * 0.85} ry={r} fill={fill} strokeWidth="1.8" />
      <path d={`M${x} ${y - r}V${y + r}`} strokeWidth="1.1" strokeOpacity="0.5" />
      <path d={`M${x - r * 0.5} ${y + r}v${r * 0.9}M${x + r * 0.5} ${y + r}v${r * 0.9}`} stroke={C.sun} strokeWidth="1.6" />
    </g>
  )
}

export function Palm({ x, y, h = 56, lean = 8, s = 1 }: { x: number; y: number; h?: number; lean?: number; s?: number }) {
  const tx = x + lean
  const ty = y - h
  return (
    <g transform={`translate(0 0)`}>
      <path d={`M${x} ${y}Q${x + lean * 0.2} ${y - h * 0.5} ${tx} ${ty}`} stroke={INK} strokeWidth={5 * s} fill="none" />
      <path d={`M${x} ${y}Q${x + lean * 0.2} ${y - h * 0.5} ${tx} ${ty}`} stroke={C.wood} strokeWidth={2.6 * s} fill="none" />
      {[-60, -25, 15, 55, 100, 140, 180].map((a) => {
        const rad = (a * Math.PI) / 180
        const lx = tx + Math.cos(rad) * 30 * s
        const ly = ty - Math.sin(rad) * 14 * s + Math.abs(Math.cos(rad)) * 12 * s
        return <path key={a} d={`M${tx} ${ty}Q${(tx + lx) / 2} ${ty - 14 * s} ${lx} ${ly}Q${(tx + lx) / 2} ${ty - 6 * s} ${tx} ${ty}Z`} fill={C.leaf} strokeWidth="1.6" />
      })}
      <circle cx={tx - 2} cy={ty + 3} r={3.2 * s} fill={C.cocoa} strokeWidth="1.4" />
      <circle cx={tx + 4} cy={ty + 4} r={3 * s} fill={C.cocoa} strokeWidth="1.4" />
    </g>
  )
}

export function Cloud({ x, y, s = 1, fill = C.white, opacity = 0.9 }: { x: number; y: number; s?: number; fill?: string; opacity?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-22 8C-34 8 -36 -4 -26 -6C-26 -17 -10 -20 -4 -11C4 -19 20 -12 18 -2C30 -2 32 8 20 8Z"
      fill={fill}
      opacity={opacity}
      stroke="none"
    />
  )
}

export function Steam({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g className="art-steam" transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} strokeOpacity="0.45" strokeWidth="2" fill="none" strokeLinecap="round">
      <path d="M0 0C-5 -7 5 -12 0 -20" />
      <path d="M9 2C4 -5 14 -10 9 -18" />
      <path d="M-9 2C-14 -5 -4 -10 -9 -18" />
    </g>
  )
}

/** Karst tower with cliff texture. */
export function Karst({ x, y, w = 60, h = 90, fill = C.stone, shade = C.stoneD }: { x: number; y: number; w?: number; h?: number; fill?: string; shade?: string }) {
  return (
    <g>
      <path d={`M${x - w / 2} ${y}C${x - w / 2} ${y - h * 0.5} ${x - w * 0.28} ${y - h * 0.95} ${x} ${y - h}C${x + w * 0.28} ${y - h * 0.95} ${x + w / 2} ${y - h * 0.5} ${x + w / 2} ${y}Z`} fill={fill} />
      <path d={`M${x + w * 0.1} ${y - h * 0.96}C${x + w * 0.4} ${y - h * 0.7} ${x + w * 0.46} ${y - h * 0.3} ${x + w * 0.3} ${y}H${x + w / 2}C${x + w / 2} ${y - h * 0.5} ${x + w * 0.28} ${y - h * 0.95} ${x} ${y - h}Z`} fill={shade} stroke="none" opacity="0.75" />
      <path d={`M${x - w * 0.2} ${y - h * 0.5}v${h * 0.3}M${x - w * 0.05} ${y - h * 0.62}v${h * 0.4}`} strokeOpacity="0.4" strokeWidth="1.5" fill="none" />
      <path d={`M${x - w * 0.4} ${y - h * 0.18}Q${x - w * 0.2} ${y - h * 0.3} ${x} ${y - h * 0.15}`} stroke={C.leaf} strokeWidth="5" fill="none" />
    </g>
  )
}
