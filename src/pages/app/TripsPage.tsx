import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ArrowUpRight, CalendarDays, Check, Copy, FilePlus, ListChecks, Navigation, Route, Sparkles, Trash2, X } from 'lucide-react'
import { BlankTripSheet, CloneTripSheet } from '../../components/trip/CreateTripSheets'
import { useDeleteTrips, useTripCover, useTrips } from '../../api/queries'
import { useMoveLink } from '../../app/pageTransition'
import { Sheet } from '../../components/ui/Sheet'
import { toast } from '../../store/toastStore'
import { CityCover } from '../../components/CityCover'
import { PageHeader } from '../../components/PageHeader'
import { EASE_OUT } from '../../components/motion/variants'
import { EmptyState, LoadError, Skeleton } from '../../components/ui/primitives'
import { cityById } from '../../domain/pois'
import { journeyRoute, journeysOf, type Journey } from '../../domain/journey'
import { tripSpend, tripStopCount } from '../../domain/planner'
import { addDays, formatDate } from '../../domain/time'
import type { Trip, TripStatus } from '../../domain/types'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import { tripTitle } from '../../domain/tripText'

type Filter = 'all' | TripStatus

// Only the first eight cards wait their turn, so a long list never keeps the last ones hidden.
const cascade = (i: number) => Math.min(i, 8) * 0.07
const grid: Variants = { hidden: {}, show: { transition: { delayChildren: cascade } } }
const card: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.18, ease: 'easeIn' } },
}

export function TripsPage() {
  const { tr, language } = useTr()
  const trips = useTrips()
  const [filter, setFilter] = useState<Filter>('all')
  const [blank, setBlank] = useState(false)
  const [copying, setCopying] = useState<Trip | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const removeMany = useDeleteTrips()

  const counts = useMemo(() => {
    const data = trips.data ?? []
    const of = (status: TripStatus) => data.filter((t) => t.status === status).length
    return { all: data.length, live: of('live'), upcoming: of('upcoming'), draft: of('draft'), completed: of('completed'), cancelled: of('cancelled') }
  }, [trips.data])

  const visible = (trips.data ?? []).filter((trip) => filter === 'all' || trip.status === filter)
  // A journey's legs show as one card, where its first leg on this tab would be; while picking trips to delete each leg is its own card
  const journeys = journeysOf(trips.data ?? [])
  const cards: ({ kind: 'trip'; trip: Trip } | { kind: 'journey'; journey: Journey })[] = []
  for (const trip of visible) {
    const journey = !selecting && trip.journeyId ? journeys.find((entry) => entry.id === trip.journeyId) : undefined
    if (!journey || journey.legs.length < 2) cards.push({ kind: 'trip', trip })
    else if (!cards.some((card) => card.kind === 'journey' && card.journey.id === journey.id)) cards.push({ kind: 'journey', journey })
  }
  // Only what is on screen counts as chosen, so switching tabs never deletes a trip the user can no longer see.
  const chosen = visible.filter((trip) => selected.includes(trip.id))
  const allChosen = visible.length > 0 && chosen.length === visible.length
  const liveChosen = chosen.filter((trip) => trip.status === 'live').length
  const toggle = (id: string) => setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const stopSelecting = () => {
    setSelecting(false)
    setSelected([])
  }
  const deleteChosen = () =>
    removeMany.mutate(
      chosen.map((trip) => trip.id),
      {
        onSuccess: ({ deleted, failed }) => {
          setConfirming(false)
          if (failed.length === 0) {
            toast('success', tr(`Đã xoá ${deleted} lịch trình`, `Deleted ${deleted} ${deleted === 1 ? 'itinerary' : 'itineraries'}`))
            stopSelecting()
          } else {
            setSelected(failed)
            toast('danger', tr(`Đã xoá ${deleted}, còn ${failed.length} chưa xoá được`, `Deleted ${deleted}; ${failed.length} could not be deleted`), tr('Các lịch trình còn lại vẫn được chọn, thử lại sau nhé.', 'The rest are still selected; try again shortly.'))
          }
        },
      },
    )
  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: tr('Tất cả', 'All') },
    { id: 'live', label: tr('Đang đi', 'Live') },
    { id: 'upcoming', label: tr('Sắp tới', 'Upcoming') },
    { id: 'draft', label: tr('Nháp', 'Drafts') },
    { id: 'completed', label: tr('Đã xong', 'Done') },
    { id: 'cancelled', label: tr('Đã huỷ', 'Cancelled') },
  ]

  return (
    <>
      <PageHeader
        title={tr('Chuyến đi của tôi', 'My trips')}
        actions={
          <>
            {counts.all > 0 && (
              <button type="button" className="btn-ghost btn-sm" aria-pressed={selecting} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
                {selecting ? <X size={15} aria-hidden="true" /> : <ListChecks size={15} aria-hidden="true" />} {selecting ? tr('Thôi chọn', 'Done') : tr('Chọn nhiều', 'Select')}
              </button>
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setBlank(true)}>
              <FilePlus size={15} aria-hidden="true" /> {tr('Chuyến trống', 'Blank trip')}
            </button>
            <Link to="/app/plan" className="btn-gold btn-sm">
              <Sparkles size={15} aria-hidden="true" /> {tr('Chuyến mới', 'New trip')}
            </Link>
          </>
        }
      />

      <motion.div
        role="tablist"
        aria-label={tr('Lọc chuyến đi', 'Filter trips')}
        className="mb-6 inline-flex max-w-full overflow-x-auto rounded-xl bg-forest/6 p-1"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.2, ease: EASE_OUT } }}
      >
        {tabs.map((tab) => (
          <motion.button key={tab.id} role="tab" aria-selected={filter === tab.id} onClick={() => setFilter(tab.id)} whileTap={{ scale: 0.95 }} transition={{ duration: 0.12 }} className={`relative rounded-lg px-4 py-2 text-[0.82rem] font-semibold transition-colors ${filter === tab.id ? 'text-paper' : 'text-ink/65 hover:text-ink'}`}>
            {filter === tab.id && <motion.span layoutId="trips-tab" className="absolute inset-0 rounded-lg bg-lapis" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">
              {tab.label} <span className="tabular opacity-60">{counts[tab.id]}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>

      {selecting && (
        // The sticky wrapper is separate because `.panel` sets position: relative, which beats the `sticky` utility
        <div className="sticky top-[4.5rem] z-20 mb-5">
          <div className="panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" role="region" aria-label={tr('Chọn lịch trình', 'Select itineraries')}>
            <p className="text-sm font-semibold text-ink" aria-live="polite">
              {tr(`Đã chọn ${chosen.length}/${visible.length}`, `${chosen.length} of ${visible.length} selected`)}
            </p>
            <button type="button" className="text-[0.82rem] font-semibold text-lapis hover:underline disabled:opacity-40" disabled={visible.length === 0} onClick={() => setSelected(allChosen ? [] : visible.map((trip) => trip.id))}>
              {allChosen ? tr('Bỏ chọn tất cả', 'Clear all') : tr('Chọn tất cả trong mục này', 'Select all in this tab')}
            </button>
            <button type="button" className="btn-night btn-sm ml-auto !bg-pomegranate disabled:opacity-40" disabled={chosen.length === 0} onClick={() => setConfirming(true)}>
              <Trash2 size={15} aria-hidden="true" /> {tr(`Xoá ${chosen.length}`, `Delete ${chosen.length}`)}
            </button>
          </div>
        </div>
      )}

      {trips.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : trips.isError ? (
        <LoadError onRetry={() => trips.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          key={filter}
          title={filter === 'all' ? tr('Chưa có chuyến đi nào', 'No trips yet') : tr('Không có chuyến nào ở mục này', 'Nothing in this tab')}
          body={tr('Tạo chuyến đầu tiên thôi.', 'Make your first one.')}
          action={
            <Link to="/app/plan" className="btn-gold">
              <Sparkles size={17} aria-hidden="true" /> {tr('Lên chuyến đầu tiên', 'Plan my first trip')}
            </Link>
          }
        />
      ) : (
        <motion.ul className="relative grid gap-5 md:grid-cols-2 xl:grid-cols-3" variants={grid} initial="hidden" animate="show">
          <AnimatePresence mode="popLayout">
            {cards.map((entry) => (
              <motion.li key={entry.kind === 'trip' ? entry.trip.id : entry.journey.id} layout variants={card} exit="exit" transition={{ layout: { type: 'spring', stiffness: 380, damping: 34 } }}>
                {entry.kind === 'trip' ? (
                  <TripCard trip={entry.trip} onCopy={() => setCopying(entry.trip)} selecting={selecting} selected={selected.includes(entry.trip.id)} onToggle={() => toggle(entry.trip.id)} siblings={trips.data} />
                ) : (
                  <JourneyCard journey={entry.journey} />
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
      <BlankTripSheet open={blank} onClose={() => setBlank(false)} />
      <CloneTripSheet open={!!copying} onClose={() => setCopying(null)} source={copying ?? undefined} />
      <Sheet
        open={confirming}
        onClose={() => !removeMany.isPending && setConfirming(false)}
        placement="center"
        width="max-w-md"
        title={tr(`Xoá ${chosen.length} lịch trình?`, `Delete ${chosen.length} ${chosen.length === 1 ? 'itinerary' : 'itineraries'}?`)}
        description={tr('Xoá rồi là không lấy lại được.', 'You cannot get them back once deleted.')}
        footer={
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-ghost btn-sm" disabled={removeMany.isPending} onClick={() => setConfirming(false)}>
              {tr('Giữ lại', 'Keep them')}
            </button>
            <button type="button" className="btn-night btn-sm !bg-pomegranate" disabled={removeMany.isPending || chosen.length === 0} onClick={deleteChosen}>
              <Trash2 size={15} aria-hidden="true" /> {removeMany.isPending ? tr('Đang xoá…', 'Deleting…') : tr(`Xoá ${chosen.length}`, `Delete ${chosen.length}`)}
            </button>
          </div>
        }
      >
        <ul className="max-h-56 space-y-1 overflow-y-auto text-sm text-ink/80">
          {chosen.map((trip) => (
            <li key={trip.id} className="truncate">
              · {tripTitle(trip, language, trips.data)}
            </li>
          ))}
        </ul>
        {liveChosen > 0 && (
          <p className="mt-3 text-sm font-semibold text-pomegranate">
            {tr(`Trong đó có ${liveChosen} chuyến đang đi.`, `${liveChosen} of them ${liveChosen === 1 ? 'is' : 'are'} in progress.`)}
          </p>
        )}
      </Sheet>
    </>
  )
}

type CardProps = { trip: Trip; onCopy: () => void; selecting: boolean; selected: boolean; onToggle: () => void; siblings?: Trip[] }

function TripCard({ trip, onCopy, selecting, selected, onToggle, siblings }: CardProps) {
  const { tr, money, locale, language } = useTr()
  const coverPhoto = useTripCover(trip)
  const go = useMoveLink()
  const { canPointerFx } = useMotionPrefs()
  const city = cityById[trip.city]
  const status = {
    live: { label: tr('Đang đi', 'Live'), cls: 'bg-firuze text-night' },
    upcoming: { label: tr('Sắp tới', 'Upcoming'), cls: 'bg-[#f7f2e8]/95 text-[#0d2822]' },
    completed: { label: tr('Đã xong', 'Done'), cls: 'bg-night/70 text-paper' },
    draft: { label: tr('Nháp', 'Draft'), cls: 'bg-sun text-night' },
    cancelled: { label: tr('Đã huỷ', 'Cancelled'), cls: 'bg-pomegranate text-white' },
  }[trip.status]

  const title = tripTitle(trip, language, siblings)
  const coverBody = (
    <>
      <span className={`absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${status.cls}`}>
        {trip.status === 'live' && <span className="pulse-dot size-1.5 rounded-full bg-night" aria-hidden="true" />}
        {status.label}
      </span>
      {!selecting && <ArrowUpRight size={20} className="absolute right-3.5 top-3.5 text-paper/80 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />}
      <span className="absolute inset-x-4 bottom-3 text-paper">
        <span className="h-display block text-[1.35rem] leading-tight" data-vt-name="trip-title">
          {title}
        </span>
        <span className="text-xs text-paper/75">{language === 'vi' ? city.name : city.nameEn}</span>
      </span>
    </>
  )
  const cover = (
    <CityCover city={trip.city} src={coverPhoto} className="h-44" overlay="from-night/95 via-night/45 to-night/5">
      {selecting && (
        <span className={`absolute right-3.5 top-3.5 z-10 grid size-7 place-items-center rounded-md border-2 ${selected ? 'border-paper bg-pomegranate text-white' : 'border-paper/85 bg-night/35 text-transparent'}`} aria-hidden="true">
          <Check size={16} strokeWidth={3} />
        </span>
      )}
      {coverBody}
    </CityCover>
  )

  return (
    <motion.article
      className={`panel group overflow-hidden transition-shadow duration-500 hover:shadow-[0_28px_44px_-26px_rgba(19,26,77,0.7)] ${selecting && selected ? 'ring-2 ring-pomegranate ring-offset-2 ring-offset-paper' : ''}`}
      whileHover={canPointerFx && !selecting ? { y: -6 } : undefined}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {selecting ? (
        <button type="button" role="checkbox" aria-checked={selected} onClick={onToggle} className="block w-full text-left" aria-label={tr(`Chọn ${title}`, `Select ${title}`)}>
          {cover}
        </button>
      ) : (
        <Link to={`/app/trips/${trip.id}`} onClick={go(`/app/trips/${trip.id}`, 'forward')} className="block" aria-label={title}>
          {cover}
        </Link>
      )}
      <div className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-[0.8rem] text-ink/65">
          <CalendarDays size={15} className="text-lapis" aria-hidden="true" />
          {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}
          {trip.days.length > 1 && ` – ${formatDate(addDays(trip.startDate, trip.days.length - 1), locale, { day: 'numeric', month: 'short' })}`}
        </p>
        <div className="flex items-center justify-between text-xs text-ink/60">
          <span className="tabular">
            {tripStopCount(trip)} {tr('điểm', 'stops')} · {money(tripSpend(trip))}
          </span>
          <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 font-semibold text-lapis hover:underline" aria-label={tr(`Nhân bản ${title}`, `Copy ${title}`)}>
            <Copy size={13} aria-hidden="true" /> {tr('Nhân bản', 'Duplicate')}
          </button>
        </div>
        {trip.status === 'live' && (
          <Link to={`/app/trips/${trip.id}/live`} onClick={go(`/app/trips/${trip.id}/live`, 'forward')} className="btn-gold btn-sm w-full">
            <Navigation size={15} aria-hidden="true" /> {tr('Tiếp tục chuyến đi', 'Resume trip')}
          </Link>
        )}
      </div>
    </motion.article>
  )
}

/** The legs of a journey (`domain/journey.ts`) as one card: the cities in order, the whole span of dates, and the way into its page. */
function JourneyCard({ journey }: { journey: Journey }) {
  const { tr, money, locale, language } = useTr()
  const { legs } = journey
  const first = legs[0]
  const last = legs[legs.length - 1]
  const coverPhoto = useTripCover(first)
  const go = useMoveLink()
  const { canPointerFx } = useMotionPrefs()
  const to = `/app/journeys/${journey.id}`
  const status = legs.some((leg) => leg.status === 'live')
    ? { label: tr('Đang đi', 'Live'), cls: 'bg-firuze text-night' }
    : legs.some((leg) => leg.status === 'draft')
      ? { label: tr('Nháp', 'Draft'), cls: 'bg-sun text-night' }
      : legs.every((leg) => leg.status === 'completed')
        ? { label: tr('Đã xong', 'Done'), cls: 'bg-night/70 text-paper' }
        : { label: tr('Sắp tới', 'Upcoming'), cls: 'bg-[#f7f2e8]/95 text-[#0d2822]' }
  const days = legs.reduce((sum, leg) => sum + leg.days.length, 0)
  return (
    <motion.article
      className="panel group overflow-hidden transition-shadow duration-500 hover:shadow-[0_28px_44px_-26px_rgba(19,26,77,0.7)]"
      whileHover={canPointerFx ? { y: -6 } : undefined}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      <Link to={to} onClick={go(to, 'forward')} className="block" aria-label={journeyRoute(legs, language)}>
        <CityCover city={first.city} src={coverPhoto} className="h-44" overlay="from-night/95 via-night/45 to-night/5">
          <span className={`absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${status.cls}`}>{status.label}</span>
          <span className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-full bg-night/55 px-2.5 py-1 text-[0.7rem] font-bold text-paper">
            <Route size={12} aria-hidden="true" /> {tr(`Hành trình · ${legs.length} chặng`, `Journey · ${legs.length} legs`)}
          </span>
          <span className="absolute inset-x-4 bottom-3 text-paper">
            <span className="h-display block text-[1.35rem] leading-tight">{journeyRoute(legs, language)}</span>
            <span className="text-xs text-paper/75">{legs.map((leg) => `${language === 'vi' ? cityById[leg.city].name : cityById[leg.city].nameEn} ${leg.days.length}`).join(' · ')} {tr('ngày', 'days')}</span>
          </span>
        </CityCover>
      </Link>
      <div className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-[0.8rem] text-ink/65">
          <CalendarDays size={15} className="text-lapis" aria-hidden="true" />
          {formatDate(first.startDate, locale, { day: 'numeric', month: 'short' })} – {formatDate(addDays(last.startDate, last.days.length - 1), locale, { day: 'numeric', month: 'short' })}
        </p>
        <div className="flex items-center justify-between text-xs text-ink/60">
          <span className="tabular">
            {days} {tr('ngày', 'days')} · {legs.reduce((sum, leg) => sum + tripStopCount(leg), 0)} {tr('điểm', 'stops')} · {money(legs.reduce((sum, leg) => sum + tripSpend(leg), 0))}
          </span>
        </div>
      </div>
    </motion.article>
  )
}
