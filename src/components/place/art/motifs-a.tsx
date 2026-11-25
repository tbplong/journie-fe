import { C, INK } from './palette'
import { Cloud, Ink, Lantern, Roof, Window } from './parts'

/* Buildings, bridges and landmarks. Local origin: ground centre. Roughly 200 wide, up to 100 tall. */

/** Three-arch gate of a temple, citadel or old city. */
export function GateTemple({ roof = C.terra, wall = C.stone, flag = false }: { roof?: string; wall?: string; flag?: boolean }) {
  return (
    <Ink>
      <rect x="-66" y="-36" width="132" height="36" fill={wall} />
      <rect x="-82" y="-8" width="164" height="8" fill={C.stoneD} />
      {[-36, 0, 36].map((x) => (
        <path key={x} d={`M${x - 14} 0V-18A14 14 0 0 1 ${x + 14} -18V0Z`} fill={INK} fillOpacity="0.85" />
      ))}
      <rect x="-50" y="-60" width="100" height="24" fill={wall} />
      {[-34, -12, 12, 34].map((x) => (
        <Window key={x} x={x - 4} y={-54} w={8} h={12} fill={C.terra} arch />
      ))}
      <Roof x={0} y={-60} w={110} h={16} fill={roof} />
      <rect x="-16" y="-92" width="32" height="18" fill={wall} />
      <Roof x={0} y={-92} w={34} h={10} fill={roof} />
      {flag && (
        <g>
          <path d="M60 -60V-110" strokeWidth="2.6" />
          <path d="M60 -108H92V-90H60Z" fill={C.terra} />
          <path d="M76 -105l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z" fill={C.sun} stroke="none" />
        </g>
      )}
    </Ink>
  )
}

export function Palace({ colonnade = false }: { colonnade?: boolean }) {
  return (
    <Ink>
      <rect x="-84" y="-26" width="168" height="26" fill={C.cream} />
      <rect x="-64" y="-56" width="128" height="30" fill={C.white} />
      {Array.from({ length: 13 }).map((_, i) => (
        <path key={i} d={`M${-60 + i * 10} -54V-28`} strokeOpacity="0.5" strokeWidth="1.6" />
      ))}
      <rect x="-70" y="-62" width="140" height="8" fill={C.stoneD} />
      <rect x="-22" y="-84" width="44" height="22" fill={C.cream} />
      <rect x="-30" y="-90" width="60" height="6" fill={C.stoneD} />
      {colonnade
        ? Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-76 + i * 18} y="-26" width="7" height="26" fill={C.white} strokeWidth="1.6" />)
        : [-50, -28, -6, 16, 38].map((x) => <rect key={x} x={x} y="-22" width="12" height="16" fill={C.jade} fillOpacity="0.7" strokeWidth="1.6" />)}
      <path d="M0 -90V-118" strokeWidth="2.6" />
      <path d="M0 -118H34V-100H0Z" fill={C.terra} />
      <path d="M17 -115l2.2 5.4h5.4l-4.4 3.4 1.7 5.4-4.9-3.3-4.9 3.3 1.7-5.4-4.4-3.4h5.4z" fill={C.sun} stroke="none" />
    </Ink>
  )
}

export function Cathedral() {
  return (
    <Ink>
      <rect x="-48" y="-48" width="96" height="48" fill={C.brick} />
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={i} d={`M-48 ${-42 + i * 8}H48`} strokeOpacity="0.28" strokeWidth="1.3" />
      ))}
      <rect x="-60" y="-88" width="30" height="88" fill={C.brick} />
      <rect x="30" y="-88" width="30" height="88" fill={C.brick} />
      <path d="M-62 -88L-45 -118L-28 -88Z" fill={C.stoneD} />
      <path d="M28 -88L45 -118L62 -88Z" fill={C.stoneD} />
      <path d="M-45 -118V-132M-50 -126H-40M45 -118V-132M40 -126H50" strokeWidth="2.2" />
      {[-45, 45].map((x) => (
        <Window key={x} x={x - 5} y={-78} w={10} h={22} fill={C.cream} arch />
      ))}
      <circle cx="0" cy="-30" r="12" fill={C.cream} />
      <path d="M-12 -30H12M0 -42V-18M-8.5 -38.5L8.5 -21.5M8.5 -38.5L-8.5 -21.5" strokeOpacity="0.5" strokeWidth="1.3" />
      <path d="M-14 0V-14A14 14 0 0 1 14 -14V0Z" fill={INK} fillOpacity="0.8" />
    </Ink>
  )
}

export function Museum() {
  return (
    <Ink>
      <rect x="-90" y="-10" width="180" height="10" fill={C.stoneD} />
      <rect x="-80" y="-56" width="160" height="46" fill={C.cream} />
      <path d="M-90 -56L0 -90L90 -56Z" fill={C.stone} />
      <circle cx="0" cy="-66" r="8" fill={C.terra} />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={-72 + i * 24} y="-52" width="10" height="42" fill={C.white} strokeWidth="1.8" />
      ))}
      <path d="M-14 -10V-26A14 14 0 0 1 14 -26V-10Z" fill={INK} fillOpacity="0.85" />
    </Ink>
  )
}

export function MarketHall({ chinese = false }: { chinese?: boolean }) {
  return (
    <Ink>
      <rect x="-86" y="-40" width="172" height="40" fill={C.cream} />
      <rect x="-90" y="-44" width="180" height="6" fill={C.stoneD} />
      {[-62, -30, 30, 62].map((x) => (
        <Window key={x} x={x - 8} y={-32} w={16} h={22} fill={C.jade} arch />
      ))}
      <path d="M-14 0V-20A14 14 0 0 1 14 -20V0Z" fill={INK} fillOpacity="0.85" />
      {chinese ? (
        <>
          <Roof x={0} y={-44} w={150} h={14} fill={C.jadeD} />
          <Roof x={0} y={-62} w={96} h={14} fill={C.jadeD} />
        </>
      ) : (
        <>
          <rect x="-24" y="-96" width="48" height="52" fill={C.cream} />
          <path d="M-28 -96H28L0 -118Z" fill={C.terra} />
          <circle cx="0" cy="-76" r="10" fill={C.white} />
          <path d="M0 -76V-83M0 -76L5 -73" strokeWidth="1.8" />
        </>
      )}
    </Ink>
  )
}

export function Skyline({ landmark = false }: { landmark?: boolean }) {
  return (
    <Ink>
      <rect x="-96" y="-44" width="34" height="44" fill={C.cream} />
      <rect x="-60" y="-62" width="28" height="62" fill={C.stone} />
      <rect x="66" y="-54" width="30" height="54" fill={C.cream} />
      <rect x="40" y="-38" width="26" height="38" fill={C.stone} />
      {[-90, -78, -66].map((x) => (
        <path key={x} d={`M${x} -38V-6`} strokeOpacity="0.35" strokeWidth="1.5" />
      ))}
      {landmark ? (
        <>
          <path d="M-18 0L-12 -118L-2 -132L2 -132L12 -118L18 0Z" fill={C.jade} />
          <path d="M-18 0L-12 -118H12L18 0Z" fill={C.white} fillOpacity="0.35" stroke="none" />
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M${-16 + i * 0.4} ${-100 + i * 11}H${16 - i * 0.4}`} strokeOpacity="0.55" strokeWidth="1.5" />
          ))}
          <path d="M0 -132V-150" strokeWidth="2.4" />
          <circle cx="0" cy="-152" r="2.6" fill={C.terra} />
        </>
      ) : (
        <>
          <path d="M-20 0V-96L0 -112L20 -96V0Z" fill={C.forest} />
          <path d="M-12 -96L-26 -100L-6 -106Z" fill={C.sun} />
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={`M-16 ${-84 + i * 12}H16`} stroke={C.white} strokeOpacity="0.55" strokeWidth="1.8" />
          ))}
        </>
      )}
      <path d="M-100 0H100" strokeWidth="3" />
      {[-80, -50, 52, 82].map((x) => (
        <g key={x}>
          <path d={`M${x} 0V-20`} strokeWidth="2" />
          <circle cx={x} cy="-22" r="3.4" fill={C.sun} strokeWidth="1.4" />
        </g>
      ))}
    </Ink>
  )
}

export function StreetNight({ stalls = false }: { stalls?: boolean }) {
  const houses = [
    { x: -76, w: 44, h: 50, c: C.wall },
    { x: -26, w: 44, h: 62, c: C.cream },
    { x: 26, w: 44, h: 54, c: C.terra },
    { x: 76, w: 44, h: 46, c: C.wall },
  ]
  return (
    <Ink>
      {houses.map((h) => (
        <g key={h.x}>
          <rect x={h.x - h.w / 2} y={-h.h} width={h.w} height={h.h} fill={h.c} />
          <Roof x={h.x} y={-h.h} w={h.w + 4} h={10} fill={C.terraD} />
          <Window x={h.x - 12} y={-h.h + 14} w={9} h={13} fill={C.sun} />
          <Window x={h.x + 3} y={-h.h + 14} w={9} h={13} fill={C.sun} />
          <rect x={h.x - 8} y="-20" width="16" height="20" fill={INK} fillOpacity="0.8" />
        </g>
      ))}
      <path d="M-100 -70Q-50 -50 0 -70Q50 -50 100 -70" fill="none" strokeWidth="1.6" />
      {[-80, -56, -30, -4, 22, 48, 74].map((x, i) => (
        <Lantern key={x} x={x} y={-60 + Math.sin((x + 100) / 32) * 5} r={4.2} fill={i % 2 ? C.sun : C.terra} string={0} />
      ))}
      {stalls &&
        [-60, 0, 60].map((x, i) => (
          <g key={x}>
            <path d={`M${x - 22} -2L${x - 18} -22H${x + 18}L${x + 22} -2Z`} fill={i % 2 ? C.jade : C.terra} />
            <path d={`M${x - 14} -22V-2M${x - 4} -22V-2M${x + 6} -22V-2M${x + 16} -22V-2`} strokeOpacity="0.35" strokeWidth="1.4" />
          </g>
        ))}
    </Ink>
  )
}

export function Cloudy({ x = 0, y = -110 }: { x?: number; y?: number }) {
  return <Cloud x={x} y={y} />
}
