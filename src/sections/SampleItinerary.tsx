import { useRef } from 'react'
import { motion, useInView, useScroll, useSpring } from 'motion/react'
import { Banknote, CarFront, Clock3, Footprints, MapPin, Navigation } from 'lucide-react'
import { CountUp } from '../components/motion/CountUp'
import { RevealHeading } from '../components/motion/RevealHeading'
import { CityScene } from '../components/scenes/CityScene'
import { sampleItinerary, siteConfig } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { useParallax } from '../hooks/useMotionPrefs'
import { formatCost, formatDistance, formatDuration } from '../utils/formatters'

type Stop = (typeof sampleItinerary)[number]

function ItineraryStop({ item, index }: { item: Stop; index: number }) {
  const { language, locale, messages } = useLanguage()
  const ref = useRef<HTMLLIElement>(null)
  const current = useInView(ref, { margin: '-42% 0px -42% 0px' })
  const localizedItem = messages.itinerary.stops[index]

  return (
    <li
      ref={ref}
      className="group relative border-t border-forest/15 py-7 pl-11 first:border-t-0 first:pt-0 sm:pl-12"
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 z-10 grid size-7 place-items-center rounded-full text-[0.65rem] font-semibold transition-all duration-500 ${
          index === 0 ? 'top-0' : 'top-7'
        } ${
          current ? 'scale-125 bg-terracotta text-paper shadow-[0_0_0_6px_rgba(217,103,69,0.2)]' : 'bg-forest text-paper'
        }`}
      >
        {index + 1}
      </span>

      <article className="grid gap-5 sm:grid-cols-[5.5rem_1fr] sm:gap-7">
        <div>
          <p className="font-display text-2xl font-medium text-forest">{item.time}</p>
          <p className="text-[0.65rem] text-ink/40">
            {messages.itinerary.to} {item.endTime}
          </p>
        </div>

        <div>
          <p className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-terracotta">
            <MapPin aria-hidden="true" size={13} />
            {localizedItem.area}
            <span className="text-forest/25">·</span>
            <span className="text-forest/55">{localizedItem.category}</span>
          </p>
          <h4 className="mt-2 font-display text-xl font-medium transition-colors duration-300 group-hover:text-terracotta sm:text-2xl">{localizedItem.place}</h4>
          <p className="mt-2 text-xs leading-5 text-ink/55 sm:text-sm">{localizedItem.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] font-medium text-ink/45">
            <span className="flex items-center gap-1.5">
              <Clock3 aria-hidden="true" size={13} />
              {formatDuration(item.durationMinutes, language)}
            </span>
            <span className="flex items-center gap-1.5">
              <Banknote aria-hidden="true" size={13} />
              {formatCost(item.costVnd, locale)}
            </span>
          </div>
        </div>
      </article>

      {item.travelToNext && (
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '0px 0px -8% 0px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 grid gap-3 border-l-2 border-dashed border-forest/25 bg-paper/70 px-4 py-3 sm:ml-[6.35rem] sm:grid-cols-[auto_1fr] sm:items-center"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-forest">
            {item.travelToNext.mode === 'walk' ? (
              <Footprints aria-hidden="true" size={15} />
            ) : (
              <CarFront aria-hidden="true" size={15} />
            )}
            {messages.itinerary.modes[item.travelToNext.mode]} ·{' '}
            {formatDistance(item.travelToNext.distanceKm, locale)} ·{' '}
            {formatDuration(item.travelToNext.durationMinutes, language)}
          </span>
        </motion.div>
      )}
    </li>
  )
}

export function SampleItinerary() {
  const { language, locale, messages } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const figureRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  const { scrollYProgress: sectionProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const { scrollYProgress: figureProgress } = useScroll({ target: figureRef, offset: ['start end', 'end start'] })
  const { scrollYProgress: listProgress } = useScroll({ target: listRef, offset: ['start 65%', 'end 55%'] })

  const photoY = useParallax(figureProgress, -28, 28)
  const lineScale = useSpring(listProgress, { stiffness: 90, damping: 26, mass: 0.4 })

  return (
    <section
      ref={sectionRef}
      id="hanh-trinh"
      className="section-padding relative scroll-mt-20 overflow-hidden bg-forest text-paper"
    >
      <CityScene progress={sectionProgress} />

      <div className="container-shell relative grid gap-14 lg:grid-cols-[0.68fr_1.32fr] lg:gap-18">
        <div className="lg:sticky lg:top-30 lg:self-start">
          <p className="section-kicker text-sun">{messages.itinerary.kicker}</p>
          <RevealHeading
            className="mt-5 max-w-xl font-display text-[clamp(2.6rem,5vw,5rem)] font-medium leading-[1.02] tracking-[-0.05em]"
            parts={[{ text: messages.itinerary.title }]}
          />
          <p className="mt-7 max-w-lg text-base leading-7 text-paper/62">{messages.itinerary.description}</p>

          <div className="mt-8 border-l-2 border-sun pl-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sun">
              {messages.itinerary.profileLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-paper/65">{messages.itinerary.profile}</p>
          </div>

          <div className="mt-9 grid max-w-lg grid-cols-3 border-y border-paper/15 py-5">
            <div>
              <p className="font-display text-2xl">{messages.itinerary.dayCount}</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">
                {messages.itinerary.durationLabel}
              </p>
            </div>
            <div className="border-x border-paper/15 px-5">
              <p className="font-display text-2xl">{messages.itinerary.stopCount}</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">
                {messages.itinerary.stopsLabel}
              </p>
            </div>
            <div className="pl-5">
              <p className="font-display text-2xl">
                <CountUp value={4.3} format={(value) => formatDistance(value, locale)} />
              </p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">
                {messages.itinerary.travelLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-paper/15 bg-cream text-ink shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
          <figure ref={figureRef} className="relative h-48 overflow-hidden sm:h-60">
            <motion.img
              src={siteConfig.sampleItineraryImage}
              alt={messages.itinerary.imageAlt}
              className="absolute inset-x-0 -top-8 h-[calc(100%+4rem)] w-full object-cover will-change-transform"
              style={{ y: photoY }}
              width="1280"
              height="558"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
            <figcaption className="absolute bottom-5 left-6 text-paper sm:bottom-7 sm:left-9">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-paper/65">
                10.7769° N, 106.7009° E
              </p>
              <p className="mt-1 font-display text-2xl sm:text-3xl">{messages.itinerary.imageCaption}</p>
            </figcaption>
          </figure>

          <div className="flex flex-col gap-5 border-b border-forest/15 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-terracotta">
                {messages.itinerary.optimized}
              </p>
              <h3 className="mt-2 font-display text-3xl font-medium">{messages.itinerary.routeTitle}</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 border border-forest/15 bg-paper px-3 py-2">
                <Banknote aria-hidden="true" size={14} />
                <CountUp value={450000} format={(value) => formatCost(Math.round(value / 1000) * 1000, locale)} />
              </span>
              <span className="flex items-center gap-1.5 border border-forest/15 bg-paper px-3 py-2">
                <Navigation aria-hidden="true" size={14} />
                <CountUp value={45} format={(value) => formatDuration(Math.max(1, Math.round(value)), language)} />
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-9">
            <div className="mb-8 flex items-start gap-3 border-l-3 border-sun bg-sun/18 p-4">
              <span className="relative mt-0.5 shrink-0">
                <Navigation aria-hidden="true" size={20} className="text-terracotta" />
                <span className="absolute -right-0.5 -top-0.5 size-2 animate-ping rounded-full bg-terracotta" />
              </span>
              <div>
                <p className="text-sm font-semibold">{messages.itinerary.trafficTitle}</p>
                <p className="mt-1 text-xs leading-5 text-ink/60">{messages.itinerary.trafficDescription}</p>
              </div>
            </div>

            <div className="relative">
              <div aria-hidden="true" className="absolute bottom-3 left-0 top-3 flex w-7 justify-center">
                <span className="absolute inset-y-0 w-px bg-forest/15" />
                <motion.span
                  style={{ scaleY: lineScale }}
                  className="absolute inset-y-0 w-0.5 origin-top bg-gradient-to-b from-terracotta to-sun"
                />
              </div>
              <ol ref={listRef} aria-label={messages.accessibility.itinerary} className="relative">
                {sampleItinerary.map((item, index) => (
                  <ItineraryStop key={item.time} item={item} index={index} />
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
