/** Window event that makes Journie cheer: dispatched when something nice happens (a trip is saved, a place is hearted). */
export const CHEER_EVENT = 'journie:cheer'

export function cheer() {
  window.dispatchEvent(new CustomEvent(CHEER_EVENT))
}
