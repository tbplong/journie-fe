import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** How a page change reads: between tabs (a cross-fade), into a trip or a set (from the right), or back out (from the left). */
export type PageMove = 'lateral' | 'forward' | 'back'

let committed: (() => void) | null = null

/** The shell calls this once the new page is in the DOM (a layout effect on the path), so the transition can picture it. */
export function pageCommitted() {
  committed?.()
  committed = null
}

/**
 * Navigates inside the browser's View Transition, the engine behind React's <ViewTransition> (which needs React canary):
 * the old page is pictured, the route changes, and the CSS under "Page moves" in app.css animates the pictures by
 * `html[data-move]`. Without the API, or with reduced motion, it simply navigates.
 */
export function movePage(navigate: () => void, move: PageMove) {
  // A hidden page never renders the frame the transition waits for, so it would never navigate
  if (typeof document.startViewTransition !== 'function' || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate()
    return
  }
  const root = document.documentElement
  root.dataset.move = move
  let started = false
  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        started = true
        committed = resolve
        navigate()
        // The router commits inside a React transition; never hold the screen if that commit does not come
        window.setTimeout(resolve, 400)
      }),
  )
  // Skipping runs the update at once, so the click always navigates even if the browser never starts the transition
  window.setTimeout(() => {
    if (!started) transition.skipTransition()
  }, 300)
  transition.ready.catch(() => undefined)
  void transition.finished.finally(() => {
    delete root.dataset.move
  })
}

/**
 * onClick for a link that should move with a transition. Clicks for a new tab or window, and the page already open, are left
 * to the browser. Parts of the link marked `data-vt-name` (a trip's title) carry over to the page it opens.
 */
export function useMoveLink() {
  const navigate = useNavigate()
  const location = useLocation()
  return (to: string, move: PageMove) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || to === location.pathname) return
    event.preventDefault()
    for (const part of event.currentTarget.querySelectorAll<HTMLElement>('[data-vt-name]')) part.style.viewTransitionName = part.dataset.vtName ?? ''
    movePage(() => navigate(to), move)
  }
}
