import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useMotionPrefs } from '../hooks/useMotionPrefs'
import { usePortalStore } from '../store/portalStore'
import { INTRO_MS, JournieIntro } from './JournieIntro'

/**
 * The passage between the sign-in pages and the app, both ways (signing in, signing out): a dark stage spreads from where
 * the traveler pressed, the Journie title is written on it (JournieIntro), the route changes underneath, then the camera
 * flies through the word into the new page. A click or Esc skips the title; reduced motion just changes the page.
 */
export function PortalWipe() {
  const { phase, to, origin, setPhase } = usePortalStore()
  const navigate = useNavigate()
  const { reduced } = useMotionPrefs()
  const advanced = useRef(false)

  // Runs once per closing phase, whether the title's clock or a skip gets there first.
  const advance = useCallback(() => {
    if (advanced.current) return
    advanced.current = true
    navigate(to)
    setPhase('opening')
  }, [navigate, setPhase, to])

  useEffect(() => {
    if (phase === 'closing') advanced.current = false
  }, [phase])

  useEffect(() => {
    if (phase !== 'closing' || !reduced) return
    navigate(to)
    setPhase('idle')
  }, [navigate, phase, reduced, setPhase, to])

  // The title runs on a timer rather than on animation callbacks, which stall in a hidden tab.
  useEffect(() => {
    if (phase !== 'closing' || reduced) return
    const timer = window.setTimeout(advance, INTRO_MS)
    return () => window.clearTimeout(timer)
  }, [advance, phase, reduced])

  useEffect(() => {
    if (phase !== 'closing' || reduced) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && advance()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, phase, reduced])

  useEffect(() => {
    if (phase !== 'opening') return
    const timer = window.setTimeout(() => setPhase('idle'), 800)
    return () => window.clearTimeout(timer)
  }, [phase, setPhase])

  if (phase === 'idle' || reduced) return null

  const closing = phase === 'closing'

  return (
    <motion.div
      key={phase}
      className={`portal-wipe fixed inset-0 z-[90] ${closing ? '' : 'pointer-events-none'}`}
      aria-hidden="true"
      onClick={closing ? advance : undefined}
      initial={closing ? { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, opacity: 1 } : { opacity: 1 }}
      animate={closing ? { clipPath: `circle(150vmax at ${origin.x}px ${origin.y}px)` } : { opacity: 0, scale: 2.4 }}
      transition={
        closing
          ? { duration: 0.5, ease: [0.7, 0, 0.3, 1] }
          : { duration: 0.75, ease: [0.55, 0, 0.9, 0.4], opacity: { duration: 0.75, ease: [0.7, 0, 1, 1] } }
      }
      onAnimationComplete={() => {
        if (!closing) setPhase('idle')
      }}
    >
      <JournieIntro settled={!closing} />
    </motion.div>
  )
}
