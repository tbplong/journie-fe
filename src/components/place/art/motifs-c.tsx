import { C, INK } from './palette'
import { Ink, Steam } from './parts'

/* Food, drink and little street scenes: the object is the landmark. Local origin: table top centre. */

export function Cup({ kind = 'egg' }: { kind?: 'egg' | 'phin' | 'cafe' }) {
  if (kind === 'phin') {
    return (
      <Ink>
        <path d="M-30 0L-26 -46H26L30 0Z" fill={C.cream} strokeOpacity="1" />
        <path d="M-26 -30H26" stroke={C.terra} strokeWidth="5" />
        <path d="M-34 -46H34V-52H-34Z" fill={C.stoneD} />
        <path d="M-26 -52L-20 -70H20L26 -52Z" fill={C.stoneD} />
        <rect x="-8" y="-78" width="16" height="8" rx="3" fill={C.stone} />
        <path d="M0 -50V-34" stroke={C.cocoa} strokeWidth="3" strokeDasharray="3 3" />
        <path d="M-24 -4H24L22 -20H-22Z" fill={C.cocoa} stroke="none" />
        <Steam x={0} y={-82} />
        <ellipse cx="0" cy="4" rx="48" ry="6" fill={C.stone} />
      </Ink>
    )
  }
  return (
    <Ink>
      <ellipse cx="0" cy="3" rx="64" ry="9" fill={C.stone} />
      <path d="M-40 -42H40Q40 -2 14 -2H-14Q-40 -2 -40 -42Z" fill={C.cream} />
      <path d="M40 -34Q64 -34 62 -18Q60 -6 38 -10" fill="none" strokeWidth="6" stroke={INK} />
      <path d="M40 -34Q64 -34 62 -18Q60 -6 38 -10" fill="none" strokeWidth="2.6" stroke={C.cream} />
      <ellipse cx="0" cy="-42" rx="40" ry="9" fill={kind === 'egg' ? C.sun : C.cocoa} />
      <path d="M-22 -43Q-8 -50 6 -43Q16 -38 26 -44" fill="none" strokeWidth="2.4" stroke={kind === 'egg' ? C.sunD : C.wood} />
      <path d="M-26 -22H26" stroke={C.terra} strokeWidth="3" strokeOpacity="0.9" />
      <Steam x={-8} y={-54} />
      {kind === 'cafe' && <path d="M-6 -42l-3 -4M6 -42l3 -4" stroke={C.cream} strokeWidth="2" />}
    </Ink>
  )
}

export function Bowl({ kind = 'pho' }: { kind?: 'pho' | 'cao' | 'bunCha' | 'cracker' }) {
  if (kind === 'bunCha') {
    return (
      <Ink>
        <ellipse cx="0" cy="3" rx="82" ry="8" fill={C.stone} />
        <path d="M-78 -26H-6Q-6 0 -34 0H-50Q-78 0 -78 -26Z" fill={C.cream} />
        <ellipse cx="-42" cy="-26" rx="36" ry="7" fill={C.wood} />
        {[-56, -40, -26].map((x) => (
          <circle key={x} cx={x} cy="-27" r="6" fill={C.cocoa} strokeWidth="1.6" />
        ))}
        <path d="M14 -16H78L70 0H22Z" fill={C.white} />
        <path d="M20 -16Q30 -34 44 -22Q58 -34 72 -16" fill={C.cream} />
        {[22, 36, 50, 64].map((x) => (
          <path key={x} d={`M${x} -18Q${x + 6} -26 ${x + 12} -18`} fill="none" strokeOpacity="0.5" strokeWidth="1.4" />
        ))}
        <path d="M8 -8Q20 -34 30 -38M14 -6Q26 -30 38 -36" stroke={C.wood} strokeWidth="2.6" fill="none" />
        <circle cx="62" cy="-24" r="5" fill={C.leaf} strokeWidth="1.6" />
        <Steam x={-42} y={-36} s={0.9} />
      </Ink>
    )
  }
  return (
    <Ink>
      <ellipse cx="0" cy="4" rx="70" ry="8" fill={C.stone} />
      <path d="M-62 -34H62Q62 4 24 4H-24Q-62 4 -62 -34Z" fill={C.terra} />
      <path d="M-52 -14H52" stroke={C.cream} strokeWidth="3" strokeOpacity="0.9" />
      <ellipse cx="0" cy="-34" rx="62" ry="12" fill={kind === 'pho' ? C.sun : C.cream} />
      {kind === 'pho' && (
        <>
          <ellipse cx="0" cy="-34" rx="50" ry="8" fill={C.gold} stroke="none" />
          {[-28, -6, 18].map((x) => (
            <path key={x} d={`M${x - 11} -36Q${x} -44 ${x + 11} -36Q${x} -29 ${x - 11} -36Z`} fill={C.terra} strokeWidth="1.8" />
          ))}
          <circle cx="30" cy="-33" r="6" fill={C.leaf} strokeWidth="1.6" />
          <circle cx="-38" cy="-32" r="5" fill={C.leaf} strokeWidth="1.6" />
          <path d="M8 -30l3 -4l3 4z" fill={C.cocoa} stroke="none" />
        </>
      )}
      {kind === 'cao' && (
        <>
          <path d="M-44 -34Q-30 -46 -16 -34T12 -34T40 -34" fill="none" stroke={C.cream} strokeWidth="3" />
          {[-26, 0, 24].map((x) => (
            <rect key={x} x={x - 9} y="-40" width="18" height="7" rx="2" fill={C.cocoa} strokeWidth="1.6" />
          ))}
          <circle cx="40" cy="-34" r="5.4" fill={C.leaf} strokeWidth="1.6" />
        </>
      )}
      {kind === 'cracker' && (
        <>
          {[-32, -6, 20, 40].map((x, i) => (
            <rect key={x} x={x - 10} y={-44 + (i % 2) * 4} width="20" height="12" rx="2" fill={C.wall} strokeWidth="1.8" transform={`rotate(${i * 7 - 10} ${x} -38)`} />
          ))}
          <path d="M-14 -46l6 -6l6 6" fill="none" strokeWidth="1.8" />
        </>
      )}
      <path d="M-30 -52L26 -80M-22 -52L34 -78" stroke={C.cocoa} strokeWidth="3.4" />
      <Steam x={-14} y={-52} />
      <Steam x={22} y={-52} s={0.9} />
    </Ink>
  )
}

export function Seafood() {
  return (
    <Ink>
      <ellipse cx="0" cy="0" rx="86" ry="14" fill={C.cream} />
      <ellipse cx="0" cy="-2" rx="66" ry="9" fill={C.white} />
      {/* crab */}
      <g transform="translate(-24 -26)">
        <ellipse cx="0" cy="0" rx="26" ry="16" fill={C.terra} />
        <path d="M-26 -4Q-40 -18 -30 -26M26 -4Q40 -18 30 -26" fill="none" strokeWidth="5" stroke={INK} />
        <path d="M-26 -4Q-40 -18 -30 -26M26 -4Q40 -18 30 -26" fill="none" strokeWidth="2.6" stroke={C.terra} />
        <path d="M-18 8L-28 16M-8 12L-12 22M8 12L12 22M18 8L28 16" strokeWidth="2.4" />
        <circle cx="-8" cy="-10" r="3.4" fill={C.white} strokeWidth="1.6" />
        <circle cx="8" cy="-10" r="3.4" fill={C.white} strokeWidth="1.6" />
        <circle cx="-8" cy="-10" r="1.2" fill={INK} stroke="none" />
        <circle cx="8" cy="-10" r="1.2" fill={INK} stroke="none" />
      </g>
      {/* prawns */}
      {[28, 52].map((x, i) => (
        <path key={x} d={`M${x - 16} -8Q${x - 18} -34 ${x + 2} -34Q${x + 18} -34 ${x + 14} -14Q${x + 22} -10 ${x + 18} -2`} fill="none" strokeWidth="9" stroke={INK} transform={`translate(0 ${i * 3})`} />
      ))}
      {[28, 52].map((x, i) => (
        <path key={x} d={`M${x - 16} -8Q${x - 18} -34 ${x + 2} -34Q${x + 18} -34 ${x + 14} -14Q${x + 22} -10 ${x + 18} -2`} fill="none" strokeWidth="5.4" stroke={C.terra} transform={`translate(0 ${i * 3})`} />
      ))}
      <path d="M40 -8l8 -5l4 8z" fill={C.leaf} strokeWidth="1.4" />
      <path d="M-62 -6l8 -8l8 8z" fill={C.sun} strokeWidth="1.6" />
    </Ink>
  )
}
