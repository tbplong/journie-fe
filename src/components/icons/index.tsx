import type { CSSProperties, ReactNode } from 'react'
import type { CategoryId } from '../../domain/types'

/**
 * Journie's own icon set. Every icon is drawn on a 48 grid with one 2.4px ink line and two flat
 * colours printed slightly off-register (like a risograph), so they read as hand-made rather than
 * as a stock set. Colours come from the landing palette.
 */

type Tone = { a: string; b: string }

const INK = 'currentColor'
const TERRACOTTA = '#d96745'
const SUN = '#f0b94b'
const JADE = '#4fb8a4'
const COFFEE = '#a0693a'
const DUSK = '#705cc4'
const PAPER = '#f7f2e8'

const TONES: Record<CategoryId, Tone> = {
  culture: { a: TERRACOTTA, b: SUN },
  food: { a: SUN, b: JADE },
  cafe: { a: COFFEE, b: SUN },
  nature: { a: JADE, b: SUN },
  beach: { a: JADE, b: SUN },
  market: { a: TERRACOTTA, b: SUN },
  nightlife: { a: SUN, b: DUSK },
  adventure: { a: TERRACOTTA, b: JADE },
}

type IconProps = { size?: number; className?: string; tone?: Tone; title?: string }

function Frame({ size = 24, className, tone, title, children }: IconProps & { tone: Tone; children: ReactNode }) {
  const style = { '--ic-a': tone.a, '--ic-b': tone.b } as CSSProperties
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke={INK}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {children}
    </svg>
  )
}

const A = { fill: 'var(--ic-a)', stroke: 'none' } as const
const B = { fill: 'var(--ic-b)', stroke: 'none' } as const
const Bs = { stroke: 'var(--ic-b)' } as const
/** Accent fills are shifted a little off the ink line: the "misregistered print" look. */
const Off = ({ children }: { children: ReactNode }) => <g transform="translate(1.6 1.6)">{children}</g>

const DRAWINGS: Record<CategoryId, () => ReactNode> = {
  culture: () => (
    <>
      <Off>
        <path d="M7 24C16 24 21 19 24 9C27 19 32 24 41 24Z" style={A} />
      </Off>
      <path d="M7 24C16 24 21 19 24 9C27 19 32 24 41 24Z" />
      <path d="M10 32C16 32 20 29 24 24C28 29 32 32 38 32" />
      <path d="M14 32V40M24 32V40M34 32V40M8 41H40" />
      <path d="M24 9V5" />
      <circle cx="24" cy="4.2" r="1.3" fill={INK} stroke="none" />
    </>
  ),
  food: () => (
    <>
      <Off>
        <ellipse cx="24" cy="27" rx="16" ry="3.4" style={A} />
      </Off>
      <path d="M7 27H41C41 36.5 34 42 24 42C14 42 7 36.5 7 27Z" />
      <ellipse cx="24" cy="27" rx="17" ry="3.4" />
      <path d="M18.5 44H29.5" />
      <path d="M30 5L21.5 25M35.5 7.5L27.5 25.5" />
      <path d="M12 21C9 18 13 16 10 12" style={Bs} />
      <path d="M17.5 20C14.5 17 18.5 15 15.5 11" style={Bs} />
    </>
  ),
  cafe: () => (
    <>
      <Off>
        <path d="M10 31H38V35C38 39 33 42 24 42C15 42 10 39 10 35Z" style={A} />
      </Off>
      <path d="M10 31H38V35C38 39 33 42 24 42C15 42 10 39 10 35Z" />
      <path d="M38 33H40.5C44 33 44 39.5 39.5 39.5H37.5" />
      <path d="M14 23H34L32.2 31H15.8Z" />
      <path d="M12 19H36V23H12Z" />
      <path d="M21 19V16H27V19" />
      <path d="M24 32.5V35" style={Bs} />
      <path d="M19 12C17 9 21 8 19 5M27 12C25 9 29 8 27 5" style={Bs} />
      <path d="M8 44.5H40" />
    </>
  ),
  nature: () => (
    <>
      <circle cx="36" cy="11" r="5.2" style={B} />
      <Off>
        <path d="M3 39C8 38 10 19 16 18C22 19 20 30 24 30C28 30 26 12 32 12C38 12 40 37 45 39Z" style={A} />
      </Off>
      <path d="M3 39C8 38 10 19 16 18C22 19 20 30 24 30C28 30 26 12 32 12C38 12 40 37 45 39Z" />
      <path d="M3 43.5H45" />
      <path d="M12 30C13 27 13.5 25 14 23M30 24C31 22 31 20 32 18" />
    </>
  ),
  beach: () => (
    <>
      <circle cx="39" cy="26" r="4.2" style={B} />
      <Off>
        <path d="M25 14C19 10 12 12 9 17C15 14 21 16 25 14ZM25 14C25 7 31 4 38 6C34 9 30 12 25 14ZM25 14C31 14 37 18 38 24C33 20 29 18 25 14Z" style={A} />
      </Off>
      <path d="M25 14C19 10 12 12 9 17C15 14 21 16 25 14ZM25 14C25 7 31 4 38 6C34 9 30 12 25 14ZM25 14C31 14 37 18 38 24C33 20 29 18 25 14Z" />
      <path d="M18 40C18 31 20 22 25 14" />
      <circle cx="24" cy="17" r="1.7" fill={INK} stroke="none" />
      <path d="M3 41C6 38 9 38 12 41S18 44 21 41S27 38 30 41S36 44 39 41S43 38 45 40" />
    </>
  ),
  market: () => (
    <>
      <Off>
        <path d="M8 14H40L43 25H5Z" style={A} />
        <circle cx="17" cy="38" r="3.4" style={B} />
        <circle cx="31" cy="38" r="3.4" style={B} />
      </Off>
      <path d="M8 14H40L43 25H5Z" />
      <path d="M16.5 14L14.5 25M24 14V25M31.5 14L33.5 25" />
      <path d="M5 25C5 28.5 11 28.5 11 25C11 28.5 17 28.5 17 25C17 28.5 23 28.5 23 25C23 28.5 29 28.5 29 25C29 28.5 35 28.5 35 25C35 28.5 41 28.5 41 25C41 28.5 43 28.5 43 25" />
      <path d="M9 30V42M39 30V42M6 42.5H42M9 34H39" />
      <circle cx="24" cy="38" r="3.4" />
    </>
  ),
  nightlife: () => (
    <>
      <path d="M37 5C32.5 7 30.5 12.5 33.5 17.5C36.5 22 42 22 45 19.5C43 26 35 27 30.5 22C26 17 29 9 37 5Z" style={B} />
      <Off>
        <ellipse cx="19" cy="28" rx="10" ry="12" style={A} />
      </Off>
      <ellipse cx="19" cy="28" rx="10" ry="12" />
      <path d="M19 16V40M12.5 18.5C9.5 25 9.5 31 12.5 37.5M25.5 18.5C28.5 25 28.5 31 25.5 37.5" />
      <path d="M13.5 16H24.5M16 13.5H22M19 13.5V9.5" />
      <path d="M19 40V44.5M17 44.5H21" />
    </>
  ),
  adventure: () => (
    <>
      <Off>
        <path d="M17.5 20.5H31L34 27.5H20Z" style={A} />
      </Off>
      <circle cx="11" cy="34" r="6.2" />
      <circle cx="37.5" cy="34" r="6.2" />
      <circle cx="11" cy="34" r="1.5" fill={INK} stroke="none" />
      <circle cx="37.5" cy="34" r="1.5" fill={INK} stroke="none" />
      <path d="M11 34L18 20.5H31L37.5 34" />
      <path d="M13.5 19H22" strokeWidth="3.6" />
      <path d="M31 20.5L33.5 13H39" />
      <path d="M17 32H26" />
      <path d="M2 40H6M3 35H5" style={Bs} />
    </>
  ),
}

export function CategoryIcon({ cat, ...props }: IconProps & { cat: CategoryId }) {
  const tone = props.tone ?? TONES[cat]
  return (
    <Frame {...props} tone={tone}>
      {DRAWINGS[cat]()}
    </Frame>
  )
}

/* ───────── weather ───────── */

export type WeatherKind = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'night' | 'night-cloudy' | 'night-rain'

const CLOUD = 'M14 35C9 35 6 31.5 6 27.5C6 23.5 9.5 20.5 13.5 21C14.5 15.5 19 12 24.5 12C30.5 12 35 16 35.5 21.5C40 21.5 43 24.5 43 28.5C43 32.5 40 35 36 35Z'

const nightCloudy = () => (
  <>
    <Off>
      <path d="M26 5C19 7 15 13 16.5 20C18 27 24 31 30 29C23 26 21 20 23 14C24 10 25 7 26 5Z" style={B} />
    </Off>
    <path d="M26 5C19 7 15 13 16.5 20C18 27 24 31 30 29C23 26 21 20 23 14C24 10 25 7 26 5Z" />
    <Off>
      <path d={CLOUD} transform="translate(0 6)" style={{ fill: '#2b5a4d', stroke: 'none' }} />
    </Off>
    <path d={CLOUD} transform="translate(0 6)" />
  </>
)

const nightRain = () => (
  <>
    <path d="M38 6V11M35.5 8.5H40.5" />
    <Off>
      <path d={CLOUD} transform="translate(0 -5)" style={A} />
    </Off>
    <path d={CLOUD} transform="translate(0 -5)" />
    <path d="M16 34L13 42M25 34L22 42M34 34L31 42" style={Bs} />
  </>
)

const WEATHER: Record<WeatherKind, () => ReactNode> = {
  sunny: () => (
    <>
      <Off>
        <circle cx="24" cy="24" r="9" style={A} />
      </Off>
      <circle cx="24" cy="24" r="9" />
      <path d="M24 5V9M24 39V43M5 24H9M39 24H43M10.5 10.5L13.3 13.3M34.7 34.7L37.5 37.5M10.5 37.5L13.3 34.7M34.7 13.3L37.5 10.5" />
    </>
  ),
  cloudy: () => (
    <>
      <circle cx="33" cy="15" r="6.5" style={B} />
      <Off>
        <path d={CLOUD} transform="translate(0 4)" style={{ fill: PAPER, stroke: 'none' }} />
      </Off>
      <path d={CLOUD} transform="translate(0 4)" />
    </>
  ),
  rain: () => (
    <>
      <Off>
        <path d={CLOUD} transform="translate(0 -4)" style={A} />
      </Off>
      <path d={CLOUD} transform="translate(0 -4)" />
      <path d="M16 36L13 43M25 36L22 43M34 36L31 43" style={Bs} />
    </>
  ),
  storm: () => (
    <>
      <Off>
        <path d={CLOUD} transform="translate(0 -5)" style={{ fill: '#9fb2aa', stroke: 'none' }} />
      </Off>
      <path d={CLOUD} transform="translate(0 -5)" />
      <path d="M26 28L19 39H25L22 46L32 33H26Z" style={{ fill: 'var(--ic-b)' }} />
      <path d="M12 37L10 42M36 37L34 42" style={Bs} />
    </>
  ),
  'night-cloudy': nightCloudy,
  'night-rain': nightRain,
  night: () => (
    <>
      <Off>
        <path d="M30 6C21 8 15 16 17 26C19 36 29 42 38 39C28 37 24 28 26 19C27 13 29 9 30 6Z" style={B} />
      </Off>
      <path d="M30 6C21 8 15 16 17 26C19 36 29 42 38 39C28 37 24 28 26 19C27 13 29 9 30 6Z" />
      <path d="M38 12V18M35 15H41M10 30V34M8 32H12" />
    </>
  ),
}

const WEATHER_TONES: Record<WeatherKind, Tone> = {
  'night-cloudy': { a: DUSK, b: SUN },
  'night-rain': { a: '#6f8ea0', b: JADE },
  sunny: { a: SUN, b: TERRACOTTA },
  cloudy: { a: '#cfd8d2', b: SUN },
  rain: { a: '#b9d4cf', b: JADE },
  storm: { a: '#9fb2aa', b: SUN },
  night: { a: DUSK, b: SUN },
}

/** The icon for a sky: sun or moon, with the weather in front of it. */
export function SkyIcon({ phase, weather, ...props }: IconProps & { phase: 'day' | 'night'; weather: 'clear' | 'cloudy' | 'rain' | 'storm' }) {
  const kind: WeatherKind =
    phase === 'day'
      ? weather === 'clear'
        ? 'sunny'
        : weather
      : weather === 'clear'
        ? 'night'
        : weather === 'cloudy'
          ? 'night-cloudy'
          : weather === 'rain'
            ? 'night-rain'
            : 'storm'
  return <WeatherIcon kind={kind} {...props} />
}

export function WeatherIcon({ kind, ...props }: IconProps & { kind: WeatherKind }) {
  return (
    <Frame {...props} tone={props.tone ?? WEATHER_TONES[kind]}>
      {WEATHER[kind]()}
    </Frame>
  )
}

/* ───────── navigation ───────── */

export type NavIconName = 'home' | 'plan' | 'trips' | 'discover' | 'profile' | 'account' | 'analytics'

const NAV: Record<NavIconName, () => ReactNode> = {
  home: () => (
    <>
      <Off>
        <path d="M7 24L24 9L41 24V40H7Z" style={A} />
      </Off>
      <path d="M5.5 25L24 8.5L42.5 25M9 22V41H39V22" />
      <path d="M20 41V31C20 28 28 28 28 31V41" />
      <circle cx="35" cy="11" r="2.4" style={B} />
    </>
  ),
  plan: () => (
    <>
      <Off>
        <path d="M22 6C23 16 27 20 37 21C27 22 23 26 22 36C21 26 17 22 7 21C17 20 21 16 22 6Z" style={A} />
      </Off>
      <path d="M22 6C23 16 27 20 37 21C27 22 23 26 22 36C21 26 17 22 7 21C17 20 21 16 22 6Z" />
      <path d="M38 31C39 35 41 37 45 38C41 39 39 41 38 45C37 41 35 39 31 38C35 37 37 35 38 31Z" style={{ fill: 'var(--ic-b)', stroke: INK, strokeWidth: 1.8 }} />
    </>
  ),
  trips: () => (
    <>
      <Off>
        <rect x="6" y="15" width="36" height="25" rx="3" style={A} />
      </Off>
      <rect x="6" y="15" width="36" height="25" rx="3" />
      <path d="M17 15V10C17 8.5 18 8 19.5 8H28.5C30 8 31 8.5 31 10V15M15 15V40M33 15V40" />
      <path d="M39 40L44 44" style={Bs} />
    </>
  ),
  discover: () => (
    <>
      <circle cx="24" cy="24" r="17" />
      <Off>
        <path d="M31.5 16.5L27 27L16.5 31.5L21 21Z" style={A} />
      </Off>
      <path d="M31.5 16.5L27 27L16.5 31.5L21 21Z" />
      <circle cx="24" cy="24" r="1.6" fill={INK} stroke="none" />
      <path d="M24 3.5V7M24 41V44.5M3.5 24H7M41 24H44.5" />
    </>
  ),
  profile: () => (
    <>
      <Off>
        <path d="M24 5L38 18H10Z" style={A} />
      </Off>
      <path d="M24 5L38 18H10Z" />
      <path d="M13 18C13 18 14 14 24 14C34 14 35 18 35 18" style={{ stroke: 'none' }} />
      <circle cx="24" cy="25" r="6.5" />
      <path d="M9 43C9 35 15 32 24 32C33 32 39 35 39 43" />
    </>
  ),
  account: () => (
    <>
      <Off>
        <rect x="9" y="21" width="30" height="21" rx="3" style={A} />
      </Off>
      <rect x="9" y="21" width="30" height="21" rx="3" />
      <path d="M16 21V15C16 10 20 7 24 7C28 7 32 10 32 15V21" />
      <circle cx="24" cy="30" r="2.6" style={B} />
      <path d="M24 32.6V37" />
    </>
  ),
  analytics: () => (
    <>
      <Off>
        <path d="M8 42V28H17V42ZM20 42V16H29V42ZM32 42V8H41V42Z" style={A} />
      </Off>
      <path d="M8 42V28H17V42ZM20 42V16H29V42ZM32 42V8H41V42Z" />
      <path d="M5 42.5H44" />
    </>
  ),
}

const NAV_TONES: Tone = { a: SUN, b: TERRACOTTA }

export function NavIcon({ name, ...props }: IconProps & { name: NavIconName }) {
  return (
    <Frame {...props} tone={props.tone ?? NAV_TONES}>
      {NAV[name]()}
    </Frame>
  )
}
