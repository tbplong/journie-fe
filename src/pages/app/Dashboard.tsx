import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion, stagger, useInView, type TargetAndTransition, type Variants } from 'motion/react'
import { ArrowRight, CalendarClock, Compass, MapPin, Navigation, Send, Sparkles } from 'lucide-react'
import { readProfile } from '../../api/profile'
import { useCatalog, useProfile, useTripCover, useTrips } from '../../api/queries'
import { useMoveLink } from '../../app/pageTransition'
import { WeatherIcon } from '../../components/icons'
import { PlaceImage } from '../../components/place/PlaceImage'
import { Tilt } from '../../components/motion/Tilt'
import { EASE_OUT, popItem, riseItem } from '../../components/motion/variants'
import { DiAvatar } from '../../components/mascot/DiAvatar'
import { useDiMoment } from '../../components/mascot/useDiMoment'
import { applyDiAction } from '../../lib/diActions'
import { CityCover } from '../../components/CityCover'
import { CountUp } from '../../components/motion/CountUp'
import { EmptyState, Skeleton } from '../../components/ui/primitives'
import { isRainy, weatherFor } from '../../domain/conditions'
import { useForecasts } from '../../store/weatherStore'
import { cityById, poisByCity } from '../../domain/pois'
import { addDays, fmtSpan, formatDate, todayIso } from '../../domain/time'
import type { Trip } from '../../domain/types'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useLiveStore } from '../../store/liveStore'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { useCityStore } from '../../store/cityStore'
import { HeroScene } from '../../components/weather/HeroScene'
import { tripSpend, tripStopCount } from '../../domain/planner'
import { tripTitle } from '../../domain/tripText'

const MotionLink = motion.create(Link)

const heroGroup: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.09, { startDelay: 0.12 }) } } }
const greetingLine: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.07) } } }
const greetingWord: Variants = { hidden: { y: '112%', rotate: 3 }, show: { y: '0%', rotate: 0, transition: { duration: 0.75, ease: EASE_OUT } } }
const diIn: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.86 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
}
const focusGroup: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.1, { startDelay: 0.15 }) } } }
const focusCard: Variants = {
  hidden: { opacity: 0, x: -36, scale: 0.97 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, ease: EASE_OUT, delayChildren: stagger(0.08, { startDelay: 0.1 }) } },
}
const sideColumn: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.08) } } }
const statsPanel: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT, delayChildren: stagger(0.08, { startDelay: 0.15 }) } },
}
const miniIn: Variants = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE_OUT } },
}
const picksGroup: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.08, { startDelay: 0.1 }) } } }
const picksList: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.08) } } }
const pressable = { scale: 0.97, transition: { duration: 0.12 } }

const PLACEHOLDERS: [string, string][] = [
  ['Hai ngày Sài Gòn, đi chậm thôi…', 'Two days in Saigon, slow pace…'],
  ['Cuối tuần Sài Gòn, cà phê và phố cổ…', 'A Saigon weekend, coffee and old streets…'],
  ['Một ngày Sài Gòn, bảo tàng và phở…', 'One day in Saigon, museums and pho…'],
]

function greeting(hour: number, tr: (vi: string, en: string) => string) {
  if (hour < 11) return tr('Chào buổi sáng', 'Good morning')
  if (hour < 14) return tr('Chào buổi trưa', 'Good afternoon')
  if (hour < 18) return tr('Chào buổi chiều', 'Good afternoon')
  return tr('Chào buổi tối', 'Good evening')
}

const dayDiff = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime()) / 86_400_000)

function WeatherGlyph({ condition }: { condition: ReturnType<typeof weatherFor>['condition'] }) {
  return <WeatherIcon kind={condition} size={26} />
}

function PickFrame({ tilt, children }: { tilt: boolean; children: ReactNode }) {
  return tilt ? <Tilt className="h-60" max={4}>{children}</Tilt> : <div className="h-60">{children}</div>
}

function useMinSm() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)')
    const sync = () => setWide(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return wide
}

export function Dashboard() {
  const { tr, place, language, locale } = useTr()
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const trips = useTrips()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const moment = useDiMoment()
  const { canPointerFx } = useMotionPrefs()
  // Tilt is off in the phone row, where a card scrolls sideways under the finger.
  const wide = useMinSm()
  const lift = canPointerFx ? { y: -5, transition: { duration: 0.25, ease: EASE_OUT } } : undefined
  const [wish, setWish] = useState('')
  const [hint, setHint] = useState(0)
  const picksRef = useRef<HTMLElement>(null)
  // `animate` (not whileInView) so cards that mount after the places load still inherit "show".
  const picksSeen = useInView(picksRef, { once: true, margin: '0px 0px -10% 0px' })

  useEffect(() => {
    const timer = window.setInterval(() => setHint((value) => (value + 1) % PLACEHOLDERS.length), 4200)
    return () => window.clearInterval(timer)
  }, [])

  const live = trips.data?.find((trip) => trip.status === 'live')
  const upcoming = trips.data?.filter((trip) => trip.status === 'upcoming') ?? []
  const done = trips.data?.filter((trip) => trip.status === 'completed') ?? []
  const first = user.name.split(' ').slice(-1)[0]

  const submit = () => {
    if (wish.trim().length > 6) navigate('/app/plan', { state: { wish: wish.trim() } })
    else navigate('/app/plan')
  }

  // `catalog.data` changes when the places finish loading, which re-runs this
  const city = useCityStore((state) => state.city)
  const catalog = useCatalog(city)
  const recommended = useMemo(
    () => poisByCity(city).sort((a, b) => (profile.interests[b.cat] ?? 0.5) * b.quality - (profile.interests[a.cat] ?? 0.5) * a.quality).slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.interests, city, catalog.data],
  )

  const totalStops = (trips.data ?? []).reduce((sum, trip) => sum + tripStopCount(trip), 0)
  const totalKm = (trips.data ?? []).reduce((sum, trip) => sum + trip.days.reduce((s, d) => s + d.stops.reduce((k, stop) => k + stop.travelKm, 0), 0), 0)

  return (
    <div className="space-y-8">
      <motion.section className="panel-night grid gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" aria-labelledby="greeting" variants={heroGroup} initial="hidden" animate="show">
        <HeroScene />
        <div>
          <motion.p variants={riseItem} className="text-sm font-medium text-gold">{formatDate(todayIso(), locale, { weekday: 'long', day: 'numeric', month: 'long' })}</motion.p>
          <motion.h1 id="greeting" variants={greetingLine} className="h-display mt-2 text-[2.3rem] text-paper sm:text-[3.1rem]">
            {`${greeting(new Date().getHours(), tr)}, ${first}.`.split(' ').map((word, index) => (
              <span key={`${word}-${index}`}>
                {index > 0 && ' '}
                <span className="reveal-mask">
                  <motion.span className="inline-block origin-left" variants={greetingWord}>
                    {word}
                  </motion.span>
                </span>
              </span>
            ))}
          </motion.h1>
          <motion.p variants={riseItem} className="mt-3 max-w-lg text-[0.98rem] leading-relaxed text-paper/70">
            {live
              ? tr(`Chuyến “${tripTitle(live, language)}” đang đi.`, `“${tripTitle(live, language)}” is on.`)
              : upcoming.length
                ? tr(`Sắp tới bạn có ${upcoming.length} chuyến.`, `${upcoming.length} trip(s) coming up.`)
                : tr('Đi đâu tiếp nhỉ?', 'Where to next?')}
          </motion.p>

          <motion.form
            variants={riseItem}
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <label htmlFor="quick-wish" className="sr-only">
              {tr('Đi đâu, làm gì?', 'Where to, and what for?')}
            </label>
            <div className="group relative flex items-center rounded-2xl border border-gold/35 bg-night/45 pr-2 transition-[border-color,box-shadow] duration-300 focus-within:border-gold focus-within:shadow-[0_0_0_4px_rgba(246,203,90,0.14)]">
              <Sparkles size={19} className="ml-4 shrink-0 text-gold" aria-hidden="true" />
              <div className="relative min-w-0 flex-1">
                <input
                  id="quick-wish"
                  value={wish}
                  onChange={(event) => setWish(event.target.value)}
                  className="h-14 w-full bg-transparent px-3 text-[1.05rem] text-paper caret-gold outline-none"
                  autoComplete="off"
                />
                {!wish && (
                  <AnimatePresence mode="wait">
                    <motion.span key={hint} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="pointer-events-none absolute inset-y-0 left-3 right-3 flex items-center truncate text-[1.05rem] text-paper/65">
                      {tr(...PLACEHOLDERS[hint])}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
              <button type="submit" className="btn-gold btn-sm shrink-0" aria-label={tr('Lên lịch', 'Plan')}>
                <Send size={16} aria-hidden="true" />
                <span className="hidden sm:inline">{tr('Lên lịch', 'Plan')}</span>
              </button>
            </div>
          </motion.form>
        </div>

        <motion.div variants={diIn} className="relative hidden flex-col items-center justify-end gap-3 lg:flex">
          <AnimatePresence mode="wait">
            <motion.div
              key={moment.line.vi}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="di-bubble w-[min(100%,16rem)] !px-3.5 !py-2.5 !text-[0.86rem] !leading-snug"
              data-tail="bottom"
              role="status"
            >
              {tr(moment.line.vi, moment.line.en)}
              {moment.cta && (
                <button
                  type="button"
                  onClick={() => {
                    applyDiAction(moment.cta!.action)
                    navigate('/app/discover')
                  }}
                  className="mt-2 block border border-terracotta/60 bg-terracotta/10 px-2.5 py-1 font-sans text-[0.74rem] font-semibold not-italic text-[#a8472d] transition-colors hover:bg-terracotta hover:text-white"
                >
                  {tr(moment.cta.vi, moment.cta.en)}
                </button>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="w-[min(100%,10.5rem)]">
            <DiAvatar mood={moment.mood} className="aspect-square w-full" />
          </div>
        </motion.div>
      </motion.section>

      {trips.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : live || upcoming.length ? (
        <motion.section aria-labelledby="focus-trips" className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" variants={focusGroup} initial="hidden" animate="show">
          <h2 id="focus-trips" className="sr-only">
            {tr('Chuyến đi của bạn', 'Your trips')}
          </h2>
          <motion.div className="grid" variants={focusCard} whileHover={lift}>
            {live ? <LiveCard trip={live} /> : <UpcomingCard trip={upcoming[0]} />}
          </motion.div>
          <motion.div className="grid content-start gap-4" variants={sideColumn}>
            <motion.div variants={statsPanel} className="panel grid grid-cols-3 divide-x divide-forest/10 p-4 text-center">
              {[
                { value: trips.data?.length ?? 0, label: tr('Chuyến đi', 'Trips') },
                { value: totalStops, label: tr('Điểm đến', 'Stops') },
                { value: Math.round(totalKm), label: tr('Km di chuyển', 'Km planned') },
              ].map((stat) => (
                <motion.div key={stat.label} variants={popItem} className="px-2">
                  <p className="h-display text-[2rem] text-forest">
                    <CountUp value={stat.value} format={(v) => Math.round(v).toLocaleString(locale)} />
                  </p>
                  <p className="text-[0.72rem] font-medium text-ink/55">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
            {upcoming.slice(live ? 0 : 1, live ? 2 : 3).map((trip) => (
              <MiniTrip key={trip.id} trip={trip} lift={lift} />
            ))}
            {done.length > 0 && (
              <motion.p variants={riseItem} className="px-1 text-sm text-ink/55">
                {tr(`${done.length} chuyến đã hoàn thành.`, `${done.length} completed trip(s).`)}{' '}
                <Link to="/app/trips" className="font-semibold text-lapis hover:underline">
                  {tr('Xem tất cả', 'See all')}
                </Link>
              </motion.p>
            )}
          </motion.div>
        </motion.section>
      ) : (
        <EmptyState
          title={tr('Chưa có chuyến đi nào', 'No trips yet')}
          body={tr('Gõ chỗ bạn muốn đi vào khung phía trên là xong.', 'Type where you want to go in the box above.')}
          action={
            <Link to="/app/plan" className="btn-gold">
              <Sparkles size={17} aria-hidden="true" />
              {tr('Lên chuyến đầu tiên', 'Plan my first trip')}
            </Link>
          }
        />
      )}

      <motion.section ref={picksRef} aria-labelledby="picks" variants={picksGroup} initial="hidden" animate={picksSeen ? 'show' : 'hidden'}>
        <motion.div variants={riseItem} className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="picks" className="h-display text-[1.6rem] text-forest">
              {tr('Có thể bạn thích', 'You might like')}
            </h2>
          </div>
          <Link to="/app/discover" className="hidden items-center gap-1.5 text-sm font-semibold text-lapis hover:underline sm:inline-flex">
            {tr('Khám phá thêm', 'Explore more')} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </motion.div>
        {/* Phone: native scroll-snap row bleeding to the screen edges; sm and up: the grid. */}
        <motion.ul
          variants={picksList}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:p-0 xl:grid-cols-4"
        >
          {recommended.map((poi) => (
            <motion.li key={poi.id} variants={riseItem} whileHover={lift} whileTap={pressable} className="w-[78vw] shrink-0 snap-start sm:w-auto sm:shrink">
              <PickFrame tilt={wide}>
                <button
                  type="button"
                  onClick={() => navigate('/app/plan', { state: { wish: tr(`Một ngày ở ${cityById[poi.city].name}, nhất định phải ghé ${poi.name}.`, `One day in ${cityById[poi.city].nameEn}, I must see ${poi.name}.`) } })}
                  className="group relative block h-60 w-full overflow-hidden rounded-2xl text-left"
                >
                  <PlaceImage poi={poi} />
                  <span className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/30 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-4 bottom-4 text-paper">
                    <span className="h-display block text-2xl leading-tight">{place.name(poi.name)}</span>
                    <span className="mt-1 block text-[0.8rem] leading-snug text-paper/80">{place.blurb(poi)}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold text-night transition-transform duration-300 group-hover:translate-x-1">
                      {tr('Lập lịch trình', 'Plan a trip')} <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </PickFrame>
            </motion.li>
          ))}
        </motion.ul>
        {catalog.data === 0 && (
          <motion.p variants={riseItem} className="text-sm text-ink/60">
            {tr(`Chưa có địa điểm ở ${cityById[city].name}, dữ liệu đang được bổ sung.`, `No places in ${cityById[city].nameEn} yet, the data is on its way.`)}
          </motion.p>
        )}
      </motion.section>
    </div>
  )
}

function LiveCard({ trip }: { trip: Trip }) {
  const { tr, place, language } = useTr()
  const trips = useTrips().data
  const coverPhoto = useTripCover(trip)
  const go = useMoveLink()
  // A proposal raised on the live page waits there; the card says so (UC 3.6)
  const pending = useLiveStore((state) => state.trips[trip.id]?.pending)
  const city = cityById[trip.city]
  // Today's day of the trip, as on the live page, and the first of its stops not over yet
  const stops = trip.days[Math.min(trip.days.length - 1, Math.max(0, -dayDiff(trip.startDate)))]?.stops ?? []
  const clock = new Date()
  const next = stops.find((stop) => stop.end > clock.getHours() * 60 + clock.getMinutes())
  return (
    <CityCover city={trip.city} src={coverPhoto} className="min-h-72 rounded-2xl" overlay="from-night/95 via-night/55 to-night/10">
      <div className="flex h-full min-h-72 flex-col justify-between p-6 text-paper">
        <motion.span variants={popItem} className="inline-flex w-fit items-center gap-2 rounded-full bg-firuze px-3 py-1 text-xs font-bold text-night">
          <span className="pulse-dot size-2 rounded-full bg-night" aria-hidden="true" />
          {tr('Đang diễn ra', 'Live now')}
        </motion.span>
        <motion.div variants={riseItem}>
          <h2 className="h-display text-[2rem]">{tripTitle(trip, language, trips)}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-paper/75">
            <MapPin size={15} aria-hidden="true" /> {language === 'vi' ? city.name : city.nameEn} · {stops.length} {tr('điểm', 'stops')} · {fmtSpan(trip.dayStart, trip.dayEnd, language === 'vi')}
          </p>
          {next && <p className="mt-3 text-sm text-paper/80">{tr('Điểm kế tiếp', 'Up next')}: <strong className="text-gold">{place.nameOf(next.poiId)}</strong></p>}
          {pending && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-sun px-3 py-1 text-xs font-bold text-night" role="status">
              {tr('Có đề xuất đổi lịch đang chờ bạn', 'A plan change is waiting for you')}
            </p>
          )}
          <Link to={`/app/trips/${trip.id}/live`} onClick={go(`/app/trips/${trip.id}/live`, 'forward')} className="btn-gold mt-5">
            <Navigation size={17} aria-hidden="true" />
            {pending ? tr('Xem đề xuất', 'Review the proposal') : tr('Tiếp tục chuyến đi', 'Resume the trip')}
          </Link>
        </motion.div>
      </div>
    </CityCover>
  )
}

function UpcomingCard({ trip }: { trip: Trip }) {
  const { tr, locale, language } = useTr()
  const trips = useTrips().data
  const coverPhoto = useTripCover(trip)
  const go = useMoveLink()
  const city = cityById[trip.city]
  const diff = dayDiff(trip.startDate)
  useForecasts()
  const weather = weatherFor(trip.city, trip.startDate)
  return (
    <CityCover city={trip.city} src={coverPhoto} className="min-h-72 rounded-2xl" overlay="from-night/95 via-night/50 to-night/5">
      <div className="flex h-full min-h-72 flex-col justify-between p-6 text-paper">
        <motion.span variants={popItem} className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f7f2e8]/90 px-3 py-1 text-xs font-bold text-[#0d2822]">
          <CalendarClock size={14} aria-hidden="true" />
          {diff <= 0 ? tr('Hôm nay', 'Today') : tr(`Còn ${diff} ngày`, `In ${diff} day(s)`)}
        </motion.span>
        <motion.div variants={riseItem}>
          <h2 className="h-display text-[2rem]">{tripTitle(trip, language, trips)}</h2>
          <p className="mt-1 text-sm text-paper/75">
            {language === 'vi' ? city.name : city.nameEn} · {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })} – {formatDate(addDays(trip.startDate, trip.days.length - 1), locale, { day: 'numeric', month: 'short' })}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-paper/80">
            {weather.known ? (
              <>
                <WeatherGlyph condition={weather.condition} /> {weather.tempC}°C · {isRainy(weather) ? tr('Có thể mưa', 'Rain possible') : tr('Thời tiết tốt', 'Fair weather')}
              </>
            ) : (
              tr('Chưa có dự báo cho ngày này', 'No forecast for this date yet')
            )}
          </p>
          <Link to={`/app/trips/${trip.id}`} onClick={go(`/app/trips/${trip.id}`, 'forward')} className="btn-gold mt-5">
            <Compass size={17} aria-hidden="true" />
            {tr('Mở lịch trình', 'Open itinerary')}
          </Link>
        </motion.div>
      </div>
    </CityCover>
  )
}

function MiniTrip({ trip, lift }: { trip: Trip; lift?: TargetAndTransition }) {
  const { tr, money, locale, language } = useTr()
  const trips = useTrips().data
  const coverPhoto = useTripCover(trip)
  const go = useMoveLink()
  return (
    <MotionLink to={`/app/trips/${trip.id}`} onClick={go(`/app/trips/${trip.id}`, 'forward')} variants={miniIn} whileHover={lift} whileTap={pressable} className="panel group flex items-center gap-4 p-3.5 transition-[border-color] duration-300 hover:border-gold">
      <CityCover city={trip.city} src={coverPhoto} className="size-16 shrink-0 rounded-xl" overlay="from-night/30 to-transparent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-semibold text-ink" data-vt-name="trip-title">
          {tripTitle(trip, language, trips)}
        </p>
        <p className="mt-0.5 text-xs text-ink/55">
          {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })} · {trip.days.length} {tr('ngày', 'day(s)')} · {money(tripSpend(trip))}
        </p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-ink/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-lapis" aria-hidden="true" />
    </MotionLink>
  )
}
