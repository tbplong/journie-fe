import { useId, type ComponentType } from 'react'
import { hashString } from '../../../domain/conditions'
import type { CategoryId, CityId, Poi } from '../../../domain/types'
import { karstPath, type Peak } from '../../scenes/shapes'
import { GateTemple, Palace, Cathedral, Museum, MarketHall, Skyline, StreetNight } from './motifs-a'
import { MountainStairs, BeachParasol, TwinHills } from './motifs-b'
import { Cup, Bowl } from './motifs-c'
import { C, INK } from './palette'

type Sky = 'day' | 'dawn' | 'golden' | 'dusk' | 'night' | 'mist'
type Ground = 'water' | 'land' | 'sand' | 'street' | 'table'

type Spec = { m: ComponentType<Record<string, unknown>>; props?: Record<string, unknown>; ground: Ground; sky: Sky; scale?: number }

const SKY: Record<Sky, [string, string]> = {
  day: ['#bfe4dc', '#f7efd8'],
  dawn: ['#f5c9a4', '#fcefd4'],
  golden: ['#f1b06a', '#fbe5b6'],
  dusk: ['#6b5aa8', '#f2a47c'],
  night: ['#102f29', '#235a4d'],
  mist: ['#cfddd6', '#eef0e3'],
}

const RIDGE: Record<Sky, [string, string]> = {
  day: ['#a6d2c5', '#7db8a7'],
  dawn: ['#e9b898', '#d89d83'],
  golden: ['#e3ad70', '#c98a5a'],
  dusk: ['#5b4a98', '#8a5f94'],
  night: ['#1a463d', '#245b4f'],
  mist: ['#b9cdc4', '#9db8ac'],
}

const GROUND: Record<Exclude<Ground, 'table'>, [string, string]> = {
  water: ['#7fd0c3', '#2f8f7c'],
  land: ['#86bf86', '#4f9a73'],
  sand: ['#f3deaa', '#e3c27a'],
  street: ['#d9d1bc', '#b7ae96'],
}

const SPECS: Record<string, Spec> = {
  'sg-dinh-doc-lap': { m: Palace, ground: 'land', sky: 'day', scale: 0.82 },
  'sg-duc-ba': { m: Cathedral, ground: 'street', sky: 'golden', scale: 0.8 },
  'sg-chung-tich': { m: Museum, ground: 'street', sky: 'mist' },
  'sg-ben-thanh': { m: MarketHall, ground: 'street', sky: 'day', scale: 0.82 },
  'sg-pho-hoa': { m: Bowl, props: { kind: 'pho' }, ground: 'table', sky: 'day' },
  'sg-ca-phe-42': { m: Cup, props: { kind: 'phin' }, ground: 'table', sky: 'day' },
  'sg-nguyen-hue': { m: Skyline, ground: 'street', sky: 'dusk', scale: 0.76 },
  'sg-landmark': { m: Skyline, props: { landmark: true }, ground: 'land', sky: 'night', scale: 0.62 },
  'sg-binh-tay': { m: MarketHall, props: { chinese: true }, ground: 'street', sky: 'day' },
}

const BY_CATEGORY: Record<CategoryId, Spec> = {
  culture: { m: GateTemple, ground: 'land', sky: 'day' },
  food: { m: Bowl, ground: 'table', sky: 'day' },
  cafe: { m: Cup, props: { kind: 'cafe' }, ground: 'table', sky: 'day' },
  nature: { m: TwinHills, ground: 'land', sky: 'dawn' },
  beach: { m: BeachParasol, ground: 'sand', sky: 'golden' },
  market: { m: StreetNight, props: { stalls: true }, ground: 'street', sky: 'dusk' },
  nightlife: { m: Skyline, ground: 'street', sky: 'night', scale: 0.76 },
  adventure: { m: MountainStairs, ground: 'land', sky: 'day', scale: 0.84 },
}

const farPeaks: Peak[] = [[40, 54, 36], [118, 86, 44], [200, 62, 40], [290, 96, 48], [370, 70, 38]]
const nearPeaks: Peak[] = [[10, 40, 34], [92, 52, 38], [176, 36, 34], [262, 58, 40], [346, 44, 36], [410, 50, 34]]

function hills(width: number, base: number, bottom: number, seed: number) {
  const steps = 9
  let d = `M0 ${bottom}L0 ${base}`
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width
    const y = base - 12 - ((hashString(`${seed}-${i}`) % 26) + (i % 2) * 8)
    d += `S${x - 18} ${y - 14} ${x} ${y}`
  }
  return `${d}V${bottom}Z`
}

function Stars({ seed }: { seed: number }) {
  return (
    <g fill="#fff4cf">
      {Array.from({ length: 28 }).map((_, i) => {
        const h = hashString(`${seed}-star-${i}`)
        const x = (h % 400) + 0
        const y = ((h >>> 8) % 90) + 4
        return <circle key={i} cx={x} cy={y} r={0.8 + ((h >>> 4) % 10) / 10} opacity={0.5 + ((h >>> 6) % 5) / 10} />
      })}
    </g>
  )
}

function Celestial({ sky, seed }: { sky: Sky; seed: number }) {
  const x = 70 + (seed % 5) * 62
  if (sky === 'night') {
    return (
      <g>
        <circle cx={x} cy="34" r="26" fill="#fff4cf" opacity="0.16" />
        <path d={`M${x + 8} 14A19 19 0 1 0 ${x + 8} 54A15 15 0 1 1 ${x + 8} 14Z`} fill="#fff1c4" />
      </g>
    )
  }
  if (sky === 'dusk') {
    return (
      <g>
        <circle cx={x} cy="82" r="30" fill="#ffd89a" opacity="0.4" />
        <circle cx={x} cy="82" r="17" fill="#ffe7b3" />
      </g>
    )
  }
  const low = sky === 'dawn' || sky === 'golden'
  return (
    <g>
      <circle cx={x} cy={low ? 64 : 36} r={low ? 32 : 26} fill="#fff1c0" opacity={sky === 'mist' ? 0.28 : 0.45} />
      <circle cx={x} cy={low ? 64 : 36} r={low ? 17 : 14} fill={sky === 'mist' ? '#fff7de' : C.gold} opacity={sky === 'mist' ? 0.8 : 1} />
    </g>
  )
}

/**
 * An illustration for a place: a small scene (sky, ridge, ground) with the place's own landmark or dish
 * in front. Everything is drawn from flat shapes in the Journie palette; the variation (sun position,
 * clouds, stars) is seeded by the place id so a card always looks the same.
 */
export function PlaceArt({ poi, className = '' }: { poi: Poi; className?: string }) {
  const spec = SPECS[poi.id] ?? BY_CATEGORY[poi.cat]
  const ids = useId()
  return <ArtScene spec={spec} seed={hashString(poi.id)} karst={false} className={className} uid={ids} />
}

/** Cover art for a city, used where there is no photograph. */
export function CityArt({ city, className = '' }: { city: CityId; className?: string }) {
  const ids = useId()
  const spec: Spec = { m: TwinHills, ground: 'land', sky: 'day' }
  return <ArtScene spec={spec} seed={hashString(city)} karst={false} className={className} uid={ids} />
}

function ArtScene({ spec, seed, karst, className, uid }: { spec: Spec; seed: number; karst: boolean; className: string; uid: string }) {
  const { m: Motif, props, ground, sky } = spec
  const table = ground === 'table'
  const scale = spec.scale ?? (table ? 1.1 : 0.95)
  const [top, bottom] = SKY[sky]
  const [far, near] = RIDGE[sky]
  const gid = `${uid}-g`
  const sid = `${uid}-s`
  const gradient = table ? (sky === 'dusk' ? ['#f2b88f', '#fbe5c6'] : ['#f9e6c8', '#fbf3df']) : [top, bottom]
  const g = !table ? GROUND[ground as Exclude<Ground, 'table'>] : ['#d96745', '#b8553d']
  const night = sky === 'night' || sky === 'dusk'
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={sid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={gradient[0]} />
          <stop offset="1" stopColor={gradient[1]} />
        </linearGradient>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={g[0]} />
          <stop offset="1" stopColor={g[1]} />
        </linearGradient>
        <pattern id={`${uid}-grain`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.7" fill={INK} opacity="0.07" />
          <circle cx="4.5" cy="4.5" r="0.7" fill={INK} opacity="0.05" />
        </pattern>
      </defs>
      <rect width="400" height="160" fill={`url(#${sid})`} />

      {!table && (
        <>
          {sky === 'night' && <Stars seed={seed} />}
          <Celestial sky={sky} seed={seed} />
          <g fill="#fff" opacity={night ? 0.16 : 0.75}>
            {[0, 1, 2].map((i) => {
              const h = hashString(`${seed}-cloud-${i}`)
              return <path key={i} transform={`translate(${30 + ((h % 330) | 0)} ${18 + ((h >>> 5) % 30)}) scale(${0.8 + ((h >>> 3) % 6) / 10})`} d="M-22 8C-34 8 -36 -4 -26 -6C-26 -17 -10 -20 -4 -11C4 -19 20 -12 18 -2C30 -2 32 8 20 8Z" />
            })}
          </g>
          <path d={karst ? karstPath(400, 112, 160, farPeaks) : hills(400, 112, 160, seed)} fill={far} />
          <path d={karst ? karstPath(400, 124, 160, nearPeaks) : hills(400, 124, 160, seed + 7)} fill={near} />
          <rect y="122" width="400" height="38" fill={`url(#${gid})`} />
          {ground === 'water' &&
            [0, 1, 2].map((i) => (
              <path key={i} d={`M${-20 + i * 70} ${134 + i * 8}q14 -6 28 0t28 0t28 0t28 0t28 0t28 0t28 0`} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
            ))}
          {ground === 'street' && <path d="M0 140H400M40 122L10 160M140 122L120 160M240 122L250 160M340 122L370 160" stroke={INK} strokeOpacity="0.16" strokeWidth="1.4" fill="none" />}
        </>
      )}

      {table && (
        <>
          <g fill="#fff" opacity="0.5">
            {[40, 120, 200, 280, 360].map((x, i) => (
              <circle key={x} cx={x} cy={26 + (i % 2) * 22} r="9" opacity="0.6" />
            ))}
          </g>
          <rect y="108" width="400" height="52" fill={`url(#${gid})`} />
          <path d="M0 108H400" stroke={INK} strokeWidth="2.4" />
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M${i * 44} 108L${i * 44 - 30} 160`} stroke={C.cream} strokeOpacity="0.32" strokeWidth="5" />
          ))}
        </>
      )}

      <g transform={`translate(200 ${table ? 128 : 124}) scale(${scale})`} className="art-motif">
        <Motif {...(props as Record<string, never>)} />
      </g>
      <rect width="400" height="160" fill={`url(#${uid}-grain)`} />
    </svg>
  )
}
