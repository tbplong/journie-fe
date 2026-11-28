/**
 * Where each history entry was scrolled to, as a browser remembers it for ordinary pages: going back or forward returns to
 * the same spot, a new page starts at the top, and a reload keeps the place (kept in sessionStorage for this tab).
 */
const STORE_KEY = 'journie-scroll'

let positions: Record<string, number> = {}
try {
  positions = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '{}') as Record<string, number>
} catch {
  positions = {}
}

/** The entry being read now; scroll events are booked to it (set as soon as a page commits, before any scroll lands). */
let current = ''

export function enterEntry(key: string) {
  current = key
}

export function rememberScroll(y: number) {
  if (current) positions[current] = y
}

export function recalledScroll(key: string): number | undefined {
  return positions[key]
}

export function persistScroll() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(positions))
  } catch {
    // private mode: positions last until the tab reloads
  }
}

/** Scrolls back to `y`, trying again for a moment while the page is still growing (data arriving) until it can get there. */
export function restoreScroll(y: number) {
  let tries = 0
  const step = () => {
    window.scrollTo({ top: y, behavior: 'instant' })
    if (Math.abs(window.scrollY - y) > 2 && tries++ < 40) requestAnimationFrame(step)
  }
  step()
}
