import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Copy, FilePlus, FolderOpen, Heart, Hourglass, ListChecks, Loader2, Lock, Minus, Plus, Sparkles, TriangleAlert, Wand2, X } from 'lucide-react'
import { apiErrorText, dayWindowText, KNOWN_TOPICS } from '../../api/errorText'
import { analyzeRequest, generateItinerary, saigonToday, type PlanReport } from '../../api/planner'
import { readProfile } from '../../api/profile'
import { useCatalog, useCreateTrip, useProfile, useSets } from '../../api/queries'
import { inCity } from '../../api/catalog'
import { ModuleGate } from '../../components/ModuleGate'
import { RetrievalResults } from '../../components/recommend/RetrievalResults'
import { BlankTripSheet, CloneTripSheet } from '../../components/trip/CreateTripSheets'
import { PoiSheet } from '../../components/place/PoiSheet'
import { Sheet } from '../../components/ui/Sheet'
import { CategoryGlyph } from '../../components/ui/primitives'
import { CityCover } from '../../components/CityCover'
import { CitySlideshow } from '../../components/CitySlideshow'
import { EASE_OUT, popItem, slideItem } from '../../components/motion/variants'
import { Segmented } from '../../components/ui/primitives'
import { PageHeader } from '../../components/PageHeader'
import { conflictLabel, DEFAULT_DAY_END, DEFAULT_DAY_START, forRetrieval, intentFromExtraction } from '../../domain/intentFromExtraction'
import type { Extraction } from '../../domain/extraction'
import type { FormValues } from '../../domain/mergeExtraction'
import { DEFAULT_BUDGET } from '../../domain/planner'
import { cities, cityById, poiById } from '../../domain/pois'
import { MAX_JOURNEY_DAYS, suggestLegs, type Leg } from '../../domain/journey'
import { addDays, DAY_MINUTES, dayEndAfter, daysBetween, dayWindowProblem, fmtTime, formatVnd, hm, nextDayTag } from '../../domain/time'
import { MAX_TRIP_DAYS, type Intent } from '../../domain/nlp'
import type { CityId, Pace, TransportPref, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { useCityStore } from '../../store/cityStore'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

type Phase = 'compose' | 'review' | 'generating'

/** `dayStart`/`dayEnd` are the day's hours as the time inputs hold them ('HH:MM'); an end at or before the start is the next day. The last day is `startDate` + `days` - 1. */
/** `city` and `days` are the first (or only) leg; `more` are the cities visited after it, in order (a journey, `domain/journey.ts`). */
type Params = { city: CityId; days: number; more: Leg[]; startDate: string; budget: number; dayStart: string; dayEnd: string; pace: Pace; transport: TransportPref }

/** The days of the legs after the first: every leg has the same hours, so a day's limits count them too. */
const laterDays = (params: Params) => params.more.reduce((sum, leg) => sum + leg.days, 0)
/** Every day of the trip, the legs after the first included. */
const journeyDays = (params: Params) => params.days + laterDays(params)

/** What is wrong with the day's hours the form shows, for the whole journey (a 1-day leg followed by another still has a night between); null when they can be planned. */
const hoursProblem = (params: Params) => dayWindowProblem(hm(params.dayStart), dayEndAfter(hm(params.dayStart), hm(params.dayEnd)), journeyDays(params))

/** Extra wishes only: the destination, dates, length and budget are picked above, so the examples never repeat them. */
const EXAMPLES: [string, string][] = [
  ['Đi chậm, ăn nhiều món địa phương.', 'Slow pace, lots of local food.'],
  ['Mê cà phê, không ăn hải sản.', 'Coffee lover, no seafood.'],
]

const BUDGET_PRESETS = [1_000_000, 2_000_000, 3_000_000, 5_000_000]

const STAGES = [
  { vi: 'Đọc yêu cầu', en: 'Reading your request' },
  { vi: 'Tìm địa điểm', en: 'Finding places' },
  { vi: 'Chọn chỗ hợp với bạn', en: 'Picking what fits you' },
  { vi: 'Chia theo ngày', en: 'Splitting by day' },
] as const

const ORDER: Record<Phase, number> = { compose: 0, review: 1, generating: 2 }

/** Child delays that stop growing after the eighth child, so long lists never keep anyone waiting. */
const cascade = (gap: number, start: number) => (i: number) => start + Math.min(i, 8) * gap

/** A step slides the way the traveler is heading (forward from the right, back from the left); on first open only its contents play. */
const step: Variants = {
  hidden: (dir: number) => ({ opacity: dir ? 0 : 1, x: dir * 64 }),
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE_OUT, delayChildren: cascade(0.09, 0.04) } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }),
}
const panel: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT, delayChildren: cascade(0.05, 0.16) } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, delayChildren: cascade(0.045, 0.1) } },
}
const fromRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}
/** City tiles keep their resting opacity class, so they only rise and grow while their panel fades in. */
const tile: Variants = {
  hidden: { y: 16, scale: 0.94 },
  show: { y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}
const lift: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
}
const HOVER_SPRING = { type: 'spring', stiffness: 420, damping: 30 } as const

export function PlanPage() {
  return (
    <ModuleGate id="planner">
      <Planner />
    </ModuleGate>
  )
}

function Planner() {
  const { tr, place } = useTr()
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const createTrip = useCreateTrip()
  const pickedCity = useCityStore((state) => state.city)
  const setPickedCity = useCityStore((state) => state.setCity)

  const [phase, setPhase] = useState<Phase>('compose')
  const [text, setText] = useState('')
  const [intent, setIntent] = useState<Intent | null>(null)
  // Places the traveler chose before generating (a saved set, several merged, picks from the recommendation); they become must-visits
  const routed = location.state as { wish?: string; poiIds?: string[]; setName?: string } | null
  const [params, setParams] = useState<Params>(() => {
    // Places in several cities start a journey: one leg per city in the collections' order, days by how many places each has
    const legs = routed?.poiIds?.length ? suggestLegs(routed.poiIds) : []
    const first = legs[0] ?? { city: pickedCity, days: 2 }
    return { city: first.city, days: legs.length > 1 ? first.days : 2, more: legs.slice(1), startDate: saigonToday(), budget: DEFAULT_BUDGET, dayStart: fmtTime(DEFAULT_DAY_START), dayEnd: fmtTime(DEFAULT_DAY_END), pace: profile.pace, transport: profile.transport }
  })
  const [stage, setStage] = useState(0)
  const autoRan = useRef(false)
  // A journey started from merged collections begins in its first city, so the backdrop and that city's places follow it
  useEffect(() => {
    if (params.city !== pickedCity) setPickedCity(params.city)
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [picked, setPicked] = useState<{ ids: string[]; from?: string }>(() => ({ ids: routed?.poiIds ?? [], from: routed?.setName }))
  const [start, setStart] = useState<'blank' | 'clone' | null>(null)
  // Which way the last step change went; 0 until the first change, so opening the page does not slide.
  const [shown, setShown] = useState<{ phase: Phase; dir: number }>({ phase, dir: 0 })
  if (shown.phase !== phase) setShown({ phase, dir: Math.sign(ORDER[phase] - ORDER[shown.phase]) })

  /** The basics the traveler changed in the form; those stay as picked, the others follow what they wrote. A new length is a picked last day. */
  const touched = useRef<Partial<Record<'startDate' | 'endDate' | 'budget' | 'dayStart' | 'dayEnd', boolean>>>({})
  const setFormParams = (value: Params) => {
    for (const key of ['startDate', 'budget', 'dayStart', 'dayEnd'] as const) if (value[key] !== params[key]) touched.current[key] = true
    if (value.days !== params.days) touched.current.endDate = true
    if (value.city !== params.city) setPickedCity(value.city)
    setParams(value)
  }
  // Whether the city has places: 0 once its catalogue has loaded means none yet, so planning there is held back
  const cityEmpty = useCatalog(params.city).data === 0

  const analyze = useMutation({
    mutationFn: ({ text: extra, form, city, later }: { text: string; form?: FormValues; city: CityId; later: number }) => analyzeRequest(extra, form, touched.current, city, later),
    onSuccess: (result) => {
      setIntent(result)
      if (result.city) setPickedCity(result.city)
      // The model's reading fills the form in; what the traveler changed there was already kept over it.
      setParams((current) => ({
        ...current,
        city: result.city ?? current.city,
        days: result.days ?? current.days,
        startDate: result.startDate ?? current.startDate,
        budget: result.budget ?? current.budget,
        dayStart: result.dayStart !== undefined ? fmtTime(result.dayStart) : current.dayStart,
        dayEnd: result.dayEnd !== undefined ? fmtTime(result.dayEnd) : current.dayEnd,
        pace: result.pace ?? profile.pace,
        transport: result.transport ?? profile.transport,
      }))
      setPhase('review')
    },
    onError: (error) => toast('danger', tr('Mình chưa đọc được câu này', 'I could not read that'), tr(...apiErrorText(error))),
  })

  /** What the trip stores as the original request: the picked basics, then the extra wishes. */
  const requestText = [`${cityById[params.city].name} ${params.days} ngày, ${formatVnd(params.budget)}`, text.trim()].filter(Boolean).join('. ')

  const generate = useMutation({
    mutationFn: async (): Promise<PlanReport[]> => {
      const legs: Leg[] = [{ city: params.city, days: params.days }, ...params.more]
      const total = legs.reduce((sum, leg) => sum + leg.days, 0)
      const reports: PlanReport[] = []
      let startDate = params.startDate
      // Each leg is planned on its own, like a one-city trip, on the days after the leg before it; the budget is shared by days
      for (const leg of legs) {
        const said = leg.city === params.city ? intent! : intentFor(intent!, leg.city)
        const must = picked.ids.filter((id) => poiById[id]?.city === leg.city)
        const legText = legs.length > 1 ? [`${cityById[leg.city].name} ${leg.days} ngày`, text.trim()].filter(Boolean).join('. ') : requestText
        const budget = legs.length > 1 ? Math.round((params.budget * leg.days) / total) : params.budget
        reports.push(await generateItinerary({ text: legText, userId: user.id, profile, overrides: { ...params, city: leg.city, days: leg.days, startDate, budget } }, { ...said, mustInclude: [...new Set([...said.mustInclude, ...must])] }))
        startDate = addDays(startDate, leg.days)
      }
      return reports
    },
    onSuccess: (reports) => {
      const notFound = [...new Set(reports.flatMap((report) => report.notFound))]
      const unplaced = reports.flatMap((report) => report.unplaced)
      if (notFound.length) toast('warning', tr('Mình không thấy mấy chỗ này', 'I could not find these places'), notFound.join(', '))
      if (unplaced.length) toast('warning', tr('Chưa xếp được mấy chỗ này', 'These places did not fit'), unplaced.map((id) => place.nameOf(id)).join(', '))
      if ((reports[0].intent.interests.nightlife ?? 0) > 0 && !reports.some((report) => report.trip.days.some((day) => day.stops.some((stop) => poiById[stop.poiId]?.evening)))) {
        toast('warning', tr('Chưa xếp được quán bar', 'No bar fits this plan'), tr('Không có quán nào mở từ 18:00 trong khung giờ này.', 'None is open from 18:00 within these hours.'))
      }
    },
    onError: (error) => {
      toast('danger', tr('Chưa lên được lịch, thử lại nha', 'Could not build the plan, try again'), tr(...apiErrorText(error)))
      setPhase('review')
    },
  })

  // A wish typed on the dashboard arrives in router state and starts analysis immediately.
  useEffect(() => {
    const wish = (location.state as { wish?: string } | null)?.wish
    if (wish && !autoRan.current) {
      autoRan.current = true
      setText(wish)
      analyze.mutate({ text: wish, city: params.city, later: laterDays(params) })
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The corner Journie steps aside while the waiting screen plays its city photos, and the sky and header loops hold still (busy-screen in app.css)
  const setBusyScreen = useUiStore((state) => state.setBusyScreen)
  useEffect(() => {
    if (phase !== 'generating') return
    setBusyScreen(true)
    document.documentElement.classList.add('busy-screen')
    return () => {
      setBusyScreen(false)
      document.documentElement.classList.remove('busy-screen')
    }
  }, [phase, setBusyScreen])

  // Reveal pipeline stages one by one; the last one stays in progress until the plan has arrived.
  const planReady = generate.isSuccess
  useEffect(() => {
    if (phase !== 'generating') return
    const last = planReady ? STAGES.length : STAGES.length - 1
    const timer = window.setInterval(() => setStage((value) => Math.min(last, value + 1)), 760)
    return () => window.clearInterval(timer)
  }, [phase, planReady])

  // Once the solver has answered, save the trip and open it: it is edited there.
  useEffect(() => {
    if (phase === 'generating' && stage >= STAGES.length && generate.isSuccess) {
      const timer = window.setTimeout(() => save(generate.data.map((report) => report.trip)), 450)
      return () => window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage, generate.isSuccess, generate.data])

  const run = () => {
    setStage(0)
    setPhase('generating')
    generate.mutate()
  }

  const reset = () => {
    setPhase('compose')
    setIntent(null)
    generate.reset()
    analyze.reset()
  }

  // The plan opens as a draft: the traveler looks it over and saves or discards it there (UC 2.12). The legs of a journey are saved
  // as one-city trips sharing a journey id, and the journey opens instead.
  const save = async (trips: Trip[]) => {
    const journeyId = trips.length > 1 ? `journey-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` : undefined
    try {
      const saved: Trip[] = []
      for (const [order, trip] of trips.entries()) saved.push(await createTrip.mutateAsync({ ...trip, status: 'draft', ...(journeyId ? { journeyId, journeyOrder: order } : {}) }))
      navigate(journeyId ? `/app/journeys/${journeyId}` : `/app/trips/${saved[0].id}`)
    } catch {
      toast('danger', tr('Chưa lưu được', 'Could not save'))
      setPhase('review')
    }
  }

  return (
    <>
      <PageHeader
        title={tr('Lên một chuyến đi', 'Plan a trip')}
        actions={
          phase === 'review' && (
            <button type="button" className="btn-ghost btn-sm" onClick={reset}>
              <ArrowLeft size={15} aria-hidden="true" />
              {tr('Sửa lại', 'Edit')}
            </button>
          )
        }
      />

      {/* Clips the sideways step slide inside the page gutter; `clip` keeps the sticky review aside working. */}
      <div className="-mx-4 overflow-x-clip px-4">
        <AnimatePresence mode="wait" custom={shown.dir}>
          {phase === 'compose' && (
            <motion.div key="compose" custom={shown.dir} variants={step} initial="hidden" animate="show" exit="exit">
              <StartChooser onBlank={() => setStart('blank')} onClone={() => setStart('clone')} />
              {picked.ids.length > 0 && (
                <div className="panel mb-6 px-5 pb-4 pt-1">
                  <PickedList picked={picked} cities={[params.city, ...params.more.map((leg) => leg.city)]} onChange={setPicked} />
                </div>
              )}
              <Composer text={text} setText={setText} params={params} setParams={setFormParams} busy={analyze.isPending} cityEmpty={cityEmpty} onSubmit={() => analyze.mutate({ text, form: { startDate: params.startDate, days: params.days, budget: params.budget, dayStart: params.dayStart, dayEnd: params.dayEnd }, city: params.city, later: laterDays(params) })} />
            </motion.div>
          )}
          {phase === 'review' && intent && (
            <motion.div key="review" custom={shown.dir} variants={step} initial="hidden" animate="show" exit="exit">
              <Review text={text} intent={intent} setIntent={setIntent} params={params} setParams={setParams} cityEmpty={cityEmpty} onGenerate={run} picked={picked} setPicked={setPicked} />
            </motion.div>
          )}
          {phase === 'generating' && (
            <motion.div key="generating" custom={shown.dir} variants={step} initial="hidden" animate="show" exit="exit">
              <Pipeline stage={stage} city={params.city} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BlankTripSheet open={start === 'blank'} onClose={() => setStart(null)} />
      <CloneTripSheet open={start === 'clone'} onClose={() => setStart(null)} />
      <PoiSheet />
    </>
  )
}

/** UC 2.5 "Create itinerary": three ways in. Writing a wish (below) is the AI way; the other two open a short form. */
function StartChooser({ onBlank, onClone }: { onBlank: () => void; onClone: () => void }) {
  const { tr } = useTr()
  const options = [
    { id: 'ai', icon: Wand2, title: tr('Tạo bằng AI', 'Generate with AI'), body: tr('Chọn điểm đến, nói điều bạn thích bên dưới.', 'Pick a destination and say what you like below.'), active: true },
    { id: 'blank', icon: FilePlus, title: tr('Bắt đầu trống', 'Start blank'), body: tr('Tự thêm từng nơi vào từng ngày.', 'Add each place to each day yourself.'), onClick: onBlank },
    { id: 'clone', icon: Copy, title: tr('Nhân bản chuyến cũ', 'Copy a trip'), body: tr('Dùng lại một lịch trình bạn đã có.', 'Reuse an itinerary you already have.'), onClick: onClone },
  ]
  return (
    <motion.div variants={panel} className="mb-6 grid gap-3 sm:grid-cols-3" role="group" aria-label={tr('Cách tạo lịch trình', 'How to create the itinerary')}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={option.onClick}
          aria-pressed={option.active ?? false}
          className={`panel flex items-start gap-3 p-4 text-left transition-colors ${option.active ? '!border-gold bg-gold/10' : 'hover:border-gold'}`}
        >
          <option.icon size={20} className={option.active ? 'text-sun-ink' : 'text-lapis'} aria-hidden="true" />
          <span>
            <span className="block text-sm font-bold text-ink">{option.title}</span>
            <span className="mt-0.5 block text-xs text-ink/60">{option.body}</span>
          </span>
        </button>
      ))}
    </motion.div>
  )
}

/**
 * The request as read, for another leg of a journey: the same wishes, looked up among that city's places. Places named in the request
 * belong to the city it was read for, so they stay with that leg.
 */
function intentFor(intent: Intent, city: CityId): Intent {
  return {
    ...intent,
    city,
    mustInclude: intent.mustInclude.filter((id) => poiById[id]?.city === city),
    extraction: intent.extraction && { ...intent.extraction, destination: cityById[city].destination, must_visit: [], preferred_places: [] },
  }
}

/* ───────── 1. compose ───────── */

/** The cities visited after the first, each for some days: a journey (`domain/journey.ts`). The first city is the one picked above. */
function NextLegs({ params, setParams }: { params: Params; setParams: (value: Params) => void }) {
  const { tr, language } = useTr()
  const name = (city: CityId) => (language === 'vi' ? cityById[city].name : cityById[city].nameEn)
  const room = MAX_JOURNEY_DAYS - journeyDays(params)
  const change = (index: number, leg: Leg | null) =>
    setParams({ ...params, more: leg ? params.more.map((entry, i) => (i === index ? leg : entry)) : params.more.filter((_, i) => i !== index) })
  const add = () => {
    const visited = [params.city, ...params.more.map((leg) => leg.city)]
    const next = cities.find((city) => !visited.includes(city.id)) ?? cities.find((city) => city.id !== visited.at(-1))!
    setParams({ ...params, more: [...params.more, { city: next.id, days: 1 }] })
  }
  return (
    <div className="mt-3">
      <AnimatePresence initial={false}>
        {params.more.map((leg, index) => (
          <motion.div
            key={index}
            className="mb-2 flex flex-wrap items-center gap-2 border border-forest/15 bg-white/70 px-3 py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <ArrowRight size={15} className="text-ink/45" aria-hidden="true" />
            <span className="text-xs font-semibold text-ink/55">{tr(`Chặng ${index + 2}`, `Leg ${index + 2}`)}</span>
            <select value={leg.city} onChange={(event) => change(index, { ...leg, city: event.target.value as CityId })} aria-label={tr(`Thành phố chặng ${index + 2}`, `City of leg ${index + 2}`)} className="h-9 rounded-lg border border-forest/15 bg-white px-2 text-sm font-semibold outline-none focus:border-lapis">
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {name(city.id)}
                </option>
              ))}
            </select>
            <span className="ml-auto flex items-center gap-1">
              <button type="button" className="grid size-8 place-items-center rounded-full border border-forest/15 text-ink/70 hover:border-forest/40 disabled:opacity-40" disabled={leg.days <= 1} onClick={() => change(index, { ...leg, days: leg.days - 1 })} aria-label={tr('Bớt một ngày', 'One day less')}>
                <Minus size={14} />
              </button>
              <span className="tabular w-16 text-center text-sm font-semibold" aria-live="polite">
                {leg.days} {tr('ngày', leg.days === 1 ? 'day' : 'days')}
              </span>
              <button type="button" className="grid size-8 place-items-center rounded-full border border-forest/15 text-ink/70 hover:border-forest/40 disabled:opacity-40" disabled={leg.days >= MAX_TRIP_DAYS || room <= 0} onClick={() => change(index, { ...leg, days: leg.days + 1 })} aria-label={tr('Thêm một ngày', 'One more day')}>
                <Plus size={14} />
              </button>
              <button type="button" className="ml-1 grid size-8 place-items-center text-ink/45 hover:text-pomegranate" onClick={() => change(index, null)} aria-label={tr(`Bỏ chặng ${name(leg.city)}`, `Remove the ${name(leg.city)} leg`)}>
                <X size={15} />
              </button>
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" onClick={add} disabled={room <= 0 || params.more.length >= cities.length - 1} className="inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50">
        <Plus size={15} aria-hidden="true" /> {params.more.length ? tr('Thêm chặng nữa', 'Add another leg') : tr('Đi tiếp thành phố khác', 'Go on to another city')}
      </button>
      {params.more.length > 0 && (
        <p className="mt-1 text-xs text-ink/60">
          {tr('Mỗi chặng là một lịch trình riêng trong cùng hành trình, đi liền ngày nhau. Việc di chuyển giữa hai thành phố bạn tự sắp xếp.', 'Each leg is its own itinerary in one journey, on consecutive days. You arrange the travel between two cities yourself.')}
        </p>
      )}
    </div>
  )
}

/** Where, when, how long and how much: picked first, so nothing typed below has to repeat it. */
function TripBasics({ params, setParams, cityEmpty }: { params: Params; setParams: (value: Params) => void; cityEmpty: boolean }) {
  const setPickedCity = useCityStore((state) => state.setCity)
  const { tr, money, language } = useTr()
  const vi = language === 'vi'
  const pill = useId()
  const set = <K extends keyof Params>(key: K, value: Params[K]) => setParams({ ...params, [key]: value })
  // The trip's length rolls up when it grows and down when it shrinks.
  const [lastDays, setLastDays] = useState({ days: params.days, dir: 1 })
  if (lastDays.days !== params.days) setLastDays({ days: params.days, dir: params.days > lastDays.days ? 1 : -1 })
  const endDate = addDays(params.startDate, params.days - 1)
  const nextDay = hm(params.dayEnd) <= hm(params.dayStart)
  const problem = hoursProblem(params)

  return (
    <motion.section variants={panel} className="panel p-5 sm:p-6" aria-labelledby="basics">
      <h2 id="basics" className="h-display text-xl text-forest">
        {tr('Chuyến đi của bạn', 'Your trip')}
      </h2>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Điểm đến', 'Destination')}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cities.map((city) => {
            const active = params.city === city.id
            return (
              <motion.button
                key={city.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  set('city', city.id)
                  // Picking the city already selected still counts, so the backdrop turns to it
                  if (city.id === params.city) setPickedCity(city.id)
                }}
                variants={tile}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.96 }}
                className={`relative overflow-hidden rounded-xl text-left transition-opacity duration-300 ${active ? 'ring-[3px] ring-gold ring-offset-2 ring-offset-paper' : 'opacity-85 hover:opacity-100'}`}
              >
                <CityCover city={city.id} className="h-16 w-full">
                  <span className="absolute inset-x-2.5 bottom-1.5 flex items-center justify-between text-[0.8rem] font-bold text-white">
                    {vi ? city.name : city.nameEn}
                    {active && (
                      <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }} className="grid">
                        <Check size={15} className="text-gold" />
                      </motion.span>
                    )}
                  </span>
                </CityCover>
              </motion.button>
            )
          })}
        </div>
        {cityEmpty && <CityComingNote city={params.city} />}
        <NextLegs params={params} setParams={setParams} />
      </fieldset>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <motion.div variants={item}>
          <label htmlFor="start-date" className="mb-2 block text-[0.8rem] font-semibold text-ink/75">
            {tr('Ngày đi', 'Start date')}
          </label>
          {/* A new first day keeps the trip's length, so the last day moves with it */}
          <input id="start-date" type="date" min={saigonToday()} value={params.startDate} onChange={(event) => set('startDate', event.target.value || saigonToday())} className="h-11 w-full rounded-xl border border-forest/15 bg-white px-3 text-sm outline-none focus:border-lapis" />
        </motion.div>
        <motion.div variants={item}>
          <label htmlFor="end-date" className="mb-2 block text-[0.8rem] font-semibold text-ink/75">
            {params.more.length ? tr(`Ngày rời ${cityById[params.city].name}`, `Last day in ${cityById[params.city].nameEn}`) : tr('Ngày về', 'End date')}
          </label>
          <input
            id="end-date"
            type="date"
            min={params.startDate}
            max={addDays(params.startDate, MAX_TRIP_DAYS - 1)}
            value={endDate}
            onChange={(event) => event.target.value && set('days', Math.min(MAX_TRIP_DAYS, Math.max(1, daysBetween(params.startDate, event.target.value) + 1)))}
            aria-describedby="trip-length"
            className="h-11 w-full rounded-xl border border-forest/15 bg-white px-3 text-sm outline-none focus:border-lapis"
          />
        </motion.div>
      </div>
      <motion.p variants={item} id="trip-length" className="tabular mt-2 overflow-hidden text-sm font-bold text-forest" aria-live="polite">
        <motion.span key={params.days} className="inline-block" initial={{ y: lastDays.dir * 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
          {params.more.length
            ? tr(`Cả hành trình ${journeyDays(params)} ngày: `, `${journeyDays(params)} days in all: `) +
              [{ city: params.city, days: params.days }, ...params.more].map((leg) => `${vi ? cityById[leg.city].name : cityById[leg.city].nameEn} ${leg.days}`).join(' → ')
            : params.days === 1
              ? tr('1 ngày, về trong ngày', '1 day, back the same day')
              : tr(`${params.days} ngày ${params.days - 1} đêm`, `${params.days} days, ${params.days - 1} night${params.days > 2 ? 's' : ''}`)}
        </motion.span>
      </motion.p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <motion.div variants={item}>
          <label htmlFor="day-start" className="mb-2 block text-[0.8rem] font-semibold text-ink/75">
            {tr('Giờ bắt đầu mỗi ngày', 'Daily start time')}
          </label>
          <input id="day-start" type="time" step={900} value={params.dayStart} onChange={(event) => set('dayStart', event.target.value || fmtTime(DEFAULT_DAY_START))} aria-invalid={!!problem} aria-describedby={problem ? 'hours-problem' : undefined} className="tabular h-11 w-full rounded-xl border border-forest/15 bg-white px-3 text-sm outline-none focus:border-lapis" />
        </motion.div>
        <motion.div variants={item}>
          <label htmlFor="day-end" className="mb-2 flex items-center gap-1.5 text-[0.8rem] font-semibold text-ink/75">
            {tr('Giờ kết thúc mỗi ngày', 'Daily end time')}
            {/* An end at or before the start is the next morning: a 09:00–03:00 day */}
            {nextDay && <span className="rounded-full bg-sun/25 px-2 py-0.5 text-[0.7rem] font-bold text-sun-ink">{nextDayTag(vi)}</span>}
          </label>
          <input id="day-end" type="time" step={900} value={params.dayEnd} onChange={(event) => set('dayEnd', event.target.value || fmtTime(DEFAULT_DAY_END))} aria-invalid={!!problem} aria-describedby={problem ? 'hours-problem' : undefined} className="tabular h-11 w-full rounded-xl border border-forest/15 bg-white px-3 text-sm outline-none focus:border-lapis" />
        </motion.div>
      </div>
      {problem && (
        <p id="hours-problem" className="mt-2 flex items-start gap-1.5 text-[0.8rem] font-semibold leading-snug text-pomegranate" role="alert">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {tr(...dayWindowText(problem, journeyDays(params)))}
        </p>
      )}

      <motion.div variants={item} className="mt-5">
        <div className="mb-1 flex items-baseline justify-between">
          <label htmlFor="budget" className="text-[0.8rem] font-semibold text-ink/75">
            {tr('Ngân sách cả chuyến', 'Total budget')}
          </label>
          <span className="tabular text-sm font-bold text-forest">
            {money(params.budget)} <span className="font-normal text-ink/50">· ~{money(Math.round(params.budget / params.days))}/{tr('ngày', 'day')}</span>
          </span>
        </div>
        <input
          id="budget"
          type="range"
          className="range"
          min={500_000}
          max={15_000_000}
          step={100_000}
          value={params.budget}
          style={{ ['--fill' as string]: `${((params.budget - 500_000) / 14_500_000) * 100}%` }}
          onChange={(event) => set('budget', Number(event.target.value))}
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {BUDGET_PRESETS.map((amount) => {
            const on = params.budget === amount
            return (
              <motion.button
                key={amount}
                type="button"
                aria-pressed={on}
                onClick={() => set('budget', amount)}
                variants={popItem}
                whileTap={{ scale: 0.95 }}
                className={`tabular relative rounded-full border px-3 py-1 text-[0.78rem] font-semibold transition-colors ${on ? 'border-transparent text-forest' : 'border-forest/15 text-ink/65 hover:border-gold'}`}
              >
                {on && <motion.span layoutId={`budget-${pill}`} className="absolute -inset-px rounded-full border border-gold bg-gold/20" transition={{ type: 'spring', stiffness: 420, damping: 32 }} aria-hidden="true" />}
                <span className="relative">{money(amount)}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.section>
  )
}

function Composer({ text, setText, params, setParams, busy, cityEmpty, onSubmit }: { text: string; setText: (value: string) => void; params: Params; setParams: (value: Params) => void; busy: boolean; cityEmpty: boolean; onSubmit: () => void }) {
  const { tr } = useTr()
  // A city with no places yet has nothing to plan, so the request is not sent to be read; nor are hours a day cannot have
  const held = cityEmpty || hoursProblem(params) !== null
  const submit = () => {
    if (!held) onSubmit()
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <TripBasics params={params} setParams={setParams} cityEmpty={cityEmpty} />

        <motion.div variants={panel} className="panel-night p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <label htmlFor="wish" className="h-display text-[1.45rem] text-paper">
                {tr('Muốn thêm gì không?', 'Anything else?')}
              </label>
            </div>
          </div>
          <textarea
            id="wish"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submit()
            }}
            rows={4}
            maxLength={600}
            placeholder={tr('Ví dụ: mê phở, ngại chen chúc', 'e.g. love pho, hate crowds')}
            className="mt-5 w-full resize-none rounded-xl border border-gold/30 bg-night/50 px-4 py-3.5 text-[1.08rem] leading-relaxed text-paper caret-gold outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-paper/60 focus:border-gold focus:shadow-[0_0_0_4px_rgba(246,203,90,0.15)]"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="tabular text-xs text-paper/45">{text.length}/600 · Ctrl + Enter</p>
            <button type="button" className="btn-gold" onClick={submit} disabled={busy || held}>
              {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Wand2 size={18} aria-hidden="true" />}
              {busy ? tr('Đang đọc…', 'Reading…') : tr('Tiếp tục', 'Next')}
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div variants={item} className="space-y-3">
        <motion.p variants={fromRight} className="text-sm font-semibold text-ink/70">{tr('Chưa biết gõ gì? Thử nè:', 'No idea what to write? Try one:')}</motion.p>
        {EXAMPLES.map(([vi, en]) => (
          <motion.button
            key={vi}
            type="button"
            variants={fromRight}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={HOVER_SPRING}
            onClick={() => setText(tr(vi, en))}
            className="panel block w-full px-4 py-3 text-left text-[0.98rem] leading-snug text-ink/80 transition-colors hover:border-gold hover:bg-gold/8"
          >
            <Heart size={13} className="mr-2 inline text-pomegranate" aria-hidden="true" />
            {tr(vi, en)}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}

/* ───────── 2. review what Journie understood ───────── */

type Picked = { ids: string[]; from?: string }

function Review({ text, intent, setIntent, params, setParams, cityEmpty, onGenerate, picked, setPicked }: { text: string; intent: Intent; setIntent: (intent: Intent) => void; params: Params; setParams: (value: Params) => void; cityEmpty: boolean; onGenerate: () => void; picked: Picked; setPicked: (picked: Picked) => void }) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const set = <K extends keyof Params>(key: K, value: Params[K]) => setParams({ ...params, [key]: value })
  const [choosing, setChoosing] = useState<'retrieval' | 'set' | null>(null)
  const [draftPick, setDraftPick] = useState<string[]>([])
  // UC 2.11: the conditions the places are looked up with can be edited here; the reading is rebuilt from the edited extraction
  const editExtraction = (change: (e: Extraction) => Extraction) => {
    if (!intent.extraction) return
    // Hours read as running past midnight stay so: the words that said it are not in the extraction
    const next = intentFromExtraction({ extraction: change(intent.extraction) }, params.city, (intent.dayEnd ?? 0) >= DAY_MINUTES, laterDays(params))
    setIntent({ ...next, city: intent.city ?? next.city, textIgnored: intent.textIgnored })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <motion.section variants={panel} className="panel p-5 sm:p-6" aria-labelledby="understood">
          <h2 id="understood" className="h-display text-xl text-forest">
            {tr('Đúng ý bạn chưa?', 'Look right?')}
          </h2>
          {text.trim() && <motion.p variants={slideItem} className="mt-2 border-l-2 border-gold pl-3 text-[0.98rem] leading-relaxed text-ink/70">“{text.trim()}”</motion.p>}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={tr('Điều bạn vừa nói', 'What you said')}>
            {intent.chips.length === 0 && <li className="text-sm text-ink/55">{tr('Mình chưa nghe được gì cụ thể. Bấm “Sửa lại” để nói thêm nha.', 'Nothing specific yet. Tap “Edit” to tell me more.')}</li>}
            {intent.chips.map((chip) => (
              <motion.li
                key={`${chip.field}-${chip.vi}`}
                variants={popItem}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-semibold ${
                  chip.kind === 'hard' ? 'bg-lapis text-paper' : 'border border-gold bg-gold/15 text-sun-ink'
                }`}
              >
                {chip.kind === 'hard' ? <Lock size={12} aria-hidden="true" /> : <Heart size={12} aria-hidden="true" />}
                {vi ? chip.vi : chip.en}
              </motion.li>
            ))}
          </ul>
          <ReadingNotes intent={intent} later={laterDays(params)} />
          {cityEmpty && !intent.unsupportedDestination && <CityComingNote city={params.city} />}
          {intent.extraction && <ConditionsEditor extraction={intent.extraction} onChange={editExtraction} />}
        </motion.section>

        <motion.section variants={panel} className="panel p-5 sm:p-6" aria-labelledby="choose-places">
          <h2 id="choose-places" className="h-display text-xl text-forest">
            {tr('Chọn trước vài nơi (không bắt buộc)', 'Pick some places first (optional)')}
          </h2>
          <p className="mt-1 text-sm text-ink/60">{tr('Những nơi bạn chọn chắc chắn có trong lịch trình.', 'Places you pick here are sure to be in the plan.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={!intent.extraction || cityEmpty}
              onClick={() => {
                setDraftPick(picked.ids)
                setChoosing('retrieval')
              }}
            >
              <ListChecks size={15} aria-hidden="true" /> {tr('Xem nơi hợp với yêu cầu', 'See places that fit')}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setChoosing('set')}>
              <FolderOpen size={15} aria-hidden="true" /> {tr('Dùng bộ sưu tập đã lưu', 'Use a saved set')}
            </button>
          </div>
          <PickedList picked={picked} cities={[params.city, ...params.more.map((leg) => leg.city)]} onChange={setPicked} />
        </motion.section>

        <motion.section variants={panel} className="panel p-5 sm:p-6" aria-labelledby="params">
          <h2 id="params" className="h-display text-xl text-forest">
            {tr('Nhịp độ và cách di chuyển', 'Pace and getting around')}
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <motion.div variants={item}>
              <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Nhịp độ', 'Pace')}</p>
              <Segmented
                label={tr('Nhịp độ', 'Pace')}
                value={params.pace}
                onChange={(value) => set('pace', value)}
                options={[
                  { value: 'slow', label: tr('Chậm', 'Slow') },
                  { value: 'balanced', label: tr('Vừa', 'Balanced') },
                  { value: 'fast', label: tr('Nhanh', 'Fast') },
                ]}
              />
              <p className="mt-1.5 text-[0.7rem] text-ink/50">
                {tr('Tối đa', 'Up to')}{' '}
                <motion.span key={params.pace} className="inline-block" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
                  {{ slow: 4, balanced: 6, fast: 8 }[params.pace]}
                </motion.span>{' '}
                {tr('điểm mỗi ngày', 'stops a day')}
              </p>
            </motion.div>
            <motion.div variants={item}>
              <p className="mb-2 text-[0.8rem] font-semibold text-ink/75">{tr('Di chuyển', 'Getting around')}</p>
              <Segmented
                label={tr('Di chuyển', 'Getting around')}
                value={params.transport}
                onChange={(value) => set('transport', value)}
                options={[
                  { value: 'walk', label: tr('Đi bộ', 'Walk') },
                  { value: 'bike', label: tr('Xe máy', 'Bike') },
                  { value: 'taxi', label: 'Taxi' },
                ]}
              />
            </motion.div>
          </div>
          {/* A day past midnight: what the late hours hold, and how to get around then */}
          {(intent.dayEnd ?? 0) >= DAY_MINUTES && (
            <p className="mt-4 flex items-start gap-1.5 text-[0.78rem] leading-snug text-ink/65" role="note">
              <Hourglass size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {tr('Sau 22:00 ít nơi còn mở, chủ yếu quán bar, chợ đêm và quán ăn khuya, nên giờ khuya có thể để trống.', 'After 22:00 few places are open, mostly bars, night markets and late-night food, so the late hours may stay free.')}
                {params.transport === 'walk' && tr(' Sau nửa đêm nên đi taxi.', ' After midnight, take a taxi.')}
              </span>
            </p>
          )}
        </motion.section>
      </div>

      <motion.aside variants={lift} className="space-y-4 lg:sticky lg:top-[5.5rem] lg:self-start">
        <button type="button" className="btn-gold w-full" onClick={onGenerate} disabled={Boolean(intent.unsupportedDestination) || cityEmpty}>
          <Sparkles size={18} aria-hidden="true" />
          {tr('Chọn địa điểm', 'Pick places')}
        </button>
        <p className="text-center text-xs text-ink/55">{tr('Lịch trình mở ra dạng bản nháp; bạn xem rồi mới lưu.', 'The plan opens as a draft; look it over before you save it.')}</p>
      </motion.aside>

      <Sheet
        open={choosing === 'retrieval'}
        onClose={() => setChoosing(null)}
        width="max-w-3xl"
        title={tr('Nơi hợp với yêu cầu', 'Places that fit your request')}
        description={tr('Tích những nơi bạn muốn chắc chắn có trong lịch trình.', 'Tick the places you want to be sure of.')}
      >
        {intent.extraction && (
          <RetrievalResults
            extraction={inCity(forRetrieval(intent.extraction), params.city)}
            selected={draftPick}
            onSelectedChange={setDraftPick}
            actions={(chosen) => (
              <button
                type="button"
                className="btn-gold btn-sm"
                onClick={() => {
                  setPicked({ ids: chosen })
                  setChoosing(null)
                }}
              >
                <Check size={15} aria-hidden="true" /> {tr(`Dùng ${chosen.length} nơi`, `Use ${chosen.length} places`)}
              </button>
            )}
          />
        )}
      </Sheet>
      <SetPickerSheet
        open={choosing === 'set'}
        onClose={() => setChoosing(null)}
        onPick={(ids, from) => {
          setPicked({ ids, from })
          setChoosing(null)
        }}
      />
    </div>
  )
}

/** The places that will be must-visits, with the ones in another city set aside. */
function PickedList({ picked, cities: planned, onChange }: { picked: Picked; cities: CityId[]; onChange: (picked: Picked) => void }) {
  const { tr, place, language } = useTr()
  const known = picked.ids.filter((id) => poiById[id])
  if (!known.length) return null
  const elsewhere = known.filter((id) => !planned.includes(poiById[id].city))
  const outside = [...new Set(elsewhere.map((id) => poiById[id].city))].map((id) => (language === 'vi' ? cityById[id].name : cityById[id].nameEn)).join(', ')
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-ink/60">
        {picked.from ? tr(`Từ “${picked.from}”`, `From “${picked.from}”`) : tr('Đã chọn', 'Picked')} · {known.length}
        <button type="button" className="ml-3 font-semibold text-terracotta-ink hover:underline" onClick={() => onChange({ ids: [] })}>
          {tr('Bỏ hết', 'Clear')}
        </button>
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {known.map((id) => (
          <li key={id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.78rem] font-semibold ${planned.includes(poiById[id].city) ? 'border-terracotta/40 bg-terracotta/8 text-terracotta-ink' : 'border-ink/15 text-ink/40 line-through'}`}>
            {place.name(poiById[id].name)}
            <button type="button" onClick={() => onChange({ ...picked, ids: picked.ids.filter((entry) => entry !== id) })} className="grid size-4 place-items-center rounded-full hover:bg-ink/10" aria-label={tr(`Bỏ ${place.name(poiById[id].name)}`, `Remove ${place.name(poiById[id].name)}`)}>
              <X size={11} />
            </button>
          </li>
        ))}
      </ul>
      {elsewhere.length > 0 && <p className="mt-1.5 text-xs text-sun-ink">{tr(`${elsewhere.length} nơi ở ${outside} sẽ không nằm trong chuyến này; thêm chặng ${outside} ở “Điểm đến” để đi cả nơi đó.`, `${elsewhere.length} places in ${outside} are not in this trip; add a ${outside} leg under “Destination” to go there too.`)}</p>}
    </div>
  )
}

/** UC 2.19: choose one of the saved sets (or the favourites) as the places to plan with. */
function SetPickerSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (ids: string[], from: string) => void }) {
  const { tr, place } = useTr()
  const user = useAuthStore((state) => state.user)!
  const sets = useSets()
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const [preview, setPreview] = useState<string | null>(null)
  const options = [{ id: 'favourites', name: tr('Yêu thích', 'Favourites'), poiIds: profile.saved }, ...(sets.data ?? []).map((set) => ({ id: set.id, name: set.name, poiIds: set.poiIds }))]
  return (
    <Sheet open={open} onClose={onClose} title={tr('Chọn bộ sưu tập', 'Choose a set')} description={tr('Các nơi trong bộ sẽ là điểm bắt buộc của lịch trình.', 'The places in the set become must-visits.')}>
      {sets.isLoading && <Loader2 size={18} className="animate-spin text-ink/50" aria-label={tr('Đang tải', 'Loading')} />}
      <ul className="space-y-2">
        {options.map((option) => (
          <li key={option.id} className="panel p-3">
            <div className="flex items-center gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" aria-expanded={preview === option.id} onClick={() => setPreview(preview === option.id ? null : option.id)}>
                <span className="block truncate text-sm font-bold">{option.name}</span>
                <span className="tabular text-xs text-ink/55">
                  {option.poiIds.length} {tr('địa điểm', 'places')} · {preview === option.id ? tr('ẩn', 'hide') : tr('xem trước', 'preview')}
                </span>
              </button>
              <button type="button" className="btn-gold btn-sm shrink-0" disabled={!option.poiIds.length} onClick={() => onPick(option.poiIds, option.name)}>
                {tr('Dùng bộ này', 'Use this set')}
              </button>
            </div>
            {preview === option.id && (
              <ul className="mt-3 space-y-1.5 border-t border-forest/10 pt-3">
                {option.poiIds.filter((id) => poiById[id]).map((id) => (
                  <li key={id} className="flex items-center gap-2 text-sm">
                    <CategoryGlyph cat={poiById[id].cat} size={26} /> <span className="truncate">{place.name(poiById[id].name)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

/** UC 2.11: the interests, things to avoid and must-visits the places are looked up with, editable before generating. */
function ConditionsEditor({ extraction, onChange }: { extraction: Extraction; onChange: (change: (e: Extraction) => Extraction) => void }) {
  const { tr } = useTr()
  const [adding, setAdding] = useState<{ field: 'interests' | 'avoid'; value: string }>({ field: 'interests', value: '' })
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const remove = (field: 'interests' | 'avoid' | 'must_visit', value: string) =>
    onChange((e) => ({
      ...e,
      [field]: e[field].filter((entry) => !same(entry, value)),
      hard_constraints: e.hard_constraints.filter((atom) => !same(atom.value, value)),
      soft_constraints: e.soft_constraints.filter((atom) => !same(atom.value, value)),
    }))
  const add = () => {
    const value = adding.value.trim()
    if (!value) return
    onChange((e) => (e[adding.field].some((entry) => same(entry, value)) ? e : { ...e, [adding.field]: [...e[adding.field], value] }))
    setAdding({ ...adding, value: '' })
  }
  const groups: { field: 'interests' | 'avoid' | 'must_visit'; label: string; tone: string }[] = [
    { field: 'interests', label: tr('Thích', 'Likes'), tone: 'border-firuze/50 bg-firuze/10 text-jade-ink' },
    { field: 'avoid', label: tr('Tránh', 'Avoid'), tone: 'border-pomegranate/40 bg-pomegranate/8 text-pomegranate' },
    { field: 'must_visit', label: tr('Phải đến', 'Must visit'), tone: 'border-lapis/40 bg-lapis/8 text-lapis' },
  ]
  return (
    <details className="mt-5 border-t border-forest/10 pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-lapis">{tr('Chỉnh điều kiện tìm địa điểm', 'Edit what places are searched for')}</summary>
      <div className="mt-3 space-y-2.5">
        {groups.map((group) => (
          <div key={group.field} className="flex flex-wrap items-center gap-1.5">
            <span className="w-20 shrink-0 text-xs font-semibold text-ink/60">{group.label}</span>
            {extraction[group.field].length === 0 && <span className="text-xs text-ink/40">—</span>}
            {extraction[group.field].map((value) => (
              <span key={value} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.78rem] font-semibold ${group.tone}`}>
                {value}
                <button type="button" onClick={() => remove(group.field, value)} className="grid size-4 place-items-center rounded-full hover:bg-ink/10" aria-label={tr(`Bỏ ${value}`, `Remove ${value}`)}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select value={adding.field} onChange={(event) => setAdding({ ...adding, field: event.target.value as 'interests' | 'avoid' })} aria-label={tr('Loại điều kiện', 'Kind of condition')} className="h-9 border border-forest/20 bg-white px-2 text-sm">
            <option value="interests">{tr('Thêm sở thích', 'Add a like')}</option>
            <option value="avoid">{tr('Thêm điều tránh', 'Add something to avoid')}</option>
          </select>
          <input
            value={adding.value}
            onChange={(event) => setAdding({ ...adding, value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
            placeholder={tr('ví dụ: bảo tàng', 'e.g. museum')}
            aria-label={tr('Điều kiện mới', 'New condition')}
            className="h-9 min-w-0 flex-1 border border-forest/20 bg-white px-2 text-sm"
          />
          <button type="button" className="btn-ghost btn-sm" onClick={add} disabled={!adding.value.trim()}>
            <Plus size={14} aria-hidden="true" /> {tr('Thêm', 'Add')}
          </button>
        </div>
      </div>
    </details>
  )
}

function CityComingNote({ city }: { city: CityId }) {
  const { tr } = useTr()
  return (
    <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} className="mt-3 flex items-start gap-1.5 text-[0.8rem] font-semibold leading-snug text-sun-ink" role="status">
      <Hourglass size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      {tr(`Chưa có địa điểm ở ${cityById[city].name}, dữ liệu đang được bổ sung.`, `No places in ${cityById[city].nameEn} yet, the data is on its way.`)}
    </motion.p>
  )
}

/** What needs the traveler's attention in the reading: a destination we cannot plan, a vague detail, a contradiction. */
/** `later` is the days of the journey's legs after the first, which share its hours and so its limits. */
function ReadingNotes({ intent, later }: { intent: Intent; later: number }) {
  const { tr, language } = useTr()
  const vi = language === 'vi'
  const conflicts = intent.conflicts ?? []

  if (!intent.unsupportedDestination && !intent.needsClarification && !intent.textIgnored && conflicts.length === 0) return null
  return (
    <div className="mt-4 space-y-1.5 text-[0.78rem] leading-snug" aria-live="polite">
      {intent.textIgnored && (
        <motion.p variants={slideItem} className="flex items-start gap-1.5 font-semibold text-sun-ink">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {tr(`Mình chưa nhận ra ý nào trong câu bạn viết nên chưa tính vào. Thử nói theo chủ đề: ${KNOWN_TOPICS[0]}.`, `I did not pick up anything from what you wrote, so it is not counted. Try a topic: ${KNOWN_TOPICS[1]}.`)}
        </motion.p>
      )}
      {intent.unsupportedDestination && (
        <motion.p variants={slideItem} className="flex items-start gap-1.5 font-semibold text-pomegranate">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {tr(`Chưa có ${intent.unsupportedDestination}. Bấm “Sửa lại”, bỏ nơi kia ra rồi chọn một thành phố ở trên nhé.`, `No ${intent.unsupportedDestination} yet. Hit “Edit”, take that place out and pick a city above.`)}
        </motion.p>
      )}
      {intent.needsClarification && (
        <motion.p variants={slideItem} className="flex items-start gap-1.5 font-semibold text-sun-ink">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {tr('Có chỗ mình chưa chắc, bấm “Sửa lại” coi giùm nha.', 'A few things I am not sure about. Tap “Edit” to check.')}
        </motion.p>
      )}
      {conflicts.map((conflict) => (
        <motion.p key={conflict} variants={slideItem} className="flex items-start gap-1.5 font-semibold text-pomegranate">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {conflictLabel(conflict, intent.extraction, (intent.days ?? 2) + later)[vi ? 0 : 1]}
        </motion.p>
      ))}
    </div>
  )
}

/* ───────── 3. pipeline ───────── */

/** The waiting screen: the city's photographs play one after another; screen readers hear the planning steps instead. */
function Pipeline({ stage, city }: { stage: number; city: CityId }) {
  const { tr } = useTr()

  return (
    <motion.div variants={panel} className="mx-auto max-w-4xl">
      <CitySlideshow city={city} title={tr('Đang lựa chỗ cho bạn…', 'Picking spots for you…')} />
      <div
        className="sr-only"
        role="progressbar"
        aria-label={tr('Tiến độ lên lịch', 'Planning progress')}
        aria-valuemin={0}
        aria-valuemax={STAGES.length}
        aria-valuenow={stage}
        aria-valuetext={
          stage >= STAGES.length
            ? tr('Xong, đang mở chuyến đi', 'Done, opening your trip')
            : tr(`Bước ${stage + 1}/${STAGES.length}: ${STAGES[stage].vi}`, `Step ${stage + 1} of ${STAGES.length}: ${STAGES[stage].en}`)
        }
      />
    </motion.div>
  )
}
