import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, stagger, type Variants } from 'motion/react'
import { AlertTriangle, ArrowLeft, Ban, Check, Flag, LocateFixed, Navigation, Pause, Play, Radar, Siren, Timer, TrafficCone, Store, Undo2, X, Zap } from 'lucide-react'
import { track } from '../../api/analytics'
import { getIncidents, toDisruption } from '../../api/incidents'
import { saigonToday } from '../../api/planner'
import { systemNotify } from '../../api/notifications'
import { readProfile } from '../../api/profile'
import { useProfile, useSaveTrip, useTrip } from '../../api/queries'
import { useMoveLink } from '../../app/pageTransition'
import { ModuleGate } from '../../components/ModuleGate'
import { LocationPermissionSheet } from '../../components/live/LocationPermissionSheet'
import { CancelTripSheet } from '../../components/trip/TripLifecycle'
import { haversineKm } from '../../domain/geo'
import { locationProblemText, useLivePosition, USABLE_ACCURACY_M } from '../../hooks/useLivePosition'
import { useAuthStore } from '../../store/authStore'
import { incidentKey, isMinor, liveOf, REQUEST_TTL_MS, useLiveStore, type EditRequest, type LiveMode } from '../../store/liveStore'
import type { AppNotification } from '../../store/notificationStore'
import { WeatherIcon } from '../../components/icons'
import { RouteMap } from '../../components/map/RouteMap'
import { Stagger } from '../../components/motion/Stagger'
import { EASE_OUT, riseItem } from '../../components/motion/variants'
import { PoiSheet } from '../../components/place/PoiSheet'
import { Timeline } from '../../components/trip/Timeline'
import { EmptyState, Segmented, Skeleton, Switch } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { PageHeader } from '../../components/PageHeader'
import { congestionAt, weatherFor } from '../../domain/conditions'
import { applyReplan, disruptionMeta, LAMBDAS, replanDay, type ReplanOption } from '../../domain/replan'
import { placeNameOf } from '../../domain/placeText'
import { cityById, poiById } from '../../domain/pois'
import { visitSlot } from '../../domain/solver'
import { addDays, DAY_MINUTES, fmtClock, fmtMinutes, fmtSpan, fmtTime, nextDayTag, weekdayOf } from '../../domain/time'
import type { Disruption, Stop, Trip } from '../../domain/types'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useTr } from '../../hooks/useTr'
import { useNotificationStore } from '../../store/notificationStore'
import { useWeatherStore } from '../../store/weatherStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'
import { tripTitle } from '../../domain/tripText'

/** Speed of the demo clock in simulated minutes per real second. */
const SPEEDS = [
  { id: '1x', rate: 1 / 60, label: '×1' },
  { id: '60x', rate: 1, label: '×60' },
  { id: '300x', rate: 5, label: '×300' },
] as const

type Place = { lat: number; lng: number }

const leftColumn: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.09) } } }
const buttonRow: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.06, { startDelay: 0.25 }) } } }
// Scale only: an inline opacity would override the disabled style of these buttons.
const buttonPop: Variants = { hidden: { scale: 0.6, y: 12 }, show: { scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 20 } } }
const SPRING = { type: 'spring', stiffness: 380, damping: 26 } as const
// New rows that arrive while the slider moves stagger among themselves, so only the first eight wait.
const replanList: Variants = { hidden: {}, show: { transition: { delayChildren: (i: number) => Math.min(i, 8) * 0.04 } } }
const replanRow: Variants = { hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } } }

function locate(stops: Stop[], now: number): { me: Place | null; phase: 'before' | 'visiting' | 'travelling' | 'waiting' | 'after'; index: number; progress: number } {
  if (!stops.length) return { me: null, phase: 'before', index: 0, progress: 0 }
  // A place this browser has not loaded has no position, so the dot is not drawn while there
  const at = (stop: Stop): Place | null => poiById[stop.poiId] ?? null
  if (now < stops[0].start) return { me: at(stops[0]), phase: 'before', index: 0, progress: 0 }
  for (let i = 0; i < stops.length; i += 1) {
    const stop = stops[i]
    const poi = at(stop)
    if (now >= stop.start && now < stop.end) return { me: poi, phase: 'visiting', index: i, progress: (now - stop.start) / Math.max(1, stop.end - stop.start) }
    const prev = stops[i - 1]
    if (prev && now >= prev.end && now < stop.start) {
      const from = at(prev)
      const frac = Math.min(1, (now - prev.end) / Math.max(1, stop.travelMin))
      const waiting = frac >= 1
      return {
        me: from && poi ? { lat: from.lat + (poi.lat - from.lat) * frac, lng: from.lng + (poi.lng - from.lng) * frac } : null,
        phase: waiting ? 'waiting' : 'travelling',
        index: i,
        progress: frac,
      }
    }
  }
  return { me: at(stops[stops.length - 1]), phase: 'after', index: stops.length - 1, progress: 1 }
}

type LogLine = { id: number; at: number; text: string; tone: 'ok' | 'warn' }

/** Within this distance of a stop the traveler counts as being there. */
const ARRIVAL_M = 120

/** Minutes after midnight in Vietnam, whatever time zone the device is in. */
const vnMinutes = () => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number)
  return (h % 24) * 60 + m
}

/** A value that changes every `ms`, to re-render countdowns and the real clock. */
function useTick(ms: number) {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), ms)
    return () => window.clearInterval(timer)
  }, [ms])
  return tick
}

type AutoChange = { previous: Trip; option: ReplanOption; disruption: Disruption }

export function LivePage() {
  return (
    <ModuleGate id="live">
      <Live />
    </ModuleGate>
  )
}

function Live() {
  const { id } = useParams()
  const { tr, money, place, language, locale } = useTr()
  const go = useMoveLink()
  const vi = language === 'vi'
  const user = useAuthStore((state) => state.user)!
  const tripQuery = useTrip(id)
  const save = useSaveTrip()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const { activeUid, setActiveUid, openPoi } = useUiStore()
  const pushNote = useNotificationStore((state) => state.push)
  const { canPointerFx } = useMotionPrefs()
  const liveTrips = useLiveStore((state) => state.trips)
  const patchLive = useLiveStore((state) => state.patch)
  const clearLive = useLiveStore((state) => state.clear)
  const live = liveOf(liveTrips, id)
  const known = !!id && !!liveTrips[id]

  const trip = tripQuery.data
  const second = useTick(1000)
  // On the real clock, the small hours of a day that runs past midnight (01:00 on a 09:00–03:00 day) are still that day, on its clock (01:00 is 1500)
  const smallHours = !!trip && live.mode === 'gps' && trip.dayEnd > DAY_MINUTES && vnMinutes() < trip.dayEnd - DAY_MINUTES
  const today = useMemo(() => {
    if (!trip) return { index: 0, shift: 0 }
    // Today in Vietnam, the same calendar as the trip clock, whatever time zone the device is in
    const diff = Math.round((new Date(`${saigonToday()}T00:00:00`).getTime() - new Date(`${trip.startDate}T00:00:00`).getTime()) / 86_400_000)
    const yesterday = smallHours && diff >= 1 && diff <= trip.days.length
    return { index: Math.min(trip.days.length - 1, Math.max(0, yesterday ? diff - 1 : diff)), shift: yesterday ? DAY_MINUTES : 0 }
  }, [trip, smallHours])
  const dayIndex = today.index
  const stops = trip?.days[dayIndex]?.stops

  const mode = live.mode
  const gps = mode === 'gps'
  // First visit to this trip's live view: ask about location before anything else
  const [asking, setAsking] = useState(!known)
  const [clock, setClock] = useState<number | null>(live.clock)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]['id']>('60x')
  const [autoSim, setAutoSim] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const [sheet, setSheet] = useState(false)
  const [lambda, setLambda] = useState(0.9)
  const [cancelling, setCancelling] = useState(false)
  const [autoChange, setAutoChange] = useState<AutoChange | null>(null)
  const [recenter, setRecenter] = useState(0)
  const ticks = useRef(0)
  const lastCheck = useRef(0)
  const logId = useRef(0)

  const { fix, problem } = useLivePosition(gps && trip?.status === 'live')
  const realNow = useMemo(() => vnMinutes() + today.shift, [second, today.shift]) // eslint-disable-line react-hooks/exhaustive-deps

  // The demo clock starts a few minutes before the first stop.
  const startAt = trip && stops?.length ? Math.max(trip.dayStart, stops[0].start - 8) : null
  const now = gps ? realNow : (clock ?? startAt)

  const pending = live.pending && live.pending.tripId === trip?.id ? live.pending : null
  const snoozed = !!pending && live.snoozedUntil !== undefined && now !== null && now < live.snoozedUntil
  const event = useMemo(() => (pending && !snoozed ? { disruption: pending.disruption, at: pending.at } : null), [pending, snoozed])

  const rate = SPEEDS.find((item) => item.id === speed)!.rate
  const blocked = sheet || !!event
  useEffect(() => {
    if (gps || !playing || blocked || startAt === null) return
    const timer = window.setInterval(() => setClock((value) => (value ?? startAt ?? 0) + rate * 0.2), 200)
    return () => window.clearInterval(timer)
  }, [gps, playing, blocked, rate, now === null, startAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // The demo clock is kept every few seconds, so a reload carries on from where it was
  const clockRef = useRef(clock)
  useEffect(() => {
    clockRef.current = clock
  }, [clock])
  useEffect(() => {
    if (!id || gps) return
    // Only while the trip still has live state: after it is finished or cancelled the entry is gone and must not come back
    const keep = () => {
      if (clockRef.current !== null && useLiveStore.getState().trips[id]) patchLive(id, { clock: clockRef.current })
    }
    const timer = window.setInterval(keep, 5000)
    return () => {
      window.clearInterval(timer)
      keep()
    }
  }, [id, gps, patchLive])

  const addLog = useCallback((text: string, tone: LogLine['tone'], at: number) => {
    setLog((lines) => [{ id: logId.current++, at, text, tone }, ...lines].slice(0, 6))
  }, [])

  const alertOn = useCallback((kind: Disruption['kind']) => profile.alerts[kind] !== false, [profile.alerts])

  /** UC 3.5: a note in the bell, and a system notification when the app is in the background. */
  const notify = useCallback(
    (note: Omit<AppNotification, 'id' | 'at' | 'read' | 'userId'>) => {
      pushNote({ ...note, userId: user.id })
      systemNotify(vi ? note.vi : note.en, vi ? note.bodyVi : note.bodyEn)
    },
    [pushNote, user.id, vi],
  )

  /** UC 3.4: a small hold-up is absorbed by the "keep it close" option, saved at once, with Undo. */
  const autoAdapt = useCallback(
    (disruption: Disruption, at: number): boolean => {
      if (!trip) return false
      const result = replanDay(trip, dayIndex, at, disruption, [LAMBDAS[0]])
      const option = result.options[0]
      if (!option) return false
      const next = applyReplan(trip, dayIndex, result.completed, option)
      save.mutate(next)
      setAutoChange({ previous: trip, option, disruption })
      patchLive(trip.id, { suppressed: [...live.suppressed, incidentKey(disruption)] })
      track({ type: 'replan_auto', city: trip.city, reason: disruption.kind, lambda: option.lambda, tripId: trip.id })
      const label = disruptionMeta[disruption.kind]
      notify({ kind: 'success', vi: `Đã tự chỉnh lịch: ${label.vi.toLowerCase()}`, en: `Plan adjusted: ${label.en.toLowerCase()}`, bodyVi: `Giữ ${option.kept.length} điểm, thêm ${option.added.length}, bỏ ${option.dropped.length}.`, bodyEn: `${option.kept.length} kept, ${option.added.length} added, ${option.dropped.length} dropped.`, to: `/app/trips/${trip.id}/live` })
      addLog(tr(`Tự điều chỉnh: ${label.vi}`, `Adjusted on its own: ${label.en}`), 'ok', at)
      return true
    },
    [trip, dayIndex, save, patchLive, live.suppressed, notify, addLog, tr],
  )

  /** `minor` is the backend's own reading of the incident when it sends one; otherwise the size of the hold-up decides. */
  const trigger = useCallback(
    (disruption: Disruption, at: number, minor = isMinor(disruption)) => {
      if (!trip || pending) return
      if (live.suppressed.includes(incidentKey(disruption))) return
      if (minor && profile.autoAdjust !== false && autoAdapt(disruption, at)) return
      const request: EditRequest = { id: `req-${Date.now().toString(36)}`, tripId: trip.id, dayIndex, disruption, at, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + REQUEST_TTL_MS).toISOString() }
      patchLive(trip.id, { pending: request, snoozedUntil: undefined })
      // Heavy rain is not just a card: the whole app turns rainy until the traveler decides what to do.
      if (disruption.kind === 'weather') useWeatherStore.getState().setOverride('rain', 5 * 60_000)
      track({ type: 'replan_suggested', city: trip.city, reason: disruption.kind, tripId: trip.id })
      const label = disruptionMeta[disruption.kind]
      if (alertOn(disruption.kind)) notify({ kind: disruption.kind, vi: `${label.vi} trong chuyến “${tripTitle(trip, 'vi')}”`, en: `${label.en} on “${tripTitle(trip, 'en')}”`, bodyVi: 'Có cách đổi lịch cho phần còn lại của ngày. Bấm để xem.', bodyEn: 'There is a way to rework the rest of the day. Tap to review.', to: `/app/trips/${trip.id}/live` })
      addLog(tr(`Phát hiện: ${label.vi}`, `Detected: ${label.en}`), 'warn', at)
    },
    [trip, pending, live.suppressed, profile.autoAdjust, autoAdapt, dayIndex, patchLive, alertOn, notify, addLog, tr],
  )

  // UC 3.3 with the backend: incidents for this trip, polled while the page is visible
  const incidents = useQuery({ queryKey: ['incidents', trip?.id], queryFn: () => getIncidents(trip!.id), enabled: gps && trip?.status === 'live', refetchInterval: 60_000, refetchIntervalInBackground: false })
  useEffect(() => {
    if (!gps || now === null || pending) return
    for (const incident of incidents.data?.incidents ?? []) {
      const disruption = toDisruption(incident, now)
      if (disruption && !live.suppressed.includes(incidentKey(disruption))) return trigger(disruption, now, incident.severity ? incident.severity === 'minor' : undefined)
    }
    // runs when a new answer arrives, and when the request in the way is answered (the next incident in the feed is then raised)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents.data, pending?.id])

  // The demo condition monitor: poll every 10 simulated minutes.
  useEffect(() => {
    if (gps || !trip || now === null || blocked) return
    if (now - lastCheck.current < 10) return
    lastCheck.current = now
    ticks.current += 1
    const traffic = congestionAt(trip.city, now)
    const weather = weatherFor(trip.city, addDays(trip.startDate, dayIndex))
    const degrees = weather.tempC === null ? '' : `, ${weather.tempC}°C`
    addLog(
      traffic > 1.2
        ? tr(`Giao thông đông (×${traffic.toFixed(1)})${degrees}`, `Traffic heavy (×${traffic.toFixed(1)})${degrees}`)
        : tr(`Giao thông thông thoáng${degrees}. Lịch vẫn ổn.`, `Traffic clear${degrees}. Plan still fine.`),
      'ok',
      now,
    )
    if (autoSim && ticks.current % 4 === 0 && stops) {
      const upcoming = stops.find((stop) => stop.start > now + 10)
      const kinds: Disruption[] = [{ kind: 'traffic', minutes: 25 }, { kind: 'weather', until: now + 90 }, { kind: 'delay', minutes: 30 }, { kind: 'delay', minutes: 10 }]
      if (upcoming) kinds.push({ kind: 'closure', poiId: upcoming.poiId })
      trigger(kinds[Math.floor(Math.random() * kinds.length)], now)
    }
  }, [gps, now, trip, blocked, autoSim, stops, dayIndex, addLog, tr, trigger])

  // A proposal nobody answered in time lapses; the current plan stays (UC 3.6)
  const expired = !!pending && Date.parse(pending.expiresAt) <= second
  useEffect(() => {
    if (!expired || !trip || !pending) return
    // Unanswered counts as "keep my plan": the same incident is not asked about again
    patchLive(trip.id, { pending: null, snoozedUntil: undefined, suppressed: [...live.suppressed, incidentKey(pending.disruption)] })
    setSheet(false)
    if (pending.disruption.kind === 'weather') useWeatherStore.getState().clearOverride()
    track({ type: 'replan_dismissed', city: trip.city, reason: pending.disruption.kind, detail: 'expired', tripId: trip.id })
    notify({ kind: 'info', vi: 'Đề xuất đổi lịch đã hết hạn', en: 'The change proposal expired', bodyVi: 'Lịch trình giữ nguyên như cũ.', bodyEn: 'Your itinerary stays as it was.', to: `/app/trips/${trip.id}/live` })
  }, [expired, trip, pending, patchLive, notify, live.suppressed])

  const scheduleWhere = useMemo(() => (stops && now !== null ? locate(stops, now) : null), [stops, now])
  // With a real position: the stop within reach counts as reached, whatever the schedule says
  const arrivedAt = useMemo(() => {
    if (!gps || !fix || !stops || fix.accuracy > USABLE_ACCURACY_M) return -1
    return stops.findIndex((stop) => poiById[stop.poiId] && haversineKm(fix, poiById[stop.poiId]) * 1000 <= ARRIVAL_M)
  }, [gps, fix, stops])
  const where = useMemo(() => {
    if (!scheduleWhere) return null
    if (!gps) return scheduleWhere
    const me = fix ? { lat: fix.lat, lng: fix.lng } : null
    if (arrivedAt >= 0) return { ...scheduleWhere, me, phase: 'visiting' as const, index: arrivedAt }
    return { ...scheduleWhere, me }
  }, [scheduleWhere, gps, fix, arrivedAt])

  // λ is the traveler's choice: the solver re-runs for the exact value on the slider.
  const result = useMemo(() => {
    if (!trip || !event) return null
    return replanDay(trip, dayIndex, event.at, event.disruption, [{ id: 'custom', lambda }])
  }, [trip, dayIndex, event, lambda])
  const chosen: ReplanOption | null = result?.options[0] ?? null

  if (tripQuery.isLoading) return <Skeleton className="h-[36rem]" />
  // While the cancel sheet is saving, the page (and the sheet in it) stays: the save shows the trip as cancelled at once, and the sheet
  // must still be mounted to clear the live state and leave the page when the save succeeds
  if (trip?.status === 'cancelled' && !cancelling) {
    return (
      <EmptyState
        title={tr('Chuyến này đã huỷ', 'This trip was cancelled')}
        body={tr('Mở lại chuyến ở trang lịch trình nếu bạn muốn đi tiếp.', 'Restart it from the itinerary page if you want to go on.')}
        action={
          <Link to={`/app/trips/${trip.id}`} className="btn-gold">
            {tr('Về lịch trình', 'Back to the itinerary')}
          </Link>
        }
      />
    )
  }
  if (!trip || !stops || !where || now === null) {
    return (
      <EmptyState
        title={tr('Không mở được chuyến đi', 'Could not open the trip')}
        body={tr('Lịch trình không tồn tại hoặc chưa có điểm nào.', 'The itinerary does not exist or has no stops yet.')}
        action={
          <Link to="/app/trips" className="btn-gold">
            {tr('Về danh sách', 'Back to trips')}
          </Link>
        }
      />
    )
  }

  const city = cityById[trip.city]
  const nextStop = stops[Math.min(stops.length - 1, where.phase === 'visiting' ? where.index + 1 : where.index)]
  const current = where.phase === 'visiting' ? stops[where.index] : null
  const last = stops[stops.length - 1]
  const dayLength = Math.max(1, trip.dayEnd - trip.dayStart)
  const elapsed = Math.min(1, Math.max(0, (now - trip.dayStart) / dayLength))
  const slack = trip.dayEnd - last.end
  const finished = where.phase === 'after'
  // Arrived early at a place that is already open: the time until its start is the traveler's own (a rest, time before the evening)
  const freeUntil = where.phase === 'waiting' && poiById[nextStop.poiId] && visitSlot(poiById[nextStop.poiId], now, nextStop.visit, weekdayOf(addDays(trip.startDate, dayIndex)), trip.dayEnd)?.start === now ? nextStop.start - now : 0
  const status = finished ? 'done' : where.phase === 'visiting' ? 'at' : where.phase === 'before' ? 'before' : freeUntil > 0 ? 'free' : 'to'
  const doneCount = gps && arrivedAt >= 0 ? arrivedAt : stops.filter((stop) => stop.end <= now).length
  // Live ETA from the real position at the city's usual road speed
  const etaMin = gps && fix && nextStop && poiById[nextStop.poiId] ? Math.max(1, Math.round((haversineKm(fix, poiById[nextStop.poiId]) / city.roadKmh) * 60)) : null
  const secondsLeft = pending ? Math.max(0, Math.round((Date.parse(pending.expiresAt) - second) / 1000)) : 0

  const inject = (disruption: Disruption) => trigger(disruption, now)

  const apply = (option: ReplanOption) => {
    if (!result || !event || !pending) return
    const previous = trip
    const before = { pending, suppressed: live.suppressed }
    const next = applyReplan(trip, dayIndex, result.completed, option)
    save.mutate(next, {
      // Not saved: the trip went back to how it was, so the proposal comes back too and can be answered again
      onError: () => patchLive(trip.id, before),
      onSuccess: (saved) => {
        notify({ kind: 'success', vi: 'Đã đổi lịch theo phương án mới', en: 'Switched to the new plan', bodyVi: `${option.kept.length} giữ, ${option.added.length} thêm, ${option.dropped.length} bỏ.`, bodyEn: `${option.kept.length} kept, ${option.added.length} added, ${option.dropped.length} dropped.`, to: `/app/trips/${trip.id}/live` })
        toast('success', tr('Đã cập nhật lịch trình', 'Itinerary updated'), tr(`${option.kept.length} điểm giữ lại, ${option.added.length} thêm mới, ${option.dropped.length} bỏ.`, `${option.kept.length} kept, ${option.added.length} added, ${option.dropped.length} dropped.`), { label: tr('Hoàn tác', 'Undo'), run: () => save.mutate({ ...previous, version: saved.version }) })
      },
    })
    track({ type: 'replan_accepted', city: trip.city, reason: event.disruption.kind, lambda: option.lambda, tripId: trip.id })
    addLog(tr('Đã áp dụng phương án mới', 'Applied the new plan'), 'ok', now)
    setSheet(false)
    patchLive(trip.id, { pending: null, snoozedUntil: undefined, suppressed: [...live.suppressed, incidentKey(event.disruption)] })
    if (event.disruption.kind === 'weather') useWeatherStore.getState().clearOverride()
  }

  /** UC 3.7: keep the plan as it is; the same incident is not raised again. */
  const dismiss = () => {
    if (!pending) return
    track({ type: 'replan_dismissed', city: trip.city, reason: pending.disruption.kind, tripId: trip.id })
    setSheet(false)
    patchLive(trip.id, { pending: null, snoozedUntil: undefined, suppressed: [...live.suppressed, incidentKey(pending.disruption)] })
    if (pending.disruption.kind === 'weather') useWeatherStore.getState().clearOverride()
    addLog(tr('Bạn giữ nguyên lịch hiện tại', 'You kept the current plan'), 'ok', now)
    toast('info', tr('Lịch trình giữ nguyên', 'Plan unchanged'), tr('Journie sẽ không hỏi lại về sự cố này.', 'Journie will not ask about this incident again.'))
    notify({ kind: 'info', vi: 'Bạn đã giữ lịch hiện tại', en: 'You kept the current plan', to: `/app/trips/${trip.id}/live` })
  }

  const remindLater = () => {
    setSheet(false)
    patchLive(trip.id, { snoozedUntil: now + 15 })
    toast('info', tr('Sẽ nhắc lại sau 15 phút', 'Will remind you in 15 minutes'))
  }

  const complete = () => {
    save.mutate({ ...trip, status: 'completed' })
    clearLive(trip.id)
    track({ type: 'trip_completed', city: trip.city, tripId: trip.id })
    toast('success', tr('Xong chuyến rồi!', 'Trip done!'), tr('Hẹn bạn chuyến sau nha.', 'See you on the next one.'))
  }

  const setMode = (next: LiveMode) => {
    if (next === 'gps') setAsking(true)
    else patchLive(trip.id, { mode: 'demo' })
  }

  return (
    <>
      <PageHeader
        kicker={
          <Link to={`/app/trips/${trip.id}`} onClick={go(`/app/trips/${trip.id}`, 'back')} className="inline-flex items-center gap-1.5 hover:underline">
            <ArrowLeft size={14} aria-hidden="true" /> {tr('Về lịch trình', 'Back to itinerary')}
          </Link>
        }
        title={tripTitle(trip, language)}
        titleName="trip-title"
        subtitle={gps ? tr(`${city.name} · theo vị trí thật của bạn.`, `${city.nameEn} · following your real position.`) : tr(`${city.name} · đồng hồ giả lập, tua nhanh được.`, `${city.nameEn} · simulated clock, fast-forward as you like.`)}
        actions={
          <>
            <Segmented
              label={tr('Cách theo dõi', 'Tracking mode')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'gps', label: tr('Vị trí thật', 'Real position') },
                { value: 'demo', label: tr('Mô phỏng', 'Demo') },
              ]}
            />
            {!gps && (
              <>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}>
                  {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                  {playing ? tr('Tạm dừng', 'Pause') : tr('Tiếp tục', 'Resume')}
                </button>
                <Segmented label={tr('Tốc độ mô phỏng', 'Simulation speed')} value={speed} onChange={setSpeed} options={SPEEDS.map((item) => ({ value: item.id, label: item.label }))} />
              </>
            )}
            {trip.status === 'live' && (
              <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={() => setCancelling(true)}>
                <Ban size={15} aria-hidden="true" /> {tr('Huỷ chuyến', 'Cancel trip')}
              </button>
            )}
          </>
        }
      />

      {gps && problem && (
        <p role="alert" className="mb-5 flex flex-wrap items-center gap-3 border-l-4 border-sun bg-sun/12 px-4 py-3 text-sm text-ink/80">
          <span className="min-w-0 flex-1">{tr(...locationProblemText(problem))}</span>
          <button type="button" className="btn-ghost btn-sm" onClick={() => patchLive(trip.id, { mode: 'demo' })}>
            {tr('Chuyển sang mô phỏng', 'Switch to demo')}
          </button>
        </p>
      )}

      <AnimatePresence>
        {autoChange && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-firuze/50 bg-firuze/10 p-4"
          >
            <Zap size={20} className="shrink-0 text-jade-ink" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold text-ink">
                {tr('Journie đã tự chỉnh phần còn lại của ngày', 'Journie adjusted the rest of the day')} ({vi ? disruptionMeta[autoChange.disruption.kind].vi : disruptionMeta[autoChange.disruption.kind].en})
              </p>
              <p className="text-ink/70">
                {tr(`${autoChange.option.kept.length} điểm giữ, ${autoChange.option.added.length} thêm, ${autoChange.option.dropped.length} bỏ · kết thúc lúc ${fmtClock(autoChange.option.endTime)}`, `${autoChange.option.kept.length} kept, ${autoChange.option.added.length} added, ${autoChange.option.dropped.length} dropped · ends at ${fmtClock(autoChange.option.endTime, false)}`)}
                {autoChange.option.dropped.length > 0 && ` · ${tr('bỏ', 'dropped')}: ${autoChange.option.dropped.map((poiId) => place.nameOf(poiId)).join(', ')}`}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                save.mutate({ ...autoChange.previous, version: trip.version })
                setAutoChange(null)
                toast('info', tr('Đã hoàn tác', 'Undone'))
              }}
            >
              <Undo2 size={15} aria-hidden="true" /> {tr('Hoàn tác', 'Undo')}
            </button>
            <button type="button" className="grid size-9 place-items-center text-ink/45 hover:text-ink" onClick={() => setAutoChange(null)} aria-label={tr('Đóng', 'Dismiss')}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {event && !sheet && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } }}
            exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.18, ease: 'easeIn' } }}
            className="mb-6 flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-sun/70 bg-gradient-to-r from-sun/25 via-sun/10 to-transparent p-4 shadow-[0_18px_38px_-22px_rgba(240,185,75,0.9)]"
          >
            <motion.span
              className="grid size-12 shrink-0 place-items-center rounded-full bg-sun text-night"
              initial={{ scale: 0.4, rotate: 0 }}
              animate={{ scale: 1, rotate: [0, -14, 12, -8, 5, 0] }}
              transition={{ scale: { type: 'spring', stiffness: 420, damping: 16, delay: 0.1 }, rotate: { duration: 0.6, delay: 0.3, ease: 'easeInOut' } }}
            >
              <Siren size={22} aria-hidden="true" />
              <span className="pulse-dot absolute size-12 rounded-full text-sun" aria-hidden="true" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{tr('Lưu ý: ', 'Heads up: ')}{vi ? disruptionMeta[event.disruption.kind].vi : disruptionMeta[event.disruption.kind].en}</p>
              <p className="text-sm text-ink/70">{describeDisruption(event.disruption, vi)}</p>
              <p className="tabular mt-0.5 text-xs text-ink/55">
                {tr('Đề xuất tự hết hạn sau', 'This proposal expires in')} {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </p>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={remindLater}>
              {tr('Nhắc sau', 'Remind me later')}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={dismiss}>
              {tr('Giữ lịch hiện tại', 'Keep current plan')}
            </button>
            <button type="button" className="btn-gold btn-sm" onClick={() => setSheet(true)}>
              <Zap size={15} aria-hidden="true" /> {tr('Xem phương án', 'Review options')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Stagger className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" gap={0.12} delay={0.12}>
        <motion.div variants={leftColumn} className="space-y-5 xl:sticky xl:top-6">
          <motion.div variants={riseItem} className="panel relative overflow-hidden">
            <RouteMap stops={stops} center={city} me={where.me} meAccuracy={gps ? fix?.accuracy : undefined} recenterKey={recenter} activeUid={activeUid ?? stops[where.index]?.uid} onSelect={setActiveUid} className="h-[26rem] w-full" />
            {gps && fix && (
              <button type="button" onClick={() => setRecenter((value) => value + 1)} className="absolute right-3 top-3 z-[500] grid size-10 place-items-center rounded-full bg-paper/95 text-lapis shadow-lg" aria-label={tr('Về vị trí của tôi', 'Centre on me')} title={tr('Về vị trí của tôi', 'Centre on me')}>
                <LocateFixed size={18} />
              </button>
            )}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] flex flex-wrap items-end justify-between gap-2">
              <div className="pointer-events-auto rounded-xl bg-night/90 px-4 py-3 text-paper shadow-xl">
                <p className="tabular text-[1.7rem] font-bold leading-none text-gold">
                  {fmtTime(now)}
                  {now > DAY_MINUTES && <span className="ml-1.5 text-[0.75rem] font-semibold">{nextDayTag(vi)}</span>}
                </p>
                <p className="mt-1 text-[0.7rem] text-paper/60">{gps ? (fix ? tr(`Sai số ~${Math.round(fix.accuracy)} m`, `Accuracy ~${Math.round(fix.accuracy)} m`) : tr('Đang tìm vị trí…', 'Finding you…')) : tr('Giờ mô phỏng', 'Simulated time')}</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${status}-${(current ?? nextStop).uid}`}
                  className="pointer-events-auto max-w-[17rem] rounded-xl bg-paper/95 px-4 py-3 shadow-xl"
                  initial={status === 'at' ? { opacity: 0, y: 16, scale: 0.85 } : { opacity: 0, x: 36 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1, transition: SPRING }}
                  exit={{ opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.15, ease: 'easeIn' } }}
                >
                  <p className="flex items-center gap-1.5 text-[0.7rem] font-bold text-lapis">
                    <Navigation size={12} aria-hidden="true" />
                    {finished
                      ? tr('Đã hoàn thành lịch hôm nay', 'Day complete')
                      : where.phase === 'visiting'
                        ? tr('Đang ở', 'Now at')
                        : where.phase === 'before'
                          ? tr('Sắp xuất phát', 'About to start')
                          : freeUntil > 0
                            ? tr(`Còn ${fmtMinutes(freeUntil, true)} tự do trước khi đến`, `${fmtMinutes(freeUntil, false)} free before`)
                            : tr('Đang đến', 'Heading to')}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">{place.nameOf((current ?? nextStop).poiId)}</p>
                  {!finished && where.phase !== 'visiting' && (
                    <p className="tabular text-xs text-ink/55">
                      {freeUntil > 0 ? `${tr('Bắt đầu lúc', 'Starts at')} ${fmtClock(nextStop.start, vi)}` : etaMin !== null ? tr(`Còn khoảng ${etaMin} phút`, `About ${etaMin} min away`) : `${tr('Dự kiến đến', 'ETA')} ${fmtClock(nextStop.start, vi)}`}
                    </p>
                  )}
                  {where.phase === 'visiting' && current && <p className="tabular text-xs text-ink/55">{tr('Còn', 'Left')} {fmtMinutes(Math.max(0, current.end - now), vi)}</p>}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div variants={riseItem} className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="panel flex items-center gap-5 p-5">
              <TimeRing value={elapsed} label={fmtMinutes(Math.max(0, trip.dayEnd - now), vi)} sub={tr('còn lại hôm nay', 'left today')} />
              <dl className="space-y-1.5 text-sm">
                <div>
                  <dt className="text-[0.7rem] text-ink/50">{tr('Đã xong', 'Done')}</dt>
                  <dd className="tabular font-bold">{doneCount}/{stops.length}</dd>
                </div>
                <div>
                  <dt className="text-[0.7rem] text-ink/50">{tr('Dư thời gian', 'Slack')}</dt>
                  <dd className={`tabular font-bold ${slack < 30 ? 'text-pomegranate' : 'text-jade-ink'}`}>{fmtMinutes(Math.max(0, slack), vi)}</dd>
                </div>
              </dl>
            </div>

            <div className="panel p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Radar size={16} className="text-lapis" aria-hidden="true" /> {tr('Nhật ký theo dõi', 'Monitor log')}
              </h2>
              <ul className="mt-3 space-y-1.5" aria-live="polite">
                {log.length === 0 && <li className="text-xs text-ink/50">{tr('Chưa có gì mới.', 'Nothing new yet.')}</li>}
                <AnimatePresence initial={false}>
                  {log.map((line) => (
                    <motion.li
                      key={line.id}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      transition={{ layout: { duration: 0.3, ease: EASE_OUT } }}
                      className="flex gap-2 text-xs"
                    >
                      <span className="tabular w-10 shrink-0 text-ink/45">{fmtTime(line.at)}</span>
                      <span className={line.tone === 'warn' ? 'font-semibold text-sun-ink' : 'text-ink/70'}>{line.text}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>

          {gps ? (
            <motion.div variants={riseItem} className="panel p-5 text-sm text-ink/70">
              <h2 className="text-sm font-bold text-ink">{tr('Theo dõi sự cố', 'Incident watch')}</h2>
              {incidents.isError ? (
                <p className="mt-1">{tr('Chưa đọc được sự cố từ máy chủ; Journie thử lại sau một phút.', 'Could not read incidents from the server; Journie tries again in a minute.')}</p>
              ) : incidents.data?.available ? (
                <p className="mt-1">{tr('Journie đang kiểm tra giao thông, thời tiết và giờ mở cửa mỗi phút.', 'Journie checks traffic, weather and opening hours every minute.')}</p>
              ) : (
                <p className="mt-1">{tr('Máy chủ chưa có API phát hiện sự cố, nên ở chế độ vị trí thật chưa có cảnh báo tự động. Chuyển sang “Mô phỏng” để thử luồng đổi lịch.', 'The server has no incident API yet, so real-position mode has no automatic alerts. Switch to “Demo” to try the replanning flow.')}</p>
              )}
            </motion.div>
          ) : (
            <motion.div variants={riseItem} className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">{tr('Thử một sự cố', 'Try a disruption')}</h2>
                  <p className="text-xs text-ink/55">{tr('Mô phỏng điều kiện thay đổi giữa chuyến đi. Trễ nhỏ được tự chỉnh nếu bạn bật trong Hồ sơ.', 'Simulate conditions changing mid-trip. Small delays are adjusted on their own if that is on in your profile.')}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                  {tr('Tự động', 'Auto')}
                  <Switch checked={autoSim} onChange={setAutoSim} label={tr('Tự động giả lập sự cố', 'Auto-simulate disruptions')} />
                </label>
              </div>
              <motion.div variants={buttonRow} className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {(
                  [
                    { icon: TrafficCone, vi: 'Kẹt xe', en: 'Traffic', d: { kind: 'traffic', minutes: 25 } as Disruption },
                    { icon: 'rain', vi: 'Mưa lớn', en: 'Heavy rain', d: { kind: 'weather', until: now + 90 } as Disruption },
                    { icon: Store, vi: 'Đóng cửa', en: 'Closure', d: (stops.find((stop) => stop.start > now) ? { kind: 'closure', poiId: stops.find((stop) => stop.start > now)!.poiId } : null) as Disruption | null },
                    { icon: Timer, vi: 'Trễ 30′', en: 'Late 30′', d: { kind: 'delay', minutes: 30 } as Disruption },
                    { icon: Timer, vi: 'Trễ 10′', en: 'Late 10′', d: { kind: 'delay', minutes: 10 } as Disruption },
                  ] as const
                ).map((item) => {
                  const disabled = !item.d || !!event || finished
                  return (
                    <motion.button
                      key={item.vi}
                      type="button"
                      variants={buttonPop}
                      disabled={disabled}
                      whileHover={canPointerFx && !disabled ? { y: -4, transition: { duration: 0.2, ease: EASE_OUT } } : undefined}
                      whileTap={disabled ? undefined : { scale: 0.95 }}
                      onClick={() => item.d && inject(item.d)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-forest/15 bg-white/70 px-2 py-3 text-xs font-semibold text-ink/80 transition-[border-color,background-color,opacity] duration-300 hover:border-sun hover:bg-sun/10 disabled:opacity-40"
                    >
                      {item.icon === 'rain' ? <WeatherIcon kind="rain" size={28} /> : <item.icon size={20} className="text-sun-ink" aria-hidden="true" />}
                      {tr(item.vi, item.en)}
                    </motion.button>
                  )
                })}
              </motion.div>
              {live.suppressed.length > 0 && (
                <button type="button" className="mt-3 text-xs font-semibold text-lapis hover:underline" onClick={() => patchLive(trip.id, { suppressed: [] })}>
                  {tr('Cho phép báo lại các sự cố đã bỏ qua', 'Allow dismissed incidents again')}
                </button>
              )}
            </motion.div>
          )}
        </motion.div>

        <motion.section variants={riseItem} className="panel p-4 sm:p-5" aria-label={tr('Tiến độ hôm nay', "Today's progress")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h-display text-xl text-forest">{tr('Hôm nay', 'Today')}</h2>
            <span className="tabular text-xs text-ink/55">{fmtSpan(trip.dayStart, trip.dayEnd, vi)}</span>
          </div>
          <Timeline
            stops={stops}
            readOnly
            nowMinutes={now}
            date={addDays(trip.startDate, dayIndex)}
            activeUid={activeUid}
            onSelect={(uid) => {
              setActiveUid(uid)
              const stop = stops.find((entry) => entry.uid === uid)
              if (stop) openPoi(stop.poiId)
            }}
          />
          <AnimatePresence>
            {finished && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                className="mt-6 rounded-xl bg-gradient-to-br from-firuze/20 to-gold/20 p-5 text-center"
              >
                <motion.span
                  className="block w-fit mx-auto origin-bottom-left"
                  initial={{ opacity: 0, y: 10, rotate: -25 }}
                  animate={{ opacity: 1, y: 0, rotate: [-25, 10, -5, 0] }}
                  transition={{ opacity: { duration: 0.3, delay: 0.2 }, y: { ...SPRING, delay: 0.2 }, rotate: { duration: 0.8, delay: 0.2, ease: 'easeOut' } }}
                >
                  <Flag size={26} className="text-lapis" aria-hidden="true" />
                </motion.span>
                <p className="h-display mt-2 text-xl text-forest">{tr('Bạn đã đi hết lịch trình hôm nay!', 'You finished the day’s itinerary!')}</p>
                <p className="mt-1 text-sm text-ink/65">{money(stops.reduce((s, stop) => s + (poiById[stop.poiId]?.cost ?? 0) + stop.travelCost, 0))} · {stops.length} {tr('điểm', 'stops')}</p>
                {dayIndex === trip.days.length - 1 ? (
                  <button type="button" className="btn-gold mt-4" onClick={complete} disabled={trip.status === 'completed'}>
                    <Check size={17} aria-hidden="true" /> {trip.status === 'completed' ? tr('Đã hoàn thành', 'Completed') : tr('Kết thúc chuyến đi', 'Finish the trip')}
                  </button>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </Stagger>

      <ReplanSheet
        open={sheet}
        onClose={() => setSheet(false)}
        trip={trip}
        dayIndex={dayIndex}
        event={event}
        result={result}
        chosen={chosen}
        lambda={lambda}
        setLambda={setLambda}
        onApply={apply}
        onDismiss={dismiss}
        locale={locale}
      />
      <LocationPermissionSheet
        open={asking}
        onClose={() => {
          setAsking(false)
          if (!known) patchLive(trip.id, { mode: 'demo' })
        }}
        onGranted={() => {
          setAsking(false)
          patchLive(trip.id, { mode: 'gps' })
        }}
        onDemo={() => {
          setAsking(false)
          patchLive(trip.id, { mode: 'demo' })
        }}
      />
      <CancelTripSheet trip={trip} open={cancelling} onClose={() => setCancelling(false)} />
      <PoiSheet />
    </>
  )
}

function describeDisruption(disruption: Disruption, vi: boolean) {
  switch (disruption.kind) {
    case 'traffic':
      return vi ? `Tuyến phía trước chậm khoảng ${disruption.minutes} phút so với dự kiến.` : `The route ahead is about ${disruption.minutes} minutes slower than planned.`
    case 'weather':
      return vi ? `Mưa lớn đến ${fmtClock(disruption.until)}, các điểm ngoài trời không phù hợp.` : `Heavy rain until ${fmtClock(disruption.until, false)}; outdoor stops are not a good fit.`
    case 'closure':
      return vi ? `${placeNameOf(disruption.poiId, 'vi')} đóng cửa đột xuất.` : `${placeNameOf(disruption.poiId, 'en')} has closed unexpectedly.`
    case 'delay':
      return vi ? `Bạn đang trễ ${disruption.minutes} phút so với lịch.` : `You are ${disruption.minutes} minutes behind schedule.`
  }
}

function TimeRing({ value, label, sub }: { value: number; label: string; sub: string }) {
  const size = 112
  const radius = 46
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${sub}`}>
      <svg viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-forest/10" />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value) }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4fb8a4" />
            <stop offset="1" stopColor="#f0b94b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="tabular text-[0.95rem] font-bold leading-tight text-forest">{label}</p>
          <p className="text-[0.6rem] text-ink/50">{sub}</p>
        </div>
      </div>
    </div>
  )
}

/* ───────── replanning ───────── */

type ReplanProps = {
  open: boolean
  onClose: () => void
  trip: Trip
  dayIndex: number
  event: { disruption: Disruption; at: number } | null
  result: ReturnType<typeof replanDay> | null
  chosen: ReplanOption | null
  lambda: number
  setLambda: (value: number) => void
  onApply: (option: ReplanOption) => void
  onDismiss: () => void
  locale: string
}

function ReplanSheet({ open, onClose, event, result, chosen, lambda, setLambda, onApply, onDismiss }: ReplanProps) {
  const { tr, place, language } = useTr()
  const vi = language === 'vi'
  if (!event || !result) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const base = result.baseline
  const presetName = (id: ReplanOption['id']) => ({ keep: tr('Giữ gần như nguyên', 'Keep it close'), balanced: tr('Cân bằng', 'Balanced'), fresh: tr('Trải nghiệm tốt nhất', 'Best experience'), custom: tr('Theo ý bạn', 'Your mix') })[id]
  const names = (ids: string[]) => ids.map((poiId) => place.nameOf(poiId))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={tr('Phương án điều chỉnh', 'Replanning options')}
      description={describeDisruption(event.disruption, vi)}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-ghost btn-sm" onClick={onDismiss}>
            {tr('Giữ lịch hiện tại', 'Keep current plan')}
          </button>
          <button type="button" className="btn-gold btn-sm" disabled={!chosen} onClick={() => chosen && onApply(chosen)}>
            <Check size={15} aria-hidden="true" /> {tr('Áp dụng phương án này', 'Apply this option')}
          </button>
        </div>
      }
    >
      <div className="rounded-xl border border-pomegranate/30 bg-pomegranate/6 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-pomegranate">
          <AlertTriangle size={16} aria-hidden="true" />
          {base.violations.length ? tr('Nếu giữ nguyên lịch cũ', 'If you keep the original plan') : tr('Lịch cũ vẫn khả thi nhưng có thể trễ', 'The original still works but may run late')}
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink/75">
          {base.violations.map((violation) => (
            <li key={violation.uid + violation.detail}>{vi ? violation.detail : violation.detailEn}</li>
          ))}
          <li className="tabular">
            {tr('Kết thúc lúc', 'Ends at')} {fmtClock(base.endTime, vi)}
          </li>
        </ul>
      </div>

      <section className="mt-6" aria-labelledby="lambda-title">
        <h3 id="lambda-title" className="text-sm font-bold text-ink">
          {tr('Bạn muốn ưu tiên điều gì?', 'What matters more to you?')}
        </h3>
        <div className="mt-2 flex items-center justify-between text-[0.72rem] font-semibold text-ink/55">
          <span>{tr('Trải nghiệm tốt nhất', 'Best experience')}</span>
          <span>{tr('Giữ lịch ổn định', 'Keep things stable')}</span>
        </div>
        <input
          type="range"
          className="range"
          min={0}
          max={3}
          step={0.05}
          value={lambda}
          aria-label="λ"
          style={{ ['--fill' as string]: `${(lambda / 3) * 100}%` }}
          onChange={(inputEvent) => setLambda(Number(inputEvent.target.value))}
        />
        <div className="mt-1 flex flex-wrap gap-2">
          {LAMBDAS.map((preset) => (
            <button key={preset.id} type="button" className={`chip ${Math.abs(lambda - preset.lambda) < 0.03 ? 'chip-on' : ''}`} onClick={() => setLambda(preset.lambda)}>
              {presetName(preset.id)}
            </button>
          ))}
        </div>

      </section>

      {chosen ? (
        <motion.section key={chosen.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6" aria-label={presetName(chosen.id)}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { v: chosen.kept.length, l: tr('Giữ lại', 'Kept'), c: 'text-lapis' },
              { v: chosen.added.length, l: tr('Thêm mới', 'Added'), c: 'text-jade-ink' },
              { v: chosen.dropped.length, l: tr('Bỏ', 'Dropped'), c: 'text-pomegranate' },
            ].map((item) => (
              <div key={item.l} className="panel p-3">
                {/* Keyed by the count so moving the slider makes the changed number pop. */}
                <motion.p key={item.v} className={`h-display text-3xl tabular ${item.c}`} initial={{ opacity: 0, scale: 0.6, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 480, damping: 20 }}>
                  {item.v}
                </motion.p>
                <p className="text-[0.7rem] text-ink/55">{item.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden border border-forest/15">
            <RouteMap stops={chosen.stops} ghost={base.stops} className="h-48 w-full" />
            <p className="flex flex-wrap gap-x-4 bg-paper px-3 py-1.5 text-[0.7rem] text-ink/60">
              <span>
                <span className="mr-1 inline-block h-0.5 w-5 bg-forest align-middle" aria-hidden="true" />
                {tr('Phương án mới', 'New option')}
              </span>
              <span>
                <span className="mr-1 inline-block w-5 border-t-2 border-dashed border-ink/40 align-middle" aria-hidden="true" />
                {tr('Lịch hiện tại', 'Current plan')}
              </span>
            </p>
          </div>
          <motion.ol className="mt-4 space-y-1.5" variants={replanList} initial="hidden" animate="show">
            {chosen.dropped.length > 0 && (
              <li className="rounded-lg bg-pomegranate/8 px-3 py-2 text-sm text-pomegranate line-through decoration-pomegranate/60">{names(chosen.dropped).join(', ')}</li>
            )}
            {chosen.stops.map((stop) => {
              const isNew = chosen.added.includes(stop.poiId)
              return (
                <motion.li key={stop.uid} variants={replanRow} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isNew ? 'bg-firuze/15 font-semibold text-jade-ink' : 'bg-white/70 text-ink/80'}`}>
                  <span className="tabular w-11 shrink-0 text-xs text-ink/50">{fmtTime(stop.start)}</span>
                  <span className="min-w-0 flex-1 truncate">{place.nameOf(stop.poiId)}</span>
                  {isNew && <span className="rounded-full bg-firuze px-2 py-0.5 text-[0.65rem] font-bold text-white">{tr('Mới', 'New')}</span>}
                  {stop.locked && <span className="rounded-full bg-lapis/10 px-2 py-0.5 text-[0.65rem] font-bold text-lapis">{tr('Bắt buộc', 'Locked')}</span>}
                </motion.li>
              )
            })}
          </motion.ol>
          <p className="tabular mt-3 text-xs text-ink/55">
            {tr('Kết thúc lúc', 'Ends at')} {fmtClock(chosen.endTime, vi)} · {tr('di chuyển', 'travel')} {chosen.travelMin} {tr('phút', 'min')}
          </p>
        </motion.section>
      ) : (
        <p className="mt-6 rounded-xl bg-sun/15 p-4 text-sm text-ink/75">{tr('Không kịp rồi. Giữ lịch cũ hoặc bỏ bớt một điểm.', 'No time left. Keep the old plan or drop a stop.')}</p>
      )}
    </Sheet>
  )
}
