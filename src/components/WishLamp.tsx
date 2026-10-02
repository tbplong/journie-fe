import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { siteConfig } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { SPARKLE_EVENT, type SparkleDetail } from './MagicCursor'

const WISH_VISIBLE_MS = 7000

/**
 * The Journie lamp as a small toy: rub it and a wisp of smoke rises with a trip wish.
 * Wishes come from the same kind of trips the planner builds.
 */
export function WishLamp() {
  const { messages } = useLanguage()
  const { wishes, wishLabel, wishCaption } = messages.hero
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [rubs, setRubs] = useState(0)
  const [wishIndex, setWishIndex] = useState<number | null>(null)

  useEffect(() => {
    if (wishIndex === null) return
    const timer = window.setTimeout(() => setWishIndex(null), WISH_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [wishIndex, rubs])

  const rub = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const detail: SparkleDetail = { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.3, count: 18 }
      window.dispatchEvent(new CustomEvent(SPARKLE_EVENT, { detail }))
    }
    setRubs((count) => count + 1)
    setWishIndex((current) => (current === null ? rubs % wishes.length : (current + 1) % wishes.length))
  }

  return (
    <div className="group relative">
      <div className="lamp-glow pointer-events-none absolute -inset-8 rounded-full" aria-hidden="true" />

      <button
        ref={buttonRef}
        type="button"
        onClick={rub}
        aria-label={wishLabel}
        className="relative grid size-24 place-items-center rounded-full border border-forest/15 bg-paper/90 shadow-lg backdrop-blur transition-shadow duration-500 hover:shadow-[0_18px_40px_-14px_rgba(240,185,75,0.8)] active:scale-95"
      >
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="spin-slow absolute inset-1 text-forest/35 transition-colors duration-500 group-hover:text-terracotta/60"
          fill="none"
        >
          <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2" strokeDasharray="1 5.6" />
        </svg>
        <motion.img
          src={siteConfig.logoMark}
          alt=""
          width="384"
          height="512"
          className="relative h-14 w-auto"
          animate={rubs ? { rotate: [0, -12, 10, -6, 0], scale: [1, 1.1, 1.06, 1.04, 1] } : undefined}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          key={rubs}
        />
      </button>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-forest opacity-0 shadow-md transition-opacity duration-300 group-hover:opacity-100"
      >
        {wishCaption}
      </span>

      {rubs > 0 && (
        <svg
          key={rubs}
          viewBox="0 0 120 200"
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-44 w-24 -translate-x-1/2"
          fill="none"
        >
          <defs>
            <linearGradient id="wisp-gradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#f0b94b" />
              <stop offset="1" stopColor="#4fb8a4" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="wisp-rise"
            pathLength="1"
            d="M60 196C20 170 100 140 56 112C18 88 92 64 64 20"
            stroke="url(#wisp-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      )}

      <div role="status" aria-live="polite" className="absolute left-full top-1/2 ml-5 w-56 -translate-y-1/2">
        <AnimatePresence mode="wait">
          {wishIndex !== null && (
            <motion.p
              key={wishIndex}
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative rounded-2xl rounded-l-sm border border-sun/50 bg-paper px-4 py-3 font-display text-sm italic leading-snug text-ink shadow-[0_16px_40px_-18px_rgba(23,63,53,0.55)]"
            >
              {wishes[wishIndex]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
