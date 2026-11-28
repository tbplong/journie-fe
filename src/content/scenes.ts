import { cityDrawing } from '../domain/cityMedia'
import { HERO_PLACES } from './heroPlaces'

/** A background drawing and the palette named after it in app.css (`html[data-app-scene]`). */
export type Scene = { id: string; day: string; night: string }

/** Every drawing the app can lie on: the six destinations and the app's four cities (Sài Gòn is both). */
export const SCENES: Scene[] = [
  ...HERO_PLACES.map((place) => ({ id: place.id, day: place.drawing, night: place.drawingNight })),
  ...Object.entries(cityDrawing)
    .filter(([id]) => !HERO_PLACES.some((place) => place.id === id))
    .map(([id, drawing]) => ({ id, ...drawing })),
]

const LAST_KEY = 'journie-scene-last'
let chosen: Scene | null = null

/**
 * A drawing for this page load, at random and never the one shown on the previous load, so every reload brings another.
 * Chosen once per load, so a second call (React's strict mode runs initialisers twice) agrees with the first.
 */
export function pickScene(): Scene {
  if (chosen) return chosen
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_KEY)
  } catch {
    last = null
  }
  const pool = SCENES.filter((scene) => scene.id !== last)
  chosen = pool[Math.floor(Math.random() * pool.length)]
  try {
    localStorage.setItem(LAST_KEY, chosen.id)
  } catch {
    // private mode: the choice just is not remembered
  }
  return chosen
}
