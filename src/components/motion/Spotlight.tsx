import type { PointerEvent } from 'react'

/**
 * Pointer handler for the `.spotlight` class (see index.css): a soft pool of light
 * follows the cursor across the surface. Spread it on any element that also has the class.
 */
export function trackSpotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
}
