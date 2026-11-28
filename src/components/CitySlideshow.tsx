import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cityGallery } from '../domain/cityMedia'
import { cityById } from '../domain/pois'
import type { CityId } from '../domain/types'
import { useMotionPrefs } from '../hooks/useMotionPrefs'
import { useTr } from '../hooks/useTr'

/** How long each photograph holds before the next one dissolves in. */
const HOLD_MS = 2700
const FADE_S = 1.1

/** Slow camera moves (zoom and drift), taken in turn so no two photos in a row move the same way. */
const DRIFT = [
  { scale: [1.04, 1.16], x: ['-1.5%', '1.5%'], y: ['0.5%', '-1%'] },
  { scale: [1.16, 1.05], x: ['1.5%', '-1%'], y: ['-1%', '0.5%'] },
  { scale: [1.06, 1.18], x: ['1%', '-1.5%'], y: ['1%', '-0.5%'] },
  { scale: [1.15, 1.04], x: ['-1%', '1%'], y: ['0%', '1%'] },
]

/**
 * The planning wait screen: real photographs of the city being planned, one after another, each slowly
 * drifting and dissolving into the next, like a short film of the trip. Reduced motion keeps only the dissolve.
 */
export function CitySlideshow({ city, title }: { city: CityId; title: string }) {
  const { tr } = useTr()
  const { reduced } = useMotionPrefs()
  const photos = cityGallery[city]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length < 2) return
    const timer = window.setInterval(() => setIndex((value) => value + 1), HOLD_MS)
    return () => window.clearInterval(timer)
  }, [photos])

  // Only the next photo is fetched ahead, so a short wait does not download the whole set
  useEffect(() => {
    new Image().src = photos[(index + 1) % photos.length].src
  }, [photos, index])

  const photo = photos[index % photos.length]
  const drift = DRIFT[index % DRIFT.length]
  const place = cityById[city]

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-night shadow-[0_40px_80px_-40px_rgba(0,0,0,0.85)] sm:aspect-[16/10]">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          style={{ zIndex: 1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // The old photo stays whole underneath while the new one dissolves in over it, so the picture never dims between them
          exit={{ opacity: 0, zIndex: 0, transition: { opacity: { delay: FADE_S, duration: 0.01 }, zIndex: { duration: 0 } } }}
          transition={{ duration: FADE_S, ease: 'easeInOut' }}
        >
          <motion.img
            src={photo.src}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
            initial={reduced ? false : { scale: drift.scale[0], x: drift.x[0], y: drift.y[0] }}
            animate={reduced ? undefined : { scale: drift.scale[1], x: drift.x[1], y: drift.y[1] }}
            transition={{ duration: HOLD_MS / 1000 + FADE_S, ease: 'linear' }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(8,20,18,0.6)_0%,rgba(8,20,18,0)_32%,rgba(8,20,18,0)_58%,rgba(8,20,18,0.72)_100%)]" />
      <h2 className="h-display absolute inset-x-0 top-0 z-10 p-6 text-[clamp(1.5rem,3vw,2.1rem)] text-paper sm:p-8">{title}</h2>

      <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8" aria-hidden="true">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-paper/70">{tr(place.name, place.nameEn)}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={photo.src}
            className="h-display mt-1.5 text-[clamp(1.35rem,2.6vw,1.9rem)] text-paper"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {tr(...photo.name)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
