import {
  ArrowDownRight,
  ArrowRight,
  Banknote,
  BellRing,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  CloudRain,
  Compass,
  Footprints,
  Heart,
  Map,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  SunMedium,
  TrainFront,
  Umbrella,
  WalletCards,
} from 'lucide-react'
import {
  destinations,
  sampleItinerary,
  siteConfig,
} from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { formatCost, formatDistance, formatDuration } from '../utils/formatters'

const planningPillarIcons = [Heart, CalendarDays, CloudRain] as const
const stepIcons = [Compass, Sparkles, Route] as const
const adaptiveFeatureIcons = [Umbrella, Clock3, TrainFront, WalletCards] as const

export function LandingPage() {
  const { language, locale, messages } = useLanguage()

  return (
    <>
        <section
          id="top"
          className="relative scroll-mt-24 overflow-hidden pb-20 pt-12 lg:pb-30 lg:pt-20"
        >
          <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
            <div className="relative z-10 lg:pb-8">
              <p className="hero-reveal mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest/70">
                <span className="h-px w-9 bg-terracotta" />
                {messages.hero.eyebrow}
              </p>
              <h1 className="hero-reveal hero-reveal-delay-1 max-w-3xl font-display text-[clamp(3.25rem,7vw,6.6rem)] font-medium leading-[0.95] tracking-[-0.06em] text-ink">
                {messages.hero.title}
                <span className="mt-2 block italic text-terracotta">
                  {messages.hero.titleAccent}
                </span>
              </h1>
              <p className="hero-reveal hero-reveal-delay-2 mt-8 max-w-xl text-base leading-7 text-ink/67 sm:text-lg sm:leading-8">
                {messages.hero.description}
              </p>
              <div className="hero-reveal hero-reveal-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#hanh-trinh" className="button-primary justify-center">
                  {messages.hero.primaryCta}
                  <ArrowDownRight aria-hidden="true" size={18} />
                </a>
                <a href="#cach-hoat-dong" className="button-secondary justify-center">
                  {messages.hero.secondaryCta}
                </a>
              </div>
              <div className="hero-reveal hero-reveal-delay-3 mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-forest/15 pt-5 text-xs font-medium text-ink/60">
                {messages.hero.benefits.map((benefit) => (
                  <span key={benefit} className="flex items-center gap-2">
                    <Check aria-hidden="true" size={14} className="text-terracotta" />
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            <div className="hero-reveal hero-reveal-delay-2 relative mx-auto w-full max-w-2xl px-4 pb-14 sm:px-10 lg:mx-0 lg:max-w-none lg:pl-16 lg:pr-0">
              <div className="relative ml-auto aspect-[4/5] w-full max-w-[35rem] overflow-hidden rounded-b-2xl rounded-t-[18rem] bg-forest">
                <img
                  src={siteConfig.heroImage}
                  alt={messages.hero.imageAlt}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
                  width="1280"
                  height="854"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                <div className="absolute bottom-7 left-7 text-paper">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">
                    20.2506° N, 105.9745° E
                  </p>
                  <p className="mt-2 font-display text-3xl">{messages.hero.imageCaption}</p>
                </div>
              </div>

              <div className="absolute right-0 top-[18%] hidden border border-paper/40 bg-forest/92 px-4 py-3 text-paper shadow-xl backdrop-blur sm:block">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <SunMedium aria-hidden="true" size={15} className="text-sun" />
                  {messages.hero.weather}
                </p>
                <p className="mt-1 text-[0.65rem] text-paper/60">
                  {messages.hero.weatherNote}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-forest py-4 text-paper" aria-label={messages.accessibility.highlights}>
          <div className="container-shell flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] sm:justify-between">
            {messages.highlights.map((highlight) => (
              <span key={highlight}>{highlight}</span>
            ))}
          </div>
        </div>

        <section id="cau-chuyen" className="section-padding scroll-mt-20 bg-cream">
          <div className="container-shell">
            <div className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[0.34fr_1fr] lg:gap-16 lg:pb-20">
              <p className="section-kicker">{messages.story.kicker}</p>
              <div>
                <h2 className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]">
                  {messages.story.title}
                  <span className="italic text-terracotta">{messages.story.titleAccent}</span>
                </h2>
                <p className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
                  {messages.story.description}
                </p>
              </div>
            </div>

            <div className="grid border-b border-forest/15 md:grid-cols-3">
              {messages.story.pillars.map(({ label, title, description }, index) => {
                const Icon = planningPillarIcons[index]
                return (
                  <article
                    key={index}
                    className="group border-forest/15 py-9 md:border-r md:px-8 md:py-12 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-12 place-items-center border border-forest/20 text-forest transition-colors group-hover:bg-forest group-hover:text-paper">
                        <Icon aria-hidden="true" size={21} strokeWidth={1.7} />
                      </span>
                      <span className="font-display text-lg italic text-ink/35">0{index + 1}</span>
                    </div>
                    <p className="mt-9 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">
                      {label}
                    </p>
                    <h3 className="mt-3 max-w-xs font-display text-2xl font-medium leading-tight">
                      {title}
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="cach-hoat-dong" className="section-padding scroll-mt-20 bg-paper">
          <div className="container-shell">
            <div className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[1fr_0.34fr] lg:gap-16 lg:pb-20">
              <div>
                <h2 className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]">
                  {messages.howItWorks.title}
                </h2>
                <p className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
                  {messages.howItWorks.description}
                </p>
              </div>
              <p className="section-kicker text-right">{messages.howItWorks.kicker}</p>
            </div>

            <div className="mt-14 grid gap-px border border-forest/15 bg-forest/15 lg:mt-20 lg:grid-cols-3">
              {messages.howItWorks.steps.map(({ title, description }, index) => {
                const Icon = stepIcons[index]
                return (
                  <article
                    key={index}
                    className="group relative bg-paper p-7 sm:p-10 lg:min-h-[25rem]"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-display text-5xl italic text-forest/18">0{index + 1}</span>
                      <Icon
                        aria-hidden="true"
                        size={29}
                        strokeWidth={1.45}
                        className="text-terracotta"
                      />
                    </div>
                    <div className="mt-18 lg:mt-28">
                      <h3 className="font-display text-3xl font-medium tracking-[-0.025em]">
                        {title}
                      </h3>
                      <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
                    </div>
                    {index < messages.howItWorks.steps.length - 1 && (
                      <ArrowRight
                        className="absolute -right-3 top-1/2 z-10 hidden size-6 rounded-full bg-forest p-1 text-paper lg:block"
                        aria-hidden="true"
                      />
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="hanh-trinh" className="section-padding scroll-mt-20 bg-forest text-paper">
          <div className="container-shell grid gap-14 lg:grid-cols-[0.68fr_1.32fr] lg:gap-18">
            <div className="lg:sticky lg:top-30 lg:self-start">
              <p className="section-kicker text-sun">{messages.itinerary.kicker}</p>
              <h2 className="mt-5 max-w-xl font-display text-[clamp(2.6rem,5vw,5rem)] font-medium leading-[1.02] tracking-[-0.05em]">
                {messages.itinerary.title}
              </h2>
              <p className="mt-7 max-w-lg text-base leading-7 text-paper/62">
                {messages.itinerary.description}
              </p>

              <div className="mt-8 border-l-2 border-sun pl-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sun">
                  {messages.itinerary.profileLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-paper/65">
                  {messages.itinerary.profile}
                </p>
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
                  <p className="font-display text-2xl">{formatDistance(4.3, locale)}</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">
                    {messages.itinerary.travelLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border border-paper/15 bg-cream text-ink shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
              <figure className="relative h-48 overflow-hidden sm:h-60">
                <img
                  src={siteConfig.sampleItineraryImage}
                  alt={messages.itinerary.imageAlt}
                  className="h-full w-full object-cover"
                  width="1280"
                  height="558"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
                <figcaption className="absolute bottom-5 left-6 text-paper sm:bottom-7 sm:left-9">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-paper/65">
                    10.7769° N, 106.7009° E
                  </p>
                  <p className="mt-1 font-display text-2xl sm:text-3xl">
                    {messages.itinerary.imageCaption}
                  </p>
                </figcaption>
              </figure>

              <div className="flex flex-col gap-5 border-b border-forest/15 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-terracotta">
                    {messages.itinerary.optimized}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-medium">
                    {messages.itinerary.routeTitle}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1.5 border border-forest/15 bg-paper px-3 py-2">
                    <Banknote aria-hidden="true" size={14} />
                    {formatCost(450000, locale)}
                  </span>
                  <span className="flex items-center gap-1.5 border border-forest/15 bg-paper px-3 py-2">
                    <Navigation aria-hidden="true" size={14} />
                    {formatDuration(45, language)}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-9">
                <div className="mb-8 flex items-start gap-3 border-l-3 border-sun bg-sun/18 p-4">
                  <Navigation
                    aria-hidden="true"
                    size={20}
                    className="mt-0.5 shrink-0 text-terracotta"
                  />
                  <div>
                    <p className="text-sm font-semibold">{messages.itinerary.trafficTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/60">
                      {messages.itinerary.trafficDescription}
                    </p>
                  </div>
                </div>

                <ol aria-label={messages.accessibility.itinerary}>
                  {sampleItinerary.map((item, index) => {
                    const localizedItem = messages.itinerary.stops[index]
                    return (
                      <li
                        key={item.time}
                        className="border-t border-forest/15 py-7 first:border-t-0 first:pt-0"
                      >
                        <article className="grid gap-5 sm:grid-cols-[5.5rem_1fr] sm:gap-7">
                          <div className="flex items-center gap-3 sm:block">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest text-[0.65rem] font-semibold text-paper">
                              {index + 1}
                            </span>
                            <p className="font-display text-2xl font-medium text-forest sm:mt-3">
                              {item.time}
                            </p>
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
                            <h4 className="mt-2 font-display text-xl font-medium sm:text-2xl">
                              {localizedItem.place}
                            </h4>
                            <p className="mt-2 text-xs leading-5 text-ink/55 sm:text-sm">
                              {localizedItem.description}
                            </p>
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
                          <div className="mt-5 grid gap-3 border-l-2 border-dashed border-forest/25 bg-paper/70 px-4 py-3 sm:ml-[6.35rem] sm:grid-cols-[auto_1fr] sm:items-center">
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
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding bg-cream">
          <div className="container-shell">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="section-kicker">{messages.adaptive.kicker}</p>
                <h2 className="section-title mt-5">
                  {messages.adaptive.title}
                </h2>
              </div>
              <p className="max-w-lg text-base leading-7 text-ink/65 lg:ml-auto">
                {messages.adaptive.description}
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:mt-20 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="route-canvas relative min-h-[31rem] overflow-hidden bg-forest p-7 text-paper sm:p-10">
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sun">
                      {messages.adaptive.mapLabel}
                    </p>
                    <h3 className="mt-2 font-display text-3xl">{messages.adaptive.mapTitle}</h3>
                  </div>
                  <Map aria-hidden="true" size={28} strokeWidth={1.5} className="text-paper/60" />
                </div>
                <svg
                  className="absolute inset-x-[8%] top-[26%] h-[58%] w-[84%]"
                  viewBox="0 0 600 340"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M34 272C88 230 126 240 174 202C222 164 259 188 310 146C361 104 400 130 445 92C490 54 526 73 566 42" stroke="#F4B942" strokeWidth="3" strokeDasharray="7 10" />
                  <circle cx="34" cy="272" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="174" cy="202" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="310" cy="146" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="445" cy="92" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="566" cy="42" r="9" fill="#F4B942" stroke="#F7F2E8" strokeWidth="4" />
                </svg>
                <span className="absolute bottom-[13%] left-[7%] max-w-28 text-xs font-medium">
                  {messages.adaptive.mapPlaces[0]}
                </span>
                <span className="absolute bottom-[31%] left-[25%] max-w-24 text-xs font-medium">
                  {messages.adaptive.mapPlaces[1]}
                </span>
                <span className="absolute left-[47%] top-[46%] max-w-24 text-xs font-medium">
                  {messages.adaptive.mapPlaces[2]}
                </span>
                <span className="absolute right-[19%] top-[31%] max-w-28 text-xs font-medium">
                  {messages.adaptive.mapPlaces[3]}
                </span>
                <span className="absolute right-[3%] top-[18%] max-w-24 text-xs font-medium">
                  {messages.adaptive.mapPlaces[4]}
                </span>
                <div className="absolute bottom-7 right-7 max-w-[17rem] border border-paper/15 bg-paper p-4 text-ink shadow-xl sm:bottom-10 sm:right-10">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <BellRing aria-hidden="true" size={15} className="text-terracotta" />
                    {messages.adaptive.alertTitle}
                  </p>
                  <p className="mt-1.5 text-[0.68rem] leading-5 text-ink/55">
                    {messages.adaptive.alertDescription}
                  </p>
                </div>
              </div>

              <div className="border border-forest/15 bg-paper">
                {messages.adaptive.features.map(({ title, description }, index) => {
                  const Icon = adaptiveFeatureIcons[index]
                  return (
                    <article
                      key={index}
                      className="group grid grid-cols-[auto_1fr] gap-5 border-b border-forest/15 p-6 last:border-b-0 sm:p-8"
                    >
                      <span className="grid size-11 place-items-center border border-forest/15 text-forest transition-colors group-hover:bg-terracotta group-hover:text-paper">
                        <Icon aria-hidden="true" size={19} strokeWidth={1.7} />
                      </span>
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-display text-xl font-medium">{title}</h3>
                          <span className="text-xs text-ink/25">0{index + 1}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink/58">{description}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="kham-pha" className="section-padding scroll-mt-20 bg-paper">
          <div className="container-shell">
            <div className="flex flex-col gap-7 border-b border-forest/15 pb-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-kicker">{messages.explore.kicker}</p>
                <h2 className="section-title mt-5 max-w-3xl">
                  {messages.explore.title}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-ink/60">
                {messages.explore.description}
              </p>
            </div>

            <div className="mt-10 grid auto-rows-[17rem] grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[15rem]">
              {destinations.map((destination, index) => {
                const localizedDestination = messages.explore.destinations[index]
                return (
                  <figure
                    key={destination.image}
                    className={`group relative overflow-hidden bg-forest ring-1 ring-inset ring-paper/25 ${destination.className}`}
                  >
                    <img
                      src={destination.image}
                      alt={localizedDestination.alt}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:brightness-90"
                      width="1280"
                      height="854"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-transparent" />
                    <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-paper sm:p-8">
                      <div>
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-paper/65">
                          {localizedDestination.region}
                        </p>
                        <h3 className="mt-1 font-display text-3xl font-medium sm:text-4xl">
                          {localizedDestination.name}
                        </h3>
                      </div>
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-paper/40 bg-paper/10 backdrop-blur transition-transform group-hover:-rotate-12">
                        <ArrowDownRight aria-hidden="true" size={18} />
                      </span>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-terracotta py-18 text-paper sm:py-24">
          <div className="container-shell grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/65">
                {messages.cta.kicker}
              </p>
              <h2 className="mt-5 max-w-4xl font-display text-[clamp(3rem,6vw,6rem)] font-medium leading-[0.96] tracking-[-0.055em]">
                {messages.cta.title}
              </h2>
            </div>
            <div className="lg:pb-2">
              <p className="max-w-md text-base leading-7 text-paper/72">
                {messages.cta.description}
              </p>
              <a
                href="#top"
                className="mt-7 inline-flex items-center gap-2 border-b border-paper pb-1 text-sm font-semibold"
              >
                {messages.cta.backToTop} <ArrowRight aria-hidden="true" size={16} />
              </a>
            </div>
          </div>
        </section>
    </>
  )
}
