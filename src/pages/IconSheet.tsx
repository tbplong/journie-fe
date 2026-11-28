import { categoryIds } from '../domain/categories'
import { CategoryIcon, NavIcon, SkyIcon, WeatherIcon, type NavIconName, type WeatherKind } from '../components/icons'
import { DiAvatar } from '../components/mascot/DiAvatar'
import type { MascotMood } from '../components/mascot/mascot-context'

const NAV: NavIconName[] = ['home', 'plan', 'trips', 'discover', 'profile', 'account', 'analytics']
const MOODS: MascotMood[] = ['idle', 'hiding', 'peeking', 'thinking', 'error', 'joy', 'sleepy', 'wave', 'hungry', 'hot']
const WEATHER: WeatherKind[] = ['sunny', 'cloudy', 'rain', 'storm', 'night', 'night-cloudy', 'night-rain']
const SKIES = [
  ['day', 'clear'],
  ['day', 'rain'],
  ['night', 'clear'],
  ['night', 'storm'],
] as const

/** Dev-only contact sheet for the custom icon set (`/__icons`). */
export function IconSheet() {
  return (
    <div className="min-h-dvh bg-paper p-8 text-forest">
      <h1 className="h-display text-3xl">Journie icons</h1>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-forest/60">Journie: moods (day, clear) and outfits (idle)</h2>
        <ul className="flex flex-wrap gap-4">
          {MOODS.map((mood) => (
            <li key={mood} className="w-36 text-center text-xs">
              <DiAvatar mood={mood} phase="day" weather="clear" className="aspect-square w-full" />
              {mood}
            </li>
          ))}
          {SKIES.map(([phase, weather]) => (
            <li key={`${phase}-${weather}`} className="w-36 text-center text-xs">
              <DiAvatar mood="idle" phase={phase} weather={weather} className="aspect-square w-full" />
              {phase} {weather}
            </li>
          ))}
        </ul>
      </section>
      {[
        { label: 'Places', items: categoryIds.map((cat) => ({ key: cat, node: (size: number) => <CategoryIcon cat={cat} size={size} /> })) },
        { label: 'Weather', items: WEATHER.map((kind) => ({ key: kind, node: (size: number) => <WeatherIcon kind={kind} size={size} /> })) },
        { label: 'Sky (phase + weather)', items: SKIES.map(([phase, weather]) => ({ key: `${phase}-${weather}`, node: (size: number) => <SkyIcon phase={phase} weather={weather} size={size} /> })) },
        { label: 'Navigation', items: NAV.map((name) => ({ key: name, node: (size: number) => <NavIcon name={name} size={size} /> })) },
      ].map((group) => (
        <section key={group.label} className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-forest/60">{group.label}</h2>
          <ul className="flex flex-wrap items-end gap-6">
            {group.items.map((item) => (
              <li key={item.key} className="flex flex-col items-center gap-2 text-xs">
                <span className="flex items-end gap-3">
                  {item.node(96)}
                  {item.node(40)}
                  {item.node(22)}
                </span>
                {item.key}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
