import { motion } from 'motion/react'
import { journeyChapters } from '../content/site'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLanguage } from '../hooks/useLanguage'
import { HERO_PLACES, heroPlace } from '../content/heroPlaces'
import { Coordinates } from './motion/Coordinates'
import { EASE_OUT } from './motion/variants'

const chapterIds: readonly string[] = journeyChapters.map((chapter) => chapter.id)
const lastIndex = journeyChapters.length - 1
/** Chapter slots that name a destination, in order; the slot between Ha Long and Phu Quoc stays "across the country". */
const PLACE_SLOTS = [0, 1, 2, 3, 4, null, 5] as const
/** The rails arrive once the hero has finished its entrance. */
const ARRIVE = 1.3

/**
 * Scrolling reads as travelling. In the page margins of wide screens, a vertical readout
 * names the place the current section belongs to and a rail tracks progress between places.
 */
export function JourneyRail() {
  const { messages, language } = useLanguage()
  const activeId = useActiveSection(chapterIds, true)
  const index = Math.max(0, chapterIds.indexOf(activeId ?? chapterIds[0]))
  const chapter = journeyChapters[index]
  // The journey starts where the hero photograph is and visits the other places after it.
  const hero = heroPlace()
  const order = [hero, ...HERO_PLACES.filter((item) => item.id !== hero.id)]
  const slot = PLACE_SLOTS[index]
  const stop = slot === null ? null : order[slot]
  const place = stop ? (language === 'vi' ? stop.name[0] : stop.name[1]) : messages.journey.places[index]
  const coordinates: readonly [number, number] = stop ? [stop.lat, stop.lng] : chapter.coordinates
  const dark = chapter.tone === 'dark'

  return (
    <>
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: ARRIVE, ease: EASE_OUT }}
        className={`pointer-events-none fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 transition-colors duration-700 min-[1360px]:block ${
          dark ? 'text-paper' : 'text-ink'
        }`}
      >
        <p className="flex rotate-180 items-center gap-3 text-[0.68rem] [writing-mode:vertical-rl]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-terracotta opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-terracotta" />
          </span>
          <motion.span
            key={place}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="font-semibold tracking-wide"
          >
            {place}
          </motion.span>
          <Coordinates
            latitude={coordinates[0]}
            longitude={coordinates[1]}
            className={dark ? 'text-paper/60' : 'text-ink/55'}
          />
        </p>
      </motion.div>

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: ARRIVE, ease: EASE_OUT }}
        className="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 min-[1360px]:block"
      >
        <div className="relative h-56 w-3">
          <motion.span
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.9, delay: ARRIVE + 0.1, ease: EASE_OUT }}
            className={`absolute inset-y-0 left-1/2 w-px origin-top -translate-x-1/2 transition-colors duration-700 ${
              dark ? 'bg-paper/25' : 'bg-forest/20'
            }`}
          />
          <motion.span
            initial={false}
            animate={{ scaleY: index / lastIndex }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="absolute inset-y-0 left-1/2 w-0.5 origin-top -translate-x-1/2 bg-terracotta"
          />
          {journeyChapters.map((item, itemIndex) => (
            <motion.span
              key={item.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20, delay: ARRIVE + 0.2 + itemIndex * 0.06 }}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color,box-shadow] duration-300 ${
                itemIndex === index
                  ? 'size-3 bg-terracotta shadow-[0_0_0_5px_rgba(217,103,69,0.22)]'
                  : itemIndex < index
                    ? 'size-1.5 bg-terracotta'
                    : `size-1.5 ${dark ? 'bg-paper/45' : 'bg-forest/35'}`
              }`}
              style={{ top: `${(itemIndex / lastIndex) * 100}%` }}
            />
          ))}
        </div>
      </motion.div>
    </>
  )
}

