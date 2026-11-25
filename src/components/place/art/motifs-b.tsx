import { C, INK } from './palette'
import { Cloud, Ink, Palm } from './parts'

/* Landscapes and nature. Local origin: ground centre. */

export function MountainStairs() {
  return (
    <Ink>
      <path d="M-96 0L-30 -78L-6 -62L22 -108L58 -70L70 -76L100 0Z" fill={C.stone} />
      <path d="M22 -108L58 -70L70 -76L100 0H64L40 -50Z" fill={C.stoneD} stroke="none" opacity="0.7" />
      <path d="M-40 0L-30 -14L-18 -22L-24 -34L-6 -42L-12 -56L8 -66L2 -80L22 -96" fill="none" strokeWidth="5" stroke={INK} />
      <path d="M-40 0L-30 -14L-18 -22L-24 -34L-6 -42L-12 -56L8 -66L2 -80L22 -96" fill="none" strokeWidth="2.4" stroke={C.cream} strokeDasharray="4 3" />
      <path d="M18 -108V-122M26 -108V-118" strokeWidth="2.2" />
      <path d="M12 -122H34L30 -128H16Z" fill={C.terra} />
      <path d="M-10 -66Q0 -80 10 -70" stroke={C.leaf} strokeWidth="5" fill="none" />
      <path d="M60 -50Q72 -60 84 -50" stroke={C.leaf} strokeWidth="5" fill="none" />
    </Ink>
  )
}

export function Goat() {
  return (
    <Ink>
      <path d="M-90 0L-50 -34L-24 -20L8 -46L46 -22L96 0Z" fill={C.stone} />
      <g transform="translate(-4 -44)">
        <ellipse cx="0" cy="-16" rx="26" ry="14" fill={C.cream} />
        <path d="M-18 -4V10M-8 -2V10M10 -2V10M20 -4V10" strokeWidth="3.4" />
        <path d="M-20 -26L-34 -38L-24 -14Z" fill={C.cream} />
        <circle cx="-30" cy="-32" r="10" fill={C.cream} />
        <path d="M-34 -42Q-44 -56 -52 -46M-26 -42Q-24 -58 -14 -52" fill="none" strokeWidth="3" stroke={C.cocoa} />
        <circle cx="-33" cy="-32" r="1.8" fill={INK} stroke="none" />
        <path d="M-36 -22Q-38 -14 -34 -10" fill="none" strokeWidth="2" />
        <path d="M24 -20Q34 -26 30 -14" fill={C.cream} />
      </g>
      <path d="M52 -14Q60 -26 72 -16M-76 -6Q-66 -16 -56 -8" stroke={C.leaf} strokeWidth="5" fill="none" />
    </Ink>
  )
}

export function BeachParasol() {
  return (
    <Ink>
      <Palm x={-66} y={0} h={74} lean={10} />
      <Palm x={78} y={0} h={52} lean={-12} s={0.85} />
      <g>
        <path d="M-8 0V-52" strokeWidth="3" />
        <path d="M-40 -48Q-8 -84 24 -48Z" fill={C.terra} />
        <path d="M-24 -50Q-8 -78 8 -50M-8 -84V-50" stroke={C.cream} strokeWidth="2" fill="none" />
      </g>
      <path d="M26 -2H58L52 -10H32Z" fill={C.jade} />
      <path d="M-100 8Q-82 -4 -64 8T-28 8T8 8T44 8T80 8T100 8" fill="none" stroke={C.white} strokeWidth="2.6" />
    </Ink>
  )
}

export function TwinHills() {
  return (
    <Ink>
      <ellipse cx="-36" cy="0" rx="58" ry="62" fill={C.leaf} />
      <ellipse cx="42" cy="0" rx="52" ry="52" fill={C.leafD} />
      <path d="M-70 -34Q-36 -50 -4 -32M-60 -16Q-36 -26 -10 -14" fill="none" strokeOpacity="0.4" strokeWidth="1.8" />
      <path d="M20 -26Q44 -38 66 -22M26 -10Q46 -18 62 -8" fill="none" strokeOpacity="0.4" strokeWidth="1.8" />
      <circle cx="-36" cy="-64" r="3.6" fill={C.terra} />
      <circle cx="42" cy="-54" r="3.6" fill={C.terra} />
      <Cloud x={-4} y={-30} s={1.1} opacity={0.95} />
    </Ink>
  )
}
