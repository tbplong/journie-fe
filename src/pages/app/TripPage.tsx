import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion, stagger, type Variants } from 'motion/react'
import { ArrowRight, Ban, Route as RouteIcon, CalendarClock, Check, Copy, Loader2, MapPin, Minus, Navigation, Pencil, Plus, RotateCcw, Save, Search, Share2, Sparkles, Trash2, Undo2, Wand2, X } from 'lucide-react'
import { CloneTripSheet } from '../../components/trip/CreateTripSheets'
import { CancelTripSheet, ShareSheet } from '../../components/trip/TripLifecycle'
import { apiErrorText, dayWindowText, isNotFound } from '../../api/errorText'
import { routeDraft, routeSchedule } from '../../api/routing'
import { readProfile } from '../../api/profile'
import { searchPois } from '../../api/places'
import { track } from '../../api/analytics'
import { useCatalog, useDeleteTrip, useModuleEnabled, useProfile, useSaveTrip, useTrip, useTrips } from '../../api/queries'
import { useMoveLink } from '../../app/pageTransition'
import { RouteMap } from '../../components/map/RouteMap'
import { Stagger } from '../../components/motion/Stagger'
import { EASE_OUT, popItem, riseItem, slideItem } from '../../components/motion/variants'
import { PoiSheet } from '../../components/place/PoiSheet'
import { DayTabs, OpeningHours, TripStats } from '../../components/trip/parts'
import { Timeline } from '../../components/trip/Timeline'
import { CategoryGlyph, EmptyState, LoadError, Segmented, Skeleton } from '../../components/ui/primitives'
import { WholeTrip } from '../../components/trip/WholeTrip'
import { journeyRoute, journeysOf } from '../../domain/journey'
import { Sheet } from '../../components/ui/Sheet'
import { PageHeader } from '../../components/PageHeader'
import { addStop, changeDuration, diffDay, removeStop, reorderDay, shiftNote, toggleLock, usedPoiIds } from '../../domain/edit'
import { isDayTimed, isScheduled, stopsCap } from '../../domain/planner'
import { cityById, poiById } from '../../domain/pois'
import { isAvoided } from '../../domain/tags'
import { violationText } from '../../domain/violation'
import { MAX_CAFES, MAX_NIGHTLIFE, MAX_STOPS, PACE_LIMITS, isMuseum, retimeDay, tripCost, visitSlot } from '../../domain/solver'
import { addDays, dayEndAfter, daysBetween, dayWindowProblem, fmtMinutes, fmtSpan, fmtTime, formatDate, hm, nextDayTag, weekdayOf } from '../../domain/time'
import { MAX_TRIP_DAYS } from '../../domain/nlp'
import { adjustItinerary, saigonToday } from '../../api/planner'
import type { Stop, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'
import { tripTitle } from '../../domain/tripText'

// Only the first eight items wait their turn, so long lists never keep the last ones hidden.
const cascade = (gap: number, start = 0) => (i: number) => start + Math.min(i, 8) * gap
const sideColumn: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.09, { startDelay: 0.05 }) } } }
const chipRow: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.05, { startDelay: 0.35 }) } } }
const listGroup = (gap: number, start = 0): Variants => ({ hidden: {}, show: { transition: { delayChildren: cascade(gap, start) } } })
const sheetList = listGroup(0.05, 0.12)
/** Day content slides in from the side of the tab that was picked and leaves toward the other. */
const dayPane: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 44 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -32, transition: { duration: 0.18, ease: 'easeIn' } }),
}
const noteIn = { initial: { opacity: 0, x: -18 }, animate: { opacity: 1, x: 0, transition: { duration: 0.5, delay: 0.12, ease: EASE_OUT } }, exit: { opacity: 0, x: -10, transition: { duration: 0.15 } } }
const tap = { scale: 0.96 }

const ADJUST_IDEAS: [string, string][] = [
  ['Bớt đi bộ, ưu tiên xe máy', 'Less walking, prefer a motorbike'],
  ['Thêm quán cà phê', 'Add a café'],
  ['Không ăn hải sản', 'No seafood'],
  ['Ưu tiên văn hóa và bảo tàng', 'More culture and museums'],
]

/** A trip's content without its version: a save hands back a new object with the version bumped, but the trip is the same. */
const contentOf = ({ version: _version, ...rest }: Trip) => JSON.stringify(rest)
/**
 * What a "Suggest again" answer changes for the traveler: the places each day holds, the ones that did not fit, and whether the day loads
 * are known (an edit clears them). The loads themselves shift a little with the order the places are sent in, so they are not compared.
 */
const splitOf = (trip: Trip) => JSON.stringify([trip.days.map((day) => day.stops.map((stop) => stop.poiId).sort()), trip.routing?.unscheduled, Boolean(trip.routing?.load)])
/** Whether a backend schedule changed an order or a stay the traveler had: `/routing` takes neither, so it picks its own. */
const resetsEdits = (before: Trip, after: Trip) =>
  after.days.some((day) => {
    const old = before.days[day.index]?.stops ?? []
    return day.stops.some((stop, i) => stop.poiId !== old[i]?.poiId || stop.visit !== old[i].visit)
  })

export function TripPage() {
  const { id } = useParams()
  const { tr, place, language, locale } = useTr()
  const vi = language === 'vi'
  const navigate = useNavigate()
  const go = useMoveLink()
  const user = useAuthStore((state) => state.user)!
  const tripQuery = useTrip(id)
  const save = useSaveTrip()
  const remove = useDeleteTrip()
  const mine = useTrips().data
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const { activeDay, setActiveDay, activeUid, setActiveUid, openPoi } = useUiStore()

  const [undo, setUndo] = useState<Trip[]>([])
  const [addOpen, setAddOpen] = useState(false)
  // Day by day (tabs) or the whole trip on one page, read top to bottom
  const [whole, setWhole] = useState(false)
  const [proposal, setProposal] = useState<(Trip & { extraNote?: string[] }) | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [adjustText, setAdjustText] = useState('')
  const [perDay, setPerDay] = useState<number | null>(null)
  // The day's hours as the time inputs hold them ('HH:MM'); null until the traveler changes one
  const [hours, setHours] = useState<{ start: string; end: string } | null>(null)
  // The first and last day as the date inputs hold them (YYYY-MM-DD); null until the traveler changes one
  const [dates, setDates] = useState<{ start: string; end: string } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'share' | 'copy' | 'cancel' | null>(null)
  // After the traveler turns a proposal down: offer to edit by hand or to change the request (UC 2.22)
  const [rejected, setRejected] = useState(false)
  const adjustRef = useRef<HTMLTextAreaElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const sharing = useModuleEnabled('sharing')

  useEffect(() => setActiveDay(0), [id, setActiveDay])

  const trip = tripQuery.data
  const dayIndex = Math.min(activeDay, Math.max(0, (trip?.days.length ?? 1) - 1))
  const day = trip?.days[dayIndex]
  // Which way the day content slides: from the right for a later day, from the left for an earlier one.
  const [dayShift, setDayShift] = useState({ from: dayIndex, dir: 0 })
  if (dayShift.from !== dayIndex) setDayShift({ from: dayIndex, dir: dayIndex > dayShift.from ? 1 : -1 })

  const adjust = useMutation({
    mutationFn: ({ text, ...options }: { text: string; stopsPerDay?: number; dayStart?: number; dayEnd?: number; startDate?: string; days?: number }) => adjustItinerary(trip!, text, profile, options),
    onSuccess: (next) => setProposal(next),
    onError: (error) => toast('danger', tr('Chưa sửa được', 'Could not change it'), tr(...apiErrorText(error))),
  })
  // Backend planner: "Suggest again" re-splits the draft over the days; "Create schedule" (and "Schedule again" later) times it with road
  // travel. When it fails the trip stays as it is: the draft order was never solved, so it is not passed off as a schedule.
  const redraft = useMutation({
    mutationFn: () => routeDraft(trip!),
    onError: (error) => toast('danger', tr('Chưa gợi ý lại được', 'Could not suggest again'), tr(...apiErrorText(error))),
  })
  const schedule = useMutation({
    mutationFn: () => routeSchedule(trip!),
    onError: (error) => toast('danger', tr('Chưa xếp được lịch', 'Could not schedule'), tr(...apiErrorText(error))),
  })
  // A routing answer takes up to 20 s; if the trip was edited meanwhile, the answer describes an older trip and is dropped
  const latest = useRef(trip)
  useEffect(() => {
    latest.current = trip
  }, [trip])
  const stillCurrent = (sent: Trip) => {
    if (latest.current && contentOf(latest.current) === contentOf(sent)) return true
    toast('info', tr('Chuyến đã đổi trong lúc chờ', 'The trip changed while waiting'), tr('Bấm lại để xếp theo bản mới nhất.', 'Tap again to plan the latest version.'))
    return false
  }

  const scheduled = !trip || isScheduled(trip)
  // The stops-per-day stepper starts at what the trip allows now; only a different value counts as an edit
  const currentPerDay = trip ? stopsCap(trip) : MAX_STOPS.balanced
  const shownPerDay = perDay ?? currentPerDay
  const perDayChanged = shownPerDay !== currentPerDay
  // The hours row starts at the trip's own day; only hours that differ from it count as an edit
  const shownHours = hours ?? { start: trip ? fmtTime(trip.dayStart) : '08:00', end: trip ? fmtTime(trip.dayEnd) : '21:00' }
  // An end at or before the start is the next morning (a 09:00–03:00 day ends at 1620)
  const shownEnd = dayEndAfter(hm(shownHours.start), hm(shownHours.end))
  const startChanged = !!trip && hm(shownHours.start) !== trip.dayStart
  const endChanged = !!trip && shownEnd !== trip.dayEnd
  // The dates row starts at the trip's own; a new first day keeps the length, so the last day moves with it
  const shownDates = dates ?? { start: trip?.startDate ?? saigonToday(), end: trip ? addDays(trip.startDate, trip.days.length - 1) : saigonToday() }
  const shownDays = Math.min(MAX_TRIP_DAYS, Math.max(1, daysBetween(shownDates.start, shownDates.end) + 1))
  const startDateChanged = !!trip && shownDates.start !== trip.startDate
  const daysChanged = !!trip && shownDays !== trip.days.length
  const hoursProblem = dayWindowProblem(hm(shownHours.start), shownEnd, shownDays)
  const dayTimed = !!trip && isDayTimed(trip, dayIndex)
  const live = useMemo(
    // A day the backend timed was checked there; re-timing it with the device's slower travel estimate would flag false conflicts
    () => (trip && day && scheduled && !dayTimed ? retimeDay(day.stops, { city: trip.city, dayStart: trip.dayStart, dayEnd: trip.dayEnd, transport: trip.transport, date: addDays(trip.startDate, dayIndex), legsFrom: day.stops }) : null),
    [trip, day, dayIndex, dayTimed, scheduled],
  )

  if (tripQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-[34rem]" />
        </div>
      </div>
    )
  }

  if (!trip && tripQuery.isError && !isNotFound(tripQuery.error)) return <LoadError onRetry={() => tripQuery.refetch()} />
  if (!trip || !day) {
    return (
      <EmptyState
        title={tr('Không tìm thấy lịch trình', 'Itinerary not found')}
        body={tr('Có thể đã bị xoá rồi.', 'It may have been deleted.')}
        action={
          <Link to="/app/trips" className="btn-gold">
            {tr('Về danh sách chuyến đi', 'Back to my trips')}
          </Link>
        }
      />
    )
  }

  const commit = (next: Trip, kind: string) => {
    setUndo((stack) => [...stack.slice(-9), trip])
    save.mutate(next)
    track({ type: 'trip_edited', city: trip.city, detail: kind })
  }

  /** Validate-then-apply, exactly the manual editing flow in the report. */
  const apply = (result: ReturnType<typeof reorderDay>, kind: string): boolean => {
    if (!result.ok) {
      // Every rule the edit breaks, not only the first, so one fix is enough
      toast('warning', tr('Không sửa được, mình trả lại như cũ rồi', 'Could not change it, back to how it was'), [...new Set(result.violations.map((violation) => violationText(violation, vi)))].join(' · '))
      return false
    }
    commit(result.trip, kind)
    return true
  }

  const runRedraft = () =>
    redraft.mutate(undefined, {
      onSuccess: (next) => {
        if (!stillCurrent(trip)) return
        // The backend answers the same request the same way, so there is no new version to save or step to undo
        if (splitOf(next) === splitOf(trip)) return toast('info', tr('Cách chia này đã là tốt nhất', 'This split is already the best'), tr('Khoá, thêm hoặc xoá một nơi rồi bấm lại để có cách chia khác.', 'Lock, add or remove a place, then try again for another split.'))
        commit(next, 'redraft')
      },
    })

  const runSchedule = () =>
    schedule.mutate(undefined, {
      onSuccess: (next) => {
        if (!stillCurrent(trip)) return
        const missing = next.routing?.unscheduled ?? []
        if (!missing.length) {
          commit(next, scheduled ? 'reschedule' : 'schedule')
          if (scheduled && resetsEdits(trip, next)) toast('info', tr('Máy chủ đã xếp lại thứ tự và thời lượng', 'The server reset the order and stays'), tr('Máy chủ chưa nhận thứ tự hay thời lượng bạn chỉnh tay. Bấm “Hoàn tác” để lấy lại bản của bạn.', 'The server does not take an order or stays set by hand yet. Tap “Undo” to get yours back.'))
          return
        }
        if (scheduled) return toast('warning', tr('Máy chủ chưa xếp vừa', 'The server could not fit everything'), `${missing.map((u) => place.name(u.name)).join(', ')}. ${tr('Giờ hiện tại giữ nguyên; xoá bớt một nơi ở ngày đó rồi bấm lại nhé.', 'The current times stay; remove a place from that day and try again.')}`)
        commit(next, 'schedule-blocked')
        toast('warning', tr('Còn nơi chưa xếp được', 'Some places do not fit'), tr('Xem ghi chú “Chưa xếp được” để biết cách sửa.', 'See “Not scheduled” for how to fix it.'))
      },
    })

  const undoLast = () => {
    const previous = undo[undo.length - 1]
    if (!previous) return
    setUndo((stack) => stack.slice(0, -1))
    // The old content goes back on top of the version saved now, so the backend does not take the undo for a stale copy (409)
    save.mutate({ ...previous, version: trip.version })
    toast('info', tr('Đã hoàn tác', 'Undone'))
  }

  const move = (uid: string, direction: -1 | 1) => {
    const order = [...day.stops]
    const index = order.findIndex((stop) => stop.uid === uid)
    const target = index + direction
    if (target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    apply(reorderDay(trip, dayIndex, order), 'reorder')
  }

  const startTrip = () => {
    save.mutate({ ...trip, status: 'live' })
    track({ type: 'trip_started', city: trip.city })
    navigate(`/app/trips/${trip.id}/live`)
  }

  const saveDraft = () => {
    save.mutate({ ...trip, status: 'upcoming' }, { onSuccess: () => toast('success', tr('Đã lưu lịch trình', 'Itinerary saved'), tr('Bạn xem lại trong “Chuyến đi của tôi”.', 'Find it under “My trips”.')) })
  }

  const discardDraft = () =>
    remove.mutate(trip.id, {
      onSuccess: () => {
        toast('info', tr('Đã bỏ bản nháp', 'Draft discarded'))
        navigate('/app/plan', { replace: true })
      },
    })

  const restart = () => {
    save.mutate({ ...trip, status: 'upcoming', cancelledAt: undefined, cancelReason: undefined })
    toast('success', tr('Chuyến đã mở lại', 'The trip is back on'), tr('Bấm “Bắt đầu chuyến đi” khi bạn sẵn sàng.', 'Tap “Start trip” when you are ready.'))
  }

  const renameBlur = (value: string) => {
    const name = value.trim()
    if (name && name !== tripTitle(trip, language, mine)) commit({ ...trip, title: name, autoTitle: false }, 'rename')
  }

  const city = cityById[trip.city]
  const endDate = addDays(trip.startDate, trip.days.length - 1)

  return (
    <>
      <PageHeader
        kicker={
          <>
            <MapPin size={14} aria-hidden="true" /> {vi ? city.name : city.nameEn} · {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}
            {trip.days.length > 1 && ` – ${formatDate(endDate, locale, { day: 'numeric', month: 'short' })}`}
          </>
        }
        title={tripTitle(trip, language, mine)}
        titleName="trip-title"
        titleNode={<EditableTitle value={tripTitle(trip, language, mine)} onSave={renameBlur} label={tr('Đổi tên lịch trình', 'Rename itinerary')} />}
        actions={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={undoLast} disabled={!undo.length} aria-label={tr('Hoàn tác', 'Undo')}>
              <Undo2 size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{tr('Hoàn tác', 'Undo')}</span>
            </button>
            <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={() => setConfirmDelete(true)} aria-label={tr('Xóa lịch trình', 'Delete itinerary')}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setDialog('copy')} aria-label={tr('Nhân bản lịch trình', 'Duplicate itinerary')} title={tr('Nhân bản', 'Duplicate')}>
              <Copy size={15} aria-hidden="true" />
            </button>
            {sharing && trip.status !== 'draft' && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setDialog('share')}>
                <Share2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">{tr('Chia sẻ', 'Share')}</span>
              </button>
            )}
            {trip.status === 'live' && (
              <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={() => setDialog('cancel')}>
                <Ban size={15} aria-hidden="true" /> {tr('Huỷ chuyến', 'Cancel trip')}
              </button>
            )}
            {trip.status === 'draft' ? (
              <button type="button" className="btn-gold btn-sm" onClick={saveDraft} disabled={save.isPending}>
                <Save size={15} aria-hidden="true" /> {tr('Lưu lịch trình', 'Save itinerary')}
              </button>
            ) : trip.status === 'cancelled' ? (
              <button type="button" className="btn-gold btn-sm" onClick={restart}>
                <RotateCcw size={15} aria-hidden="true" /> {tr('Mở lại chuyến', 'Restart trip')}
              </button>
            ) : trip.status === 'live' ? (
              <Link to={`/app/trips/${trip.id}/live`} onClick={go(`/app/trips/${trip.id}/live`, 'forward')} className="btn-gold btn-sm">
                <Navigation size={15} aria-hidden="true" /> {tr('Mở chế độ đang đi', 'Open live mode')}
              </Link>
            ) : trip.status !== 'completed' && scheduled && trip.days.some((d) => d.stops.length) ? (
              <button type="button" className="btn-gold btn-sm" onClick={startTrip}>
                <Navigation size={15} aria-hidden="true" /> {tr('Bắt đầu chuyến đi', 'Start trip')}
              </button>
            ) : null}
          </>
        }
      />
      {trip.status === 'draft' && (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-3 border border-sun/60 bg-sun/12 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-ink/80">
            <strong>{tr('Bản nháp chưa lưu.', 'Unsaved draft.')}</strong> {tr('Xem lại rồi bấm “Lưu lịch trình”, hoặc bỏ nếu chưa ưng.', 'Look it over, then tap “Save itinerary”, or discard it.')}
          </p>
          <button type="button" className="btn-ghost btn-sm" onClick={discardDraft} disabled={remove.isPending}>
            <X size={15} aria-hidden="true" /> {tr('Bỏ bản nháp', 'Discard')}
          </button>
          <button type="button" className="btn-gold btn-sm" onClick={saveDraft} disabled={save.isPending}>
            <Save size={15} aria-hidden="true" /> {tr('Lưu lịch trình', 'Save itinerary')}
          </button>
        </div>
      )}
      {trip.status === 'cancelled' && (
        <div role="status" className="mb-5 border border-pomegranate/40 bg-pomegranate/6 px-4 py-3 text-sm text-ink/80">
          <strong className="text-pomegranate">{tr('Chuyến này đã huỷ', 'This trip was cancelled')}</strong>
          {trip.cancelledAt && ` · ${formatDate(trip.cancelledAt.slice(0, 10), locale, { day: 'numeric', month: 'short' })}`}
          {trip.cancelReason && ` · ${tr('lý do', 'reason')}: ${{ weather: tr('thời tiết', 'weather'), health: tr('sức khoẻ', 'health'), plans: tr('đổi kế hoạch', 'plans changed'), other: tr('khác', 'other') }[trip.cancelReason] ?? trip.cancelReason}`}
        </div>
      )}
      {trip.journeyId && <JourneyNote trip={trip} trips={mine} />}
      <Stagger className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]" gap={0.1} delay={0.12}>
        <motion.section ref={timelineRef} tabIndex={-1} variants={riseItem} className="panel p-4 outline-none sm:p-5" aria-label={tr('Lịch trình theo ngày', 'Day by day itinerary')}>
          <div className="mb-3 flex justify-end">
            <Segmented
              label={tr('Cách xem lịch trình', 'How to view the itinerary')}
              value={whole ? 'whole' : 'day'}
              onChange={(value) => setWhole(value === 'whole')}
              options={[
                { value: 'day', label: tr('Từng ngày', 'Day by day') },
                { value: 'whole', label: tr('Cả chuyến', 'Whole trip') },
              ]}
            />
          </div>
          {whole ? (
            <WholeTrip
              trips={[trip]}
              onSelect={(stop) => {
                setActiveUid(stop.uid)
                openPoi(stop.poiId)
              }}
            />
          ) : (
          <>
          <DayTabs trip={trip} value={dayIndex} onChange={setActiveDay} />

          {/* Clipped sideways only, so sliding days never widen the page on a phone. */}
          <div className="relative overflow-x-clip">
            <AnimatePresence mode="popLayout" custom={dayShift.dir}>
              <motion.div key={dayIndex} className="flow-root" custom={dayShift.dir} variants={dayPane} initial="enter" animate="center" exit="exit">
                {scheduled ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-lapis/6 px-4 py-2.5 text-[0.8rem] text-ink/70">
                    <span>
                      {tr('Khung giờ', 'Day window')}: <strong className="tabular text-ink">{fmtSpan(trip.dayStart, trip.dayEnd, vi)}</strong>
                    </span>
                    <span className="tabular">
                      {day.stops.length} {tr('điểm', 'stops')} · {fmtMinutes(day.stops.reduce((s, stop) => s + stop.travelMin, 0), vi)} {tr('di chuyển', 'travel')}
                    </span>
                  </div>
                ) : null}
                {scheduled && !dayTimed && day.stops.length > 0 && trip.status !== 'completed' && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-lapis/20 px-4 py-2 text-[0.8rem] text-ink/70">
                    <p className="min-w-0 flex-1">{tr('Giờ ngày này là ước tính của ứng dụng.', 'These times are the app’s estimate.')}</p>
                    <button type="button" className="btn-ghost btn-sm" disabled={schedule.isPending} onClick={runSchedule} title={tr('Máy chủ tự xếp thứ tự và thời lượng từng nơi', 'The server sets the order and each stay itself')}>
                      {schedule.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CalendarClock size={15} aria-hidden="true" />}{' '}
                      {schedule.isPending ? tr('Đang xếp lịch…', 'Scheduling…') : tr('Xếp lại lịch', 'Schedule again')}
                    </button>
                  </div>
                )}
                {!scheduled && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3">
                    <p className="min-w-0 flex-1 text-[0.82rem] leading-relaxed text-ink/80">
                      {tr('Ưng rồi thì bấm “Tạo lịch trình”. Khoá nơi nào thì nơi đó giữ ngày khi bấm “Gợi ý lại”.', 'Happy with the places? Tap “Create schedule”. Locked places keep their day when you tap “Suggest again”.')}
                    </p>
                    <button type="button" className="btn-ghost btn-sm" disabled={redraft.isPending || schedule.isPending} onClick={runRedraft}>
                      {redraft.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} {tr('Gợi ý lại', 'Suggest again')}
                    </button>
                    <button type="button" className="btn-gold btn-sm" disabled={redraft.isPending || schedule.isPending || !trip.days.some((d) => d.stops.length)} onClick={runSchedule}>
                      {schedule.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CalendarClock size={15} aria-hidden="true" />}{' '}
                      {schedule.isPending ? tr('Đang xếp lịch…', 'Scheduling…') : tr('Tạo lịch trình', 'Create schedule')}
                    </button>
                  </div>
                )}

                <RoutingNotes trip={trip} dayIndex={dayIndex} />

                <AnimatePresence initial={false}>
                  {live && live.violations.length > 0 && (
                    <motion.div role="alert" className="mt-3 border-l-4 border-pomegranate bg-pomegranate/8 px-4 py-3 text-sm text-pomegranate" {...noteIn}>
                      <p className="font-bold">{tr('Có điểm không khớp giờ', 'Some stops no longer fit')}</p>
                      <ul className="mt-1 list-disc pl-5">
                        {live.violations.map((violation) => (
                          <li key={violation.uid + violation.kind}>{vi ? violation.detail : violation.detailEn}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                {day.stops.length === 0 && (
                  <div className="mt-5 rounded-xl border-2 border-dashed border-forest/15 px-5 py-8 text-center">
                    <p className="h-display text-lg text-forest">{tr('Ngày này còn trống', 'This day is empty')}</p>
                    <p className="mt-1 text-sm text-ink/60">{tr('Thêm nơi bạn muốn đến; khi đủ, bấm “Tạo lịch trình” để xếp giờ.', 'Add the places you want to visit; when you have enough, tap “Create schedule” to time them.')}</p>
                    <button type="button" className="btn-gold btn-sm mt-4" onClick={() => setAddOpen(true)}>
                      <Plus size={15} aria-hidden="true" /> {tr('Thêm địa điểm', 'Add a place')}
                    </button>
                  </div>
                )}
                <div className="mt-5">
                  <Timeline
                    stops={day.stops}
                    timed={scheduled}
                    date={addDays(trip.startDate, dayIndex)}
                    activeUid={activeUid ?? hover}
                    violations={live?.violations}
                    onSelect={(uid) => {
                      setActiveUid(uid)
                      const stop = day.stops.find((entry) => entry.uid === uid)
                      if (stop) openPoi(stop.poiId)
                    }}
                    onHover={setHover}
                    onCommit={(order) => apply(reorderDay(trip, dayIndex, order), 'reorder')}
                    onMove={move}
                    onDuration={(uid, delta) => apply(changeDuration(trip, dayIndex, uid, delta), 'duration')}
                    onLock={(uid) => commit(toggleLock(trip, dayIndex, uid), 'lock')}
                    onRemove={(uid) => apply(removeStop(trip, dayIndex, uid), 'remove')}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.button type="button" onClick={() => setAddOpen(true)} whileTap={{ scale: 0.98 }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-lapis/30 py-3.5 text-sm font-semibold text-lapis transition-colors hover:border-lapis hover:bg-lapis/5">
            <Plus size={17} aria-hidden="true" /> {tr('Thêm địa điểm vào ngày này', 'Add a place to this day')}
          </motion.button>
          </>
          )}
        </motion.section>

        <motion.div variants={sideColumn} className="space-y-5 xl:sticky xl:top-6">
          <motion.div variants={riseItem} className="panel overflow-hidden">
            <RouteMap stops={day.stops} center={city} activeUid={activeUid ?? hover} onSelect={(uid) => { setActiveUid(uid) }} className="h-[21rem] w-full" />
          </motion.div>

          <motion.section variants={riseItem} className="panel-night p-5" aria-labelledby="adjust-title">
            <h2 id="adjust-title" className="h-display flex items-center gap-2 text-xl text-paper">
              <Wand2 size={19} className="text-gold" aria-hidden="true" /> {tr('Muốn đổi gì không?', 'Want to change something?')}
            </h2>
            <label htmlFor="adjust-text" className="sr-only">
              {tr('Yêu cầu mới', 'New request')}
            </label>
            {rejected && (
              <div className="mt-3 rounded-xl border border-gold/40 bg-night/40 p-3 text-sm text-paper/85" role="status">
                <p>{tr('Bạn đã bỏ qua bản mới. Muốn làm gì tiếp?', 'You turned the new version down. What next?')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-ghost btn-sm !border-paper/25 !text-paper"
                    onClick={() => {
                      setRejected(false)
                      timelineRef.current?.focus()
                      timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                  >
                    <Pencil size={14} aria-hidden="true" /> {tr('Tự sửa tay', 'Edit by hand')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm !border-paper/25 !text-paper"
                    onClick={() => {
                      setRejected(false)
                      adjustRef.current?.focus()
                      adjustRef.current?.select()
                    }}
                  >
                    <Wand2 size={14} aria-hidden="true" /> {tr('Đổi yêu cầu', 'Change my request')}
                  </button>
                </div>
              </div>
            )}
            <textarea
              ref={adjustRef}
              id="adjust-text"
              rows={2}
              value={adjustText}
              onChange={(event) => setAdjustText(event.target.value)}
              placeholder={tr('Bớt đi bộ, thêm quán cà phê view đẹp…', 'Less walking, add a café with a view…')}
              className="mt-3 w-full resize-none rounded-xl border border-gold/30 bg-night/50 px-3.5 py-2.5 text-paper caret-gold outline-none placeholder:text-paper/60 focus:border-gold"
            />
            <motion.div variants={chipRow} className="mt-2 flex flex-wrap gap-1.5">
              {ADJUST_IDEAS.map(([v, e]) => (
                <motion.button key={v} type="button" variants={popItem} whileTap={tap} onClick={() => setAdjustText((current) => `${current ? `${current}, ` : ''}${tr(v, e).toLowerCase()}`)} className="rounded-full border border-paper/20 px-2.5 py-1 text-[0.72rem] font-medium text-paper/75 transition-colors hover:border-gold hover:text-gold">
                  + {tr(v, e)}
                </motion.button>
              ))}
            </motion.div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-paper/85">
              <span id="per-day-label">{tr('Số điểm mỗi ngày', 'Stops per day')}</span>
              <span className="inline-flex items-center rounded-full border border-paper/25" role="group" aria-labelledby="per-day-label">
                <button type="button" className="grid size-8 place-items-center disabled:opacity-30" disabled={shownPerDay <= 1} onClick={() => setPerDay(shownPerDay - 1)} aria-label={tr('Bớt một điểm mỗi ngày', 'One stop less per day')}>
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="tabular min-w-8 overflow-hidden text-center font-semibold text-paper">
                  <motion.span key={shownPerDay} className="inline-block" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
                    {shownPerDay}
                  </motion.span>
                </span>
                <button type="button" className="grid size-8 place-items-center disabled:opacity-30" disabled={shownPerDay >= MAX_STOPS.fast} onClick={() => setPerDay(shownPerDay + 1)} aria-label={tr('Thêm một điểm mỗi ngày', 'One stop more per day')}>
                  <Plus size={14} aria-hidden="true" />
                </button>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-paper/85">
              <span id="dates-label">
                {tr('Ngày đi – ngày về', 'Dates')} <span className="tabular text-paper/55">· {tr(`${shownDays} ngày`, `${shownDays} day${shownDays > 1 ? 's' : ''}`)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5" role="group" aria-labelledby="dates-label">
                {/* A new first day moves the whole trip; a new last day makes it longer or shorter */}
                <input type="date" min={saigonToday()} value={shownDates.start} onChange={(event) => event.target.value && setDates({ start: event.target.value, end: addDays(event.target.value, shownDays - 1) })} aria-label={tr('Ngày đi', 'Start date')} className="tabular h-8 rounded-full border border-paper/25 bg-transparent px-2.5 text-paper outline-none [color-scheme:dark] focus:border-gold" />
                <span aria-hidden="true">–</span>
                <input type="date" min={shownDates.start} max={addDays(shownDates.start, MAX_TRIP_DAYS - 1)} value={shownDates.end} onChange={(event) => event.target.value && setDates({ ...shownDates, end: event.target.value })} aria-label={tr('Ngày về', 'End date')} className="tabular h-8 rounded-full border border-paper/25 bg-transparent px-2.5 text-paper outline-none [color-scheme:dark] focus:border-gold" />
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm text-paper/85">
              <span id="hours-label">{tr('Khung giờ mỗi ngày', 'Daily hours')}</span>
              <span className="inline-flex flex-wrap items-center gap-1.5" role="group" aria-labelledby="hours-label">
                <input type="time" step={900} value={shownHours.start} onChange={(event) => event.target.value && setHours({ ...shownHours, start: event.target.value })} aria-label={tr('Giờ bắt đầu', 'Start time')} aria-invalid={!!hoursProblem} className="tabular h-8 rounded-full border border-paper/25 bg-transparent px-2.5 text-paper outline-none [color-scheme:dark] focus:border-gold" />
                <span aria-hidden="true">–</span>
                <input type="time" step={900} value={shownHours.end} onChange={(event) => event.target.value && setHours({ ...shownHours, end: event.target.value })} aria-label={tr('Giờ kết thúc', 'End time')} aria-invalid={!!hoursProblem} className="tabular h-8 rounded-full border border-paper/25 bg-transparent px-2.5 text-paper outline-none [color-scheme:dark] focus:border-gold" />
                {/* An end at or before the start is the next morning */}
                {shownEnd > hm(shownHours.end) && <span className="text-xs font-semibold text-gold">{nextDayTag(vi)}</span>}
              </span>
            </div>
            {hoursProblem && <p className="mt-1.5 text-xs text-gold" role="alert">{tr(...dayWindowText(hoursProblem, shownDays))}</p>}
            <button
              type="button"
              className="btn-gold mt-4 w-full"
              disabled={(adjustText.trim().length < 4 && !perDayChanged && !startChanged && !endChanged && !startDateChanged && !daysChanged) || !!hoursProblem || adjust.isPending}
              onClick={() =>
                adjust.mutate({
                  text: adjustText,
                  stopsPerDay: perDayChanged ? shownPerDay : undefined,
                  dayStart: startChanged ? hm(shownHours.start) : undefined,
                  dayEnd: endChanged ? shownEnd : undefined,
                  startDate: startDateChanged ? shownDates.start : undefined,
                  days: daysChanged ? shownDays : undefined,
                })
              }
            >
              {adjust.isPending ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
              {adjust.isPending ? tr('Đang tính lại…', 'Working it out…') : tr('Xem thử', 'Preview')}
            </button>
          </motion.section>

          <motion.section variants={riseItem} className="panel p-5">
            <h2 className="h-display text-lg text-forest">{tr('Tổng quan', 'Overview')}</h2>
            <div className="mt-4">
              <TripStats trip={trip} />
            </div>
          </motion.section>
        </motion.div>
      </Stagger>

      <AddPlaceSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        trip={trip}
        dayIndex={dayIndex}
        onAdd={(poiId) => {
          const result = addStop(trip, dayIndex, poiId)
          const ok = apply(result, 'add')
          if (result.ok) {
            const shift = shiftNote(trip, result.trip, dayIndex)
            toast('success', tr('Đã thêm vào lịch trình', 'Added'), `${place.name(poiById[poiId].name)}${shift ? tr(...shift) : ''}`)
            setAddOpen(false)
          }
          return ok
        }}
      />

      <ProposalSheet
        proposal={proposal}
        trip={trip}
        onClose={() => {
          setProposal(null)
          setRejected(true)
          track({ type: 'edit_rejected', city: trip.city, tripId: trip.id })
        }}
        onAccept={() => {
          if (!proposal) return
          const { extraNote: _note, ...next } = proposal
          commit({ ...next, status: trip.status, scheduled: trip.scheduled }, 'auto-adjust')
          setProposal(null)
          setAdjustText('')
          setPerDay(null)
          setHours(null)
          setDates(null)
          toast('success', tr('Đã đổi xong', 'Done'))
        }}
      />

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        placement="center"
        width="max-w-md"
        title={tr('Xóa lịch trình này?', 'Delete this itinerary?')}
        description={tr('Xoá rồi là không lấy lại được.', 'You cannot get it back once deleted.')}
        footer={
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
              {tr('Giữ lại', 'Keep it')}
            </button>
            <button
              type="button"
              className="btn-night btn-sm !bg-pomegranate"
              onClick={() =>
                remove.mutate(trip.id, {
                  onSuccess: () => {
                    toast('info', tr('Đã xóa lịch trình', 'Itinerary deleted'))
                    navigate('/app/trips', { replace: true })
                  },
                })
              }
            >
              <Trash2 size={15} aria-hidden="true" /> {tr('Xóa', 'Delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-ink/70">{tripTitle(trip, language, mine)}</p>
      </Sheet>

      <ShareSheet trip={trip} open={dialog === 'share'} onClose={() => setDialog(null)} />
      <CloneTripSheet source={trip} open={dialog === 'copy'} onClose={() => setDialog(null)} />
      <CancelTripSheet trip={trip} open={dialog === 'cancel'} onClose={() => setDialog(null)} />
      <PoiSheet />
    </>
  )
}

/* ───────── add a place ───────── */

function AddPlaceSheet({ open, onClose, trip, dayIndex, onAdd }: { open: boolean; onClose: () => void; trip: Trip; dayIndex: number; onAdd: (poiId: string) => boolean }) {
  const { tr, place, language, price } = useTr()
  const [query, setQuery] = useState('')
  // Subscribing re-renders the sheet once the places arrive; until then an empty list means "not loaded yet", not "nothing left"
  const catalog = useCatalog(trip.city)
  const used = usedPoiIds(trip)
  const avoid = new Set(trip.avoidTags)
  // Places the traveler said no to go last, so a search does not lead with them
  const hits = searchPois({ city: trip.city, query, categories: [], prices: [], indoorOnly: false, sort: 'relevance' })
    .filter((hit) => !used.has(hit.poi.id))
    .sort((a, b) => Number(isAvoided(a.poi, avoid)) - Number(isAvoided(b.poi, avoid)))
    .slice(0, 12)

  return (
    <Sheet
      open={open}
      onClose={() => {
        setQuery('')
        onClose()
      }}
      title={tr(`Thêm vào Ngày ${dayIndex + 1}`, `Add to Day ${dayIndex + 1}`)}
    >
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr('Tìm theo tên, loại hoặc từ khóa…', 'Search by name, type or keyword…')} aria-label={tr('Tìm địa điểm', 'Search places')} className="h-12 w-full rounded-xl border border-forest/20 bg-white pl-10 pr-3 text-sm outline-none focus:border-lapis" />
      </div>
      <motion.ul className="mt-4 space-y-2" variants={sheetList} initial="hidden" animate="show">
        {hits.length === 0 &&
          (catalog.isFetching ? (
            <li className="flex items-center justify-center gap-2 py-8 text-sm text-ink/55">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {tr('Đang tải địa điểm…', 'Loading places…')}
            </li>
          ) : (
            <li className="py-8 text-center text-sm text-ink/55">{query.trim() ? tr('Không tìm thấy nơi nào khớp.', 'No place matches that.') : tr('Hết chỗ để thêm rồi.', 'Nothing left to add.')}</li>
          ))}
        {hits.map(({ poi }) => {
          const test = addStop(trip, dayIndex, poi.id)
          return (
            <motion.li key={poi.id} variants={riseItem} className="panel flex items-center gap-3 p-3">
              <CategoryGlyph cat={poi.cat} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{place.name(poi.name)}</p>
                <p className="tabular text-xs text-ink/55">
                  <OpeningHours poi={poi} date={addDays(trip.startDate, dayIndex)} /> · {price(poi)}
                </p>
                {!test.ok && <p className="mt-1 text-xs font-semibold text-pomegranate">{violationText(test.violations[0], language === 'vi')}</p>}
                {isAvoided(poi, avoid) && <p className="mt-1 text-xs font-semibold text-terracotta">{tr('Bạn đã nói không ăn món này', 'You said you do not eat this')}</p>}
              </div>
              <button type="button" className="btn-ghost btn-sm shrink-0" disabled={!test.ok} onClick={() => {
                  if (onAdd(poi.id)) setQuery('')
                }}>
                <Plus size={14} aria-hidden="true" /> {tr('Thêm', 'Add')}
              </button>
            </motion.li>
          )
        })}
      </motion.ul>
    </Sheet>
  )
}

/* ───────── review the rebuilt plan ───────── */

function ProposalSheet({ proposal, trip, onClose, onAccept }: { proposal: (Trip & { extraNote?: string[] }) | null; trip: Trip; onClose: () => void; onAccept: () => void }) {
  const { tr, money, place, language, locale } = useTr()
  const vi = language === 'vi'
  const datesOf = (t: Trip) => `${formatDate(t.startDate, locale, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(t.startDate, t.days.length - 1), locale, { day: 'numeric', month: 'short' })}`
  if (!proposal) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const before = tripCost(trip.days)
  const after = tripCost(proposal.days)
  const count = (t: Trip) => t.days.reduce((n, d) => n + d.stops.length, 0)
  const travel = (t: Trip) => t.days.reduce((n, d) => n + d.stops.reduce((m, s) => m + s.travelMin, 0), 0)
  const timed = isScheduled(trip)
  const delta = (a: number, b: number, unit = '') => `${b - a > 0 ? '+' : ''}${Math.round(b - a)}${unit}`

  return (
    <Sheet
      open
      onClose={onClose}
      width="max-w-2xl"
      title={tr('Bản mới', 'New version')}
      footer={
        <div className="flex justify-end gap-2.5">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            <X size={15} aria-hidden="true" /> {tr('Từ chối', 'Reject')}
          </button>
          <button type="button" className="btn-gold btn-sm" onClick={onAccept}>
            <Check size={15} aria-hidden="true" /> {tr('Dùng bản này', 'Use this one')}
          </button>
        </div>
      }
    >
      <motion.div className="grid grid-flow-col auto-cols-fr gap-3 text-center" variants={listGroup(0.08, 0.15)} initial="hidden" animate="show">
        {[
          { label: tr('Số điểm', 'Stops'), value: delta(count(trip), count(proposal)) },
          ...(timed ? [{ label: tr('Di chuyển (phút)', 'Travel (min)'), value: delta(travel(trip), travel(proposal)) }] : []),
          { label: tr('Chi phí', 'Cost'), value: `${after - before > 0 ? '+' : ''}${money(after - before)}` },
        ].map((item) => (
          <motion.div key={item.label} variants={popItem} className="panel p-3">
            <p className="h-display text-2xl text-forest tabular">{item.value}</p>
            <p className="text-[0.7rem] text-ink/55">{item.label}</p>
          </motion.div>
        ))}
      </motion.div>
      {(proposal.dayStart !== trip.dayStart || proposal.dayEnd !== trip.dayEnd) && (
        <p className="mt-3 text-[0.82rem] font-semibold text-forest" role="status">
          {tr('Khung giờ mới: ', 'New daily hours: ')}
          <span className="tabular">{fmtSpan(proposal.dayStart, proposal.dayEnd, vi)}</span>
          <span className="font-normal text-ink/55"> ({tr('trước đây', 'was')} {fmtSpan(trip.dayStart, trip.dayEnd, vi)})</span>
        </p>
      )}
      {(proposal.startDate !== trip.startDate || proposal.days.length !== trip.days.length) && (
        <p className="mt-3 text-[0.82rem] font-semibold text-forest" role="status">
          {tr('Ngày mới: ', 'New dates: ')}
          <span className="tabular">{datesOf(proposal)}</span>
          <span className="font-normal text-ink/55"> ({tr('trước đây', 'was')} {datesOf(trip)})</span>
        </p>
      )}
      {proposal.extraNote && (
        <p className="mt-3 text-[0.82rem] font-semibold text-pomegranate" role="status">
          {tr('Chưa thêm được: ', 'Could not add: ')}
          {proposal.extraNote.map((name) => place.name(name)).join(', ')}
        </p>
      )}

      <motion.div className="mt-6 space-y-6" variants={listGroup(0.06, 0.3)} initial="hidden" animate="show">
        {proposal.days.map((day) => {
          const old = trip.days[day.index]?.stops ?? []
          const diff = diffDay(old, day.stops)
          return (
            <motion.section key={day.index} variants={listGroup(0.045, 0.1)} aria-label={tr(`Ngày ${day.index + 1}`, `Day ${day.index + 1}`)}>
              <h3 className="text-sm font-bold text-ink">
                {tr('Ngày', 'Day')} {day.index + 1} <span className="ml-2 font-normal text-ink/50">+{diff.added.length} / −{diff.removed.length}</span>
              </h3>
              <motion.ul className="mt-2 space-y-1.5" variants={listGroup(0.045)}>
                {diff.removed.map((stop) => (
                  <motion.li key={stop.uid} variants={slideItem} className="flex items-center gap-2 rounded-lg bg-pomegranate/8 px-3 py-2 text-sm text-pomegranate line-through decoration-pomegranate/60">
                    <X size={14} aria-hidden="true" /> {place.nameOf(stop.poiId)}
                  </motion.li>
                ))}
                {day.stops.map((stop) => {
                  const isNew = diff.added.includes(stop)
                  return (
                    <motion.li key={stop.uid} variants={slideItem} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isNew ? 'bg-firuze/15 font-semibold text-jade-ink' : 'bg-white/70 text-ink/80'}`}>
                      {isNew ? <Plus size={14} aria-hidden="true" /> : <ArrowRight size={14} className="text-ink/30" aria-hidden="true" />}
                      {timed && <span className="tabular w-11 shrink-0 text-xs text-ink/50">{fmtTime(stop.start)}</span>}
                      <span className="min-w-0 flex-1 truncate">{place.nameOf(stop.poiId)}</span>
                      {isNew && <span className="rounded-full bg-firuze px-2 py-0.5 text-[0.65rem] font-bold text-white">{tr('Mới', 'New')}</span>}
                    </motion.li>
                  )
                })}
              </motion.ul>
            </motion.section>
          )
        })}
      </motion.div>
    </Sheet>
  )
}

export type { Stop }

const REASONS: Record<string, [string, string]> = {
  no_time: ['không đủ thời gian', 'not enough time'],
  // The backend also says this when the day's hours are shorter than the visit, not only when the place is shut
  closed_on_trip_days: ['không mở cửa đủ lâu trong khung giờ của chuyến', 'not open long enough within the trip’s day hours'],
  closed_on_pinned_day: ['đóng cửa đúng ngày đang xếp', 'closed on the day it is on'],
  not_found: ['không còn trong hệ thống', 'no longer in the data'],
  no_location: ['chưa có vị trí trên bản đồ', 'no map position'],
}
const GROUPS: Record<string, [string, string]> = {
  'food.cafe': ['quán cà phê', 'cafés'],
  'food.restaurant': ['nhà hàng', 'restaurants'],
  food: ['điểm ăn uống', 'food stops'],
  'entertainment.nightlife': ['quán bar', 'bars'],
  'attraction.museum': ['bảo tàng', 'museums'],
  'attraction.gallery': ['phòng trưng bày', 'galleries'],
  culture_religion: ['chùa, đền, nhà thờ', 'pagodas, temples and churches'],
  'shopping.market': ['chợ', 'markets'],
  'nature.park': ['công viên', 'parks'],
}
/** Museums and galleries together a hand-edited day may hold (the widest pace's limit). The backend's `day_max` counts museums only. */
const MUSEUM_CAP = Math.max(...Object.values(PACE_LIMITS).map((limits) => limits.museums))
const MUSEUM_NODES = new Set(['attraction.museum', 'attraction.gallery'])

/** What the backend planner said about the trip (docs/routing-frontend.md): the day's load, places it could not fit, and its warnings. Unknown codes are skipped. */
function RoutingNotes({ trip, dayIndex }: { trip: Trip; dayIndex: number }) {
  const { tr, money, language, locale } = useTr()
  const routing = trip.routing
  if (!routing) return null
  const vi = language === 'vi'
  const date = addDays(trip.startDate, dayIndex)
  const group = (node: string) => tr(...(GROUPS[node] ?? [node, node]))
  const inTrip = new Set(trip.days.flatMap((d) => d.stops.map((s) => s.poiId)))
  const lines: string[] = []
  const load = isScheduled(trip) ? undefined : routing.load?.[dayIndex]
  if (load) lines.push(load.capacity > 0 ? tr(`Bận ${fmtMinutes(load.busy, vi)} / ${fmtMinutes(load.capacity, vi)}`, `Busy ${fmtMinutes(load.busy, vi)} of ${fmtMinutes(load.capacity, vi)}`) : tr('Ngày này không còn thời gian', 'No time left on this day'))
  let unknownHours = 0
  for (const warning of routing.warnings) {
    const [code, a, b] = warning.split(':')
    if (code === 'travel_estimated') lines.push(tr('Thời gian di chuyển là ước tính', 'Travel times are estimates'))
    else if (code === 'hours_unknown' && inTrip.has(a)) unknownHours += 1
    // more bars a night than the backend's one were asked for: not a broken rule for this trip
    else if (code === 'day_max' && a === 'entertainment.nightlife' && (trip.nightsPerDay ?? 1) > 1) continue
    else if (code === 'day_max' && b === date) lines.push(tr(`Nhiều ${group(a)} trong ngày này`, `Many ${group(a)} on this day`))
    else if (code === 'not_adjacent' && b === date && MUSEUM_NODES.has(a)) lines.push(tr('Có hai bảo tàng liền nhau', 'Two museums in a row'))
    else if (code === 'not_adjacent' && b === date) lines.push(tr('Có hai điểm ăn uống liền nhau', 'Two food stops in a row'))
    else if (code === 'not_before' && b === date) lines.push(tr(`Có ${group(a)} xếp trước buổi tối`, `A ${group(a).replace(/s$/, '')} before the evening`))
    // A museum shut on some trip day can make an even spread impossible, so that note is not one the traveler could act on
    else if (code === 'day_spread' && a !== 'attraction.museum') lines.push(tr(`Số ${group(a)} chưa chia đều giữa các ngày`, `${group(a)} are not spread evenly over the days`))
  }
  // A day changed by hand no longer has the backend's dated warnings, so its limits are read from its stops. Nothing is refused: the traveler chose them
  if (!isDayTimed(trip, dayIndex)) {
    const here = trip.days[dayIndex].stops.flatMap((stop) => poiById[stop.poiId] ?? [])
    const many = (node: string) => tr(`Nhiều ${group(node)} trong ngày này`, `Many ${group(node)} on this day`)
    if (here.filter((poi) => poi.evening).length > (trip.nightsPerDay ?? MAX_NIGHTLIFE)) lines.push(many('entertainment.nightlife'))
    if (here.filter((poi) => poi.cat === 'cafe').length > MAX_CAFES) lines.push(many('food.cafe'))
    if (here.filter(isMuseum).length > MUSEUM_CAP) lines.push(many('attraction.museum'))
    // A draft has no order yet: scheduling sets it
    const foodStop = (poi: (typeof here)[number]) => poi.cat === 'food' || poi.cat === 'cafe'
    if (isScheduled(trip) && here.some((poi, index) => index > 0 && foodStop(poi) && foodStop(here[index - 1]))) lines.push(tr('Có hai điểm ăn uống liền nhau', 'Two food stops in a row'))
    if (isScheduled(trip) && here.some((poi, index) => index > 0 && isMuseum(poi) && isMuseum(here[index - 1]))) lines.push(tr('Có hai bảo tàng liền nhau', 'Two museums in a row'))
  }
  if (tripCost(trip.days) > trip.budget) lines.push(tr(`Chi phí dự kiến ${money(tripCost(trip.days))} vượt ngân sách ${money(trip.budget)}`, `Estimated cost ${money(tripCost(trip.days))} is over the ${money(trip.budget)} budget`))
  if (unknownHours) lines.push(tr(`${unknownHours} nơi chưa rõ giờ mở cửa, nên kiểm tra trước khi đi`, `${unknownHours} places have no known hours; check before going`))
  // Only a draft lists what did not fit (a scheduled trip has a time for every place it holds), and only places still in it
  const missing = isScheduled(trip) ? [] : routing.unscheduled.filter((u) => inTrip.has(u.poiId))
  // `/routing` sends no open days, and a place added since the last split has none: the device reads its hours for the other trip days
  const openDates = (poiId: string) => {
    const poi = poiById[poiId]
    if (routing.openDates?.[poiId] || !poi) return routing.openDates?.[poiId]
    const own = trip.days.find((d) => d.stops.some((s) => s.poiId === poiId))?.index
    return trip.days
      .filter((d) => d.index !== own)
      .map((d) => addDays(trip.startDate, d.index))
      .filter((d) => {
        const slot = visitSlot(poi, trip.dayStart, poi.visit, weekdayOf(d))
        return !!slot?.fits && slot.start + poi.visit <= trip.dayEnd
      })
  }
  const reasonOf = ({ poiId, reason }: (typeof missing)[number]) => {
    const open = openDates(poiId)
    if (reason !== 'closed_on_pinned_day' || !open) return tr(...(REASONS[reason] ?? [reason, reason]))
    if (!open.length) return tr(...REASONS.closed_on_trip_days)
    const dates = open.map((d) => formatDate(d, locale, { day: 'numeric', month: 'numeric' })).join(', ')
    return tr(`đóng cửa ngày đang xếp, mở ngày ${dates}`, `closed on its day, open on ${dates}`)
  }
  // Another day could take it: unlocking it and "Suggest again" lets the server move it
  const movable = missing.some((u) => u.reason === 'no_time' || (u.reason === 'closed_on_pinned_day' && openDates(u.poiId)?.length !== 0))
  if (!lines.length && !missing.length) return null
  return (
    <motion.div className="mt-3 space-y-1 rounded-xl bg-paper px-4 py-2.5 text-[0.78rem] text-ink/70 ring-1 ring-ink/8" initial={noteIn.initial} animate={noteIn.animate}>
      {[...new Set(lines)].map((line) => (
        <p key={line}>{line}</p>
      ))}
      {missing.length > 0 && (
        <>
          <p className="text-pomegranate">
            <strong>{tr('Chưa xếp được', 'Not scheduled')}:</strong>{' '}
            {missing.map((u) => `${u.name}${trip.mustInclude.includes(u.poiId) ? tr(' (bắt buộc)', ' (must visit)') : ''}: ${reasonOf(u)}`).join('; ')}
          </p>
          <p>
            {movable
              ? tr('Xoá bớt một nơi, hoặc bỏ khoá nơi đó (nếu đang khoá) rồi bấm “Gợi ý lại” để đổi ngày.', 'Remove a place, or unlock that one (if locked) and tap “Suggest again” to change its day.')
              : tr('Xoá nơi đó rồi bấm “Tạo lịch trình” lại.', 'Remove it, then tap “Create schedule” again.')}
          </p>
        </>
      )}
    </motion.div>
  )
}

function EditableTitle({ value, onSave, label }: { value: string; onSave: (value: string) => void; label: string }) {
  return (
    <span className="group relative flex min-w-0 items-center">
      <input
        key={value}
        defaultValue={value}
        aria-label={label}
        onBlur={(event) => onSave(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
        className="h-display w-full min-w-[12rem] max-w-[46rem] text-ellipsis border-b max-sm:text-[1.7rem] border-transparent bg-transparent outline-none transition-colors hover:border-forest/25 focus:border-gold"
      />
      <Pencil size={16} className="ml-2 shrink-0 text-ink/30 transition-opacity group-focus-within:opacity-0 group-hover:text-lapis" aria-hidden="true" />
    </span>
  )
}

/** A leg of a journey (`domain/journey.ts`) says which, and links to the whole journey on one page. */
function JourneyNote({ trip, trips }: { trip: Trip; trips?: Trip[] }) {
  const { tr, language } = useTr()
  const legs = journeysOf(trips ?? []).find((journey) => journey.id === trip.journeyId)?.legs
  if (!legs || legs.length < 2) return null
  const index = legs.findIndex((leg) => leg.id === trip.id)
  return (
    <Link to={`/app/journeys/${trip.journeyId}`} className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 border border-lapis/25 bg-lapis/6 px-4 py-2.5 text-sm text-ink/80 transition-colors hover:border-lapis">
      <RouteIcon size={16} className="text-lapis" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {tr(`Chặng ${index + 1}/${legs.length} của hành trình`, `Leg ${index + 1} of ${legs.length} of the journey`)} <strong className="text-ink">{journeyRoute(legs, language)}</strong>
      </span>
      <span className="inline-flex items-center gap-1 font-semibold text-lapis">
        {tr('Xem cả hành trình', 'See the whole journey')} <ArrowRight size={14} aria-hidden="true" />
      </span>
    </Link>
  )
}
