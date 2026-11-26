import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useInView, type PanInfo } from 'motion/react'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Coordinates } from '../components/motion/Coordinates'
import { RevealHeading } from '../components/motion/RevealHeading'
import { Stagger } from '../components/motion/Stagger'
import { EASE_OUT, riseItem, slideItem } from '../components/motion/variants'
import { destinations } from '../content/site'
import { MAP_VIEW, mapPoint, VIETNAM_PATH } from '../content/vietnamMap'
import { cityGallery } from '../domain/cityMedia'
import { cityById } from '../domain/pois'
import type { CityId } from '../domain/types'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPrefs } from '../hooks/useMotionPrefs'
import { useCityStore } from '../store/cityStore'

/** A place on the map: the six destinations and the cities Journie plans (`plan`), north to south. */
type Spot = { id: string; name: string; region: string; description: string; image: string; alt: string; lat: number; lng: number; plan?: CityId }

/** Islands drawn as dots (the 1:50m outline has no room for them): a few of each archipelago's main islands. */
const HOANG_SA: [number, number][] = [[16.83, 112.33], [16.53, 111.61], [15.78, 111.2], [16.67, 112.73], [16.97, 112.27], [16.45, 111.98]]
const TRUONG_SA: [number, number][] = [[8.64, 111.92], [11.43, 114.33], [9.88, 114.33], [10.18, 114.36], [7.89, 112.91], [10.38, 114.47], [9.2, 113.2]]
const PLANNED_CITIES: CityId[] = ['ha-noi', 'hue', 'da-nang']
/** Quintic in-out, as the map hands over to a place's story. */
const SLIDE = [0.83, 0, 0.17, 1] as const

const pct = (lat: number, lng: number) => {
  const { x, y } = mapPoint(lat, lng)
  return { left: `${(x / MAP_VIEW.width) * 100}%`, top: `${(y / MAP_VIEW.height) * 100}%` }
}

/**
 * The destinations as an atlas page: Vietnam drawn in a thin ink line on paper, a pin for each place. Pointing at a place opens a
 * circle of its real photo and moves the coordinates; choosing it slides the map aside for the place's story, which can be dragged
 * to the next one. Reduced motion draws the map at once and swaps without sliding.
 */
export function Explore() {
  const { messages, language } = useLanguage()
  const copy = messages.explore
  const vi = language === 'vi'
  const { reduced } = useMotionPrefs()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.25, once: true })
  const nearby = useInView(ref, { margin: '100% 0px', once: true })
  const setCity = useCityStore((state) => state.setCity)

  const spots = useMemo<Spot[]>(
    () =>
      [
        ...destinations.map((item, index) => ({
          id: item.id,
          name: copy.destinations[index].name,
          region: copy.destinations[index].region,
          description: copy.destinations[index].description,
          image: item.image,
          alt: copy.destinations[index].alt,
          lat: item.coordinates[0],
          lng: item.coordinates[1],
          ...(item.id === 'sai-gon' ? { plan: 'sai-gon' as CityId } : {}),
        })),
        ...PLANNED_CITIES.map((id) => {
          const city = cityById[id]
          const cover = cityGallery[id][0]
          return { id, name: vi ? city.name : city.nameEn, region: copy.plannedRegion, description: city.tagline[vi ? 0 : 1], image: cover.src, alt: cover.name[vi ? 0 : 1], lat: city.lat, lng: city.lng, plan: id }
        }),
      ].sort((a, b) => b.lat - a.lat),
    [copy, vi],
  )

  const [active, setActive] = useState(spots.findIndex((spot) => spot.id === 'ha-long'))
  const [open, setOpen] = useState(false)
  const [dir, setDir] = useState(1)
  const spot = spots[active]

  // Every photo is decoded before the section arrives, so the circle never opens on an empty frame
  useEffect(() => {
    if (!nearby) return
    for (const item of spots) {
      const image = new Image()
      image.src = item.image
      void image.decode().catch(() => undefined)
    }
  }, [nearby, spots])

  const step = (by: number) => {
    setDir(by)
    setActive((index) => (index + by + spots.length) % spots.length)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const choose = (index: number) => {
    setDir(index >= active ? 1 : -1)
    setActive(index)
    setOpen(true)
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70) step(1)
    else if (info.offset.x > 70) step(-1)
  }

  return (
    <section ref={ref} id="kham-pha" className="atlas relative isolate scroll-mt-20 overflow-hidden py-24 sm:py-28">
      <div className="container-shell grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Stagger inView gap={0.12} className="relative z-10">
          <motion.p variants={slideItem} className="section-kicker text-terracotta-ink">
            {copy.kicker}
          </motion.p>
          <RevealHeading className="section-title mt-5 max-w-xl text-forest" parts={[{ text: copy.title }]} />
          <motion.p variants={riseItem} className="atlas-mono mt-6 max-w-md text-[0.82rem] leading-6 text-ink/70">
            {copy.description}
          </motion.p>

          <motion.p variants={slideItem} className="atlas-mono mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-ink/50">
            {messages.accessibility.destinationPicker}
          </motion.p>
          <motion.ol variants={riseItem} className="atlas-list mt-3 flex gap-x-5 gap-y-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" aria-label={messages.accessibility.destinationPicker}>
            {spots.map((item, index) => (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={index === active && open}
                  onClick={() => choose(index)}
                  onPointerEnter={(event) => event.pointerType === 'mouse' && !open && setActive(index)}
                  onFocus={() => !open && setActive(index)}
                  className={`atlas-mono group inline-flex items-baseline gap-3 py-1 text-left text-[clamp(1rem,1.6vw,1.45rem)] transition-colors ${index === active ? 'text-terracotta-ink' : 'text-ink/55 hover:text-ink'}`}
                >
                  <span className="tabular text-[0.65rem] text-ink/35">{String(index + 1).padStart(2, '0')}</span>
                  {item.name}
                  {item.plan && <Sparkles size={12} className="self-center text-sun-ink" aria-label={copy.plannable} />}
                </button>
              </li>
            ))}
          </motion.ol>
        </Stagger>

        <div className="relative">
          <div className="atlas-mono mb-3 flex items-center justify-between gap-4 text-[0.68rem] uppercase tracking-[0.2em] text-ink/55">
            <span className="max-sm:hidden">{copy.mapHint}</span>
            <Coordinates latitude={spot.lat} longitude={spot.lng} className="tabular ml-auto text-ink/70" />
          </div>

          <div className="relative mx-auto lg:h-[min(78vh,46rem)]">
            {/* The map: it steps aside and fades while a place's story is open */}
            <motion.div
              className="relative mx-auto aspect-[950/1239] h-full max-h-[78vh] max-w-full lg:max-h-none"
              animate={open && !reduced ? { x: '-16%', opacity: 0.22, scale: 0.92 } : { x: 0, opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 1.1, ease: SLIDE }}
              aria-hidden={open}
            >
              <svg viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={copy.mapLabel}>
                <defs>
                  <pattern id="atlas-grid" width="76" height="76" patternUnits="userSpaceOnUse">
                    <path d="M76 0H0V76" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 6" />
                  </pattern>
                </defs>
                <rect width={MAP_VIEW.width} height={MAP_VIEW.height} fill="url(#atlas-grid)" className="text-forest/15" />
                <motion.path
                  d={VIETNAM_PATH}
                  className="atlas-land"
                  initial={reduced ? false : { pathLength: 0, fillOpacity: 0 }}
                  animate={inView ? { pathLength: 1, fillOpacity: 1 } : undefined}
                  transition={{ pathLength: { duration: 2.4, ease: [0.45, 0.05, 0.25, 1] }, fillOpacity: { duration: 1, delay: 2 } }}
                />
                {[HOANG_SA, TRUONG_SA].map((islands, group) => (
                  <motion.g key={group} initial={reduced ? false : { opacity: 0 }} animate={inView ? { opacity: 1 } : undefined} transition={{ duration: 0.8, delay: 2.1 + group * 0.2 }}>
                    {islands.map(([lat, lng]) => {
                      const point = mapPoint(lat, lng)
                      return <circle key={`${lat}-${lng}`} cx={point.x} cy={point.y} r="3.2" className="fill-forest/70" />
                    })}
                    <text
                      x={mapPoint(group ? 9.6 : 17.4, group ? 112.6 : 111.9).x}
                      y={mapPoint(group ? 9.6 : 17.4, group ? 112.6 : 111.9).y}
                      className="atlas-label"
                      textAnchor="middle"
                    >
                      {group ? copy.truongSa : copy.hoangSa}
                    </text>
                  </motion.g>
                ))}
                <text x={mapPoint(13.2, 111.4).x} y={mapPoint(13.2, 111.4).y} className="atlas-label atlas-sea" textAnchor="middle">
                  {copy.eastSea}
                </text>
              </svg>

              {/* The photo circle of the place being looked at */}
              <AnimatePresence>
                {!open && (
                  <motion.span
                    key={spot.id}
                    className="atlas-lens pointer-events-none absolute z-10 block -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
                    style={pct(spot.lat, spot.lng)}
                    initial={reduced ? { opacity: 0 } : { clipPath: 'circle(0% at 50% 50%)' }}
                    animate={reduced ? { opacity: 1 } : { clipPath: 'circle(50% at 50% 50%)' }}
                    exit={reduced ? { opacity: 0 } : { clipPath: 'circle(0% at 50% 50%)', transition: { duration: 0.25 } }}
                    transition={{ duration: 0.55, ease: EASE_OUT }}
                  >
                    <img src={spot.image} alt="" className="atlas-lens-photo h-full w-full object-cover" />
                  </motion.span>
                )}
              </AnimatePresence>

              {spots.map((item, index) => {
                const current = index === active
                return (
                  <button
                    key={item.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => choose(index)}
                    onPointerEnter={(event) => event.pointerType === 'mouse' && !open && setActive(index)}
                    className={`atlas-pin absolute z-20 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center ${current ? 'is-current' : ''}`}
                    style={pct(item.lat, item.lng)}
                    aria-label={item.name}
                  >
                    <span className="atlas-pin-dot" />
                    {current && !open && <span className="atlas-pin-name atlas-mono">{item.name}</span>}
                  </button>
                )
              })}
            </motion.div>

            {/* The story of the chosen place, sliding in over the map's old place; drag sideways for the next one */}
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              {open && (
                <motion.article
                  key={spot.id}
                  custom={dir}
                  className="atlas-story mt-6 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:w-[68%]"
                  initial={reduced ? { opacity: 0 } : { x: dir > 0 ? '70%' : '-30%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { x: dir > 0 ? '-30%' : '70%', opacity: 0, transition: { duration: 0.45, ease: SLIDE } }}
                  transition={{ duration: reduced ? 0.15 : 0.9, ease: SLIDE }}
                  drag={reduced ? false : 'x'}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={onDragEnd}
                  aria-live="polite"
                >
                  <div className="relative h-56 overflow-hidden sm:h-72 lg:h-[55%]">
                    <img src={spot.image} alt={spot.alt} draggable={false} className="h-full w-full object-cover" />
                    <span className="atlas-mono absolute left-4 top-4 bg-paper/90 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-ink/70">
                      {String(active + 1).padStart(2, '0')} — {String(spots.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 p-5 sm:p-6">
                    <p className="atlas-mono text-[0.68rem] uppercase tracking-[0.22em] text-terracotta-ink">{spot.region}</p>
                    <h3 className="font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[0.95] tracking-[-0.03em] text-forest">{spot.name}</h3>
                    <p className="max-w-md text-[0.95rem] leading-7 text-ink/75">{spot.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
                        <ArrowLeft size={15} aria-hidden="true" /> {copy.back}
                      </button>
                      {spot.plan ? (
                        <Link to="/app/plan" className="btn-gold btn-sm" onClick={() => setCity(spot.plan!)}>
                          <Sparkles size={15} aria-hidden="true" /> {copy.plan.replace('{city}', spot.name)}
                        </Link>
                      ) : (
                        <span className="text-xs text-ink/55">{copy.notYet}</span>
                      )}
                      <button type="button" className="ml-auto grid size-9 place-items-center rounded-full border border-forest/20 text-ink/70 hover:border-forest" onClick={() => step(1)} aria-label={copy.next}>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
