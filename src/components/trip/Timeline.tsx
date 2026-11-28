import { useState } from 'react'
import { Reorder, useDragControls, motion } from 'motion/react'
import { AlertTriangle, Bike, CarTaxiFront, Check, ChevronDown, ChevronUp, Footprints, GripVertical, Lock, LockOpen, MapPinOff, Minus, Plus, Trash2, Hourglass } from 'lucide-react'
import { poiById } from '../../domain/pois'
import { visitSlot } from '../../domain/solver'
import { DAY_MINUTES, fmtMinutes, fmtSpan, fmtTime, nextDayTag, weekdayOf } from '../../domain/time'
import type { Poi, Stop, TravelMode, Violation } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { EASE_OUT } from '../motion/variants'
import { CategoryGlyph, CategoryName } from '../ui/primitives'
import { OpeningHours } from './parts'

const MODE_ICON: Record<TravelMode, typeof Bike> = { walk: Footprints, bike: Bike, taxi: CarTaxiFront }
/** A wait longer than this (minutes) is free time before the place opens, not a pause on the way. */
const LONG_WAIT = 60

type Rhythm = { delay: number; step: number }

/**
 * Start time of row `index` in the cascade; rows past the sixth arrive together, so a day switch or an added stop never waits long.
 * A fresh draft's first look plays every row on the given beat instead, in step with the map's pins.
 */
const rowDelay = (index: number, reveal?: Rhythm) => (reveal ? reveal.delay + index * reveal.step : Math.min(index, 5) * 0.045)

type Actions = {
  onSelect?: (uid: string) => void
  onHover?: (uid: string | null) => void
  /** Return false to reject the new order; the stop springs back. */
  onCommit?: (stops: Stop[]) => boolean | void
  onMove?: (uid: string, direction: -1 | 1) => void
  onDuration?: (uid: string, delta: number) => void
  onLock?: (uid: string) => void
  onRemove?: (uid: string) => void
}

type Props = Actions & {
  stops: Stop[]
  readOnly?: boolean
  /** False lists the places only: no times, legs, stay lengths or opening hours. */
  timed?: boolean
  activeUid?: string | null
  violations?: Violation[]
  /** Live mode: stops that ended before `nowMinutes` are marked done, the one running is highlighted. */
  nowMinutes?: number
  /** The day's date (ISO), so each stop shows that weekday's opening hours. */
  date?: string
  /** First look at a fresh draft: the stops arrive in order on this beat (seconds), in step with the map's pins. */
  reveal?: Rhythm
}

/** Lunch and dinner hours as the backend's meal windows have them, ends excluded (minutes). */
const LUNCH: [number, number] = [11 * 60, 14 * 60]
const DINNER: [number, number] = [17 * 60 + 30, 20 * 60 + 30]
const isMeal = (poi: Poi | undefined, start: number, [from, until]: [number, number]) =>
  !!poi && (poi.cat === 'food' || poi.tags.includes('street-food')) && start >= from && start < until

/**
 * What the time before a stop is: a wait for opening when the place is shut on arrival, else planned free time (the plan holds the stop
 * later): a rest after a lunch, time before the evening (a dinner or an evening venue), or plain free time.
 */
function idleKind(stop: Stop, prev: Stop | undefined, date: string | undefined): 'opening' | 'rest' | 'evening' | 'free' {
  const poi = poiById[stop.poiId] as Poi | undefined
  if (!poi) return 'opening'
  const arrive = stop.start - stop.wait
  // A stop past midnight is checked against the next weekday's hours too
  const slot = visitSlot(poi, arrive, stop.visit, date ? weekdayOf(date) : undefined, stop.end)
  if (!slot || slot.start > arrive) return 'opening'
  if (poi.evening || isMeal(poi, stop.start, DINNER)) return 'evening'
  if (prev && isMeal(poiById[prev.poiId], prev.start, LUNCH)) return 'rest'
  return 'free'
}

function Leg({ stop, prev, date, delay }: { stop: Stop; prev?: Stop; date?: string; delay: number }) {
  const { tr, money, language } = useTr()
  const vi = language === 'vi'
  const Icon = MODE_ICON[stop.mode]
  const travels = stop.travelMin > 0 || stop.travelKm > 0
  // Plans saved by an older live replan can hold fractional waits
  const wait = Math.round(stop.wait)
  const long = wait > LONG_WAIT
  if (!travels && !wait) return null
  const kind = idleKind(stop, prev, date)
  const idleText = (en: boolean) => {
    const length = fmtMinutes(wait, !en)
    if (kind === 'rest') return en ? `Rest after lunch, ${length}` : `Nghỉ trưa ${length}`
    if (kind === 'evening') return en ? `${length} free time before the evening` : `Thời gian tự do ${length} trước buổi tối`
    return en ? `${length} free` : `Trống ${length}`
  }
  return (
    <>
      {(travels || !long) && (
        <motion.div
          className="flex items-center gap-2 py-1.5 pl-[4.6rem] text-[0.72rem] font-medium text-ink/55 sm:pl-[5.4rem]"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay, ease: EASE_OUT }}
        >
          {travels && (
            <>
              <motion.span
                className="grid size-6 place-items-center rounded-full bg-lapis/10 text-lapis"
                initial={{ scale: 0.4, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: delay + 0.05 }}
              >
                <Icon size={13} aria-hidden="true" />
              </motion.span>
              <span className="tabular">
                {fmtMinutes(stop.travelMin, vi)} · {stop.travelKm} km
                {stop.travelCost > 0 && ` · ${money(stop.travelCost)}`}
              </span>
            </>
          )}
          {wait > 0 && !long && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-sun/20 px-2 py-0.5 text-sun-ink">
              <Hourglass size={11} aria-hidden="true" />
              {kind === 'opening' ? tr(`Chờ mở cửa ${wait} phút`, `Wait ${wait} min for opening`) : tr(idleText(false), idleText(true))}
            </span>
          )}
        </motion.div>
      )}
      {long && (
        <motion.div
          className="my-1 ml-[4.6rem] flex items-center gap-2 rounded-lg border border-dashed border-sun/60 bg-sun/10 px-3 py-2 text-[0.75rem] font-semibold text-sun-ink sm:ml-[5.4rem]"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: delay + 0.04, ease: EASE_OUT }}
        >
          <Hourglass size={13} className="shrink-0" aria-hidden="true" />
          {kind === 'opening' ? tr(`Trống ${fmtMinutes(wait, true)} trước khi mở cửa`, `${fmtMinutes(wait, false)} free before it opens`) : tr(idleText(false), idleText(true))}
        </motion.div>
      )}
    </>
  )
}

type RowProps = Omit<Actions, 'onCommit'> & {
  onCommit?: () => void
  stop: Stop
  index: number
  total: number
  readOnly?: boolean
  timed: boolean
  active: boolean
  violation?: Violation
  state?: 'done' | 'now' | 'next'
  date?: string
  reveal?: Rhythm
}

function StopRow({ stop, index, total, readOnly, timed, active, violation, state, date, reveal, onSelect, onHover, onMove, onDuration, onLock, onRemove, onCommit }: RowProps) {
  const { tr, place, language, price } = useTr()
  const vi = language === 'vi'
  const controls = useDragControls()
  // Undefined for a place this browser has not loaded: the row keeps its times and controls, without the place's details
  const poi = poiById[stop.poiId] as Poi | undefined
  const d = rowDelay(index, reveal)

  const body = (
    <div
      className={`group relative flex gap-3 sm:gap-4 ${state === 'done' ? 'opacity-55' : ''}`}
      data-stop-uid={stop.uid}
      onMouseEnter={() => onHover?.(stop.uid)}
      onMouseLeave={() => onHover?.(null)}
      // Keyboard focus counts as hovering; a mouse click that focuses a button does not, so the map never keeps a stale highlight
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) onHover?.(stop.uid)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onHover?.(null)
      }}
    >
      {timed && (
        <motion.div
          className="hidden w-[4.4rem] shrink-0 pt-3 text-right sm:block"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: d + 0.1, ease: EASE_OUT }}
        >
          <p className="tabular text-[0.95rem] font-bold leading-none text-forest">{fmtTime(stop.start)}</p>
          <p className="tabular mt-1 text-[0.7rem] text-ink/45">{fmtTime(stop.end)}</p>
          {/* Past midnight the clock starts again: the stop is on the next morning */}
          {stop.end > DAY_MINUTES && <p className="mt-0.5 text-[0.62rem] font-semibold leading-tight text-sun-ink">{nextDayTag(language === 'vi')}</p>}
        </motion.div>
      )}

      <div className="relative flex w-8 shrink-0 justify-center">
        <motion.span
          className="timeline-rail absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
          style={{ originY: 0 }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6, delay: d + 0.12, ease: EASE_OUT }}
          aria-hidden="true"
        />
        <motion.span
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 17, delay: d }}
          className={`relative z-10 mt-3 grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors duration-500 ${
            state === 'done' ? 'border-firuze bg-firuze text-white' : state === 'now' ? 'border-gold bg-gold text-night' : 'border-lapis bg-paper text-lapis'
          }`}
        >
          {/* Keyed by state so the check mark pops in the moment a live stop is done. */}
          <motion.span
            key={state === 'done' ? 'done' : 'number'}
            className="grid place-items-center"
            initial={{ opacity: 0, scale: 0.3, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 20 }}
          >
            {state === 'done' ? <Check size={15} /> : index + 1}
          </motion.span>
          {state === 'now' && <span className="pulse-dot absolute inset-0 rounded-full text-gold" aria-hidden="true" />}
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0, scale: state === 'now' ? [1, 1.025, 1] : 1 }}
        transition={{ default: { duration: 0.6, delay: d + 0.05, ease: EASE_OUT }, scale: { duration: 0.55, ease: 'easeInOut' } }}
        className={`min-w-0 flex-1 rounded-xl border bg-white/70 p-3 transition-[border-color,box-shadow,background-color] duration-300 ${
          violation ? 'border-pomegranate/60 bg-pomegranate/5' : active || state === 'now' ? 'border-gold bg-gold/10 shadow-[0_10px_26px_-16px_rgba(240,185,75,0.9)]' : 'border-forest/12 hover:border-lapis/40'
        }`}
      >
        <div className="flex items-start gap-3">
          {poi ? (
            <CategoryGlyph cat={poi.cat} size={38} />
          ) : (
            <span className="grid size-[38px] shrink-0 place-items-center rounded-[0.5rem] border border-dashed border-forest/25 text-ink/40" aria-hidden="true">
              <MapPinOff size={18} />
            </span>
          )}
          <button type="button" onClick={() => onSelect?.(stop.uid)} className="min-w-0 flex-1 text-left">
            {timed && (
              <p className="tabular text-[0.72rem] font-bold text-lapis sm:hidden">
                {fmtSpan(stop.start, stop.end, language === 'vi')}
              </p>
            )}
            <p className={`line-clamp-2 text-[0.95rem] font-semibold leading-snug ${poi ? 'text-ink' : 'text-ink/50'}`}>{place.nameOf(stop.poiId)}</p>
            {poi && (
              <p className="truncate text-xs text-ink/55">
                <CategoryName cat={poi.cat} /> · {place.area(poi.area)}
              </p>
            )}
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/65">
          {timed &&
            (readOnly ? (
              <span className="tabular">{fmtMinutes(stop.visit, vi)}</span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-forest/15 bg-white">
                <button type="button" className="grid size-7 place-items-center text-ink/50 hover:text-lapis disabled:opacity-30" disabled={stop.visit <= 15} onClick={() => onDuration?.(stop.uid, -15)} aria-label={tr('Bớt 15 phút', '15 minutes less')}>
                  <Minus size={13} />
                </button>
                <span className="tabular min-w-[4.5rem] text-center font-semibold text-ink">{fmtMinutes(stop.visit, vi)}</span>
                <button type="button" className="grid size-7 place-items-center text-ink/50 hover:text-lapis" onClick={() => onDuration?.(stop.uid, 15)} aria-label={tr('Thêm 15 phút', '15 minutes more')}>
                  <Plus size={13} />
                </button>
              </span>
            ))}
          {poi && <span className="tabular font-semibold text-ink/80">{price(poi)}</span>}
          {timed && poi && <OpeningHours poi={poi} date={date} at={stop.start} />}
          {poi && !poi.indoor && <span className="rounded-full bg-firuze/12 px-2 py-0.5 text-[0.68rem] font-semibold text-jade-ink">{tr('Ngoài trời', 'Outdoor')}</span>}
          {stop.locked && <span className="rounded-full bg-lapis/10 px-2 py-0.5 text-[0.68rem] font-semibold text-lapis">{tr('Bắt buộc', 'Must visit')}</span>}
          {!readOnly && (
            <div className="ml-auto flex shrink-0 items-center">
              <span className="hidden flex-col sm:flex">
                <button type="button" disabled={index === 0} onClick={() => onMove?.(stop.uid, -1)} className="grid h-[1.1rem] w-8 place-items-center text-ink/35 transition-colors hover:text-lapis disabled:opacity-25" aria-label={tr('Chuyển lên trên', 'Move up')}>
                  <ChevronUp size={15} />
                </button>
                <button type="button" disabled={index === total - 1} onClick={() => onMove?.(stop.uid, 1)} className="grid h-[1.1rem] w-8 place-items-center text-ink/35 transition-colors hover:text-lapis disabled:opacity-25" aria-label={tr('Chuyển xuống dưới', 'Move down')}>
                  <ChevronDown size={15} />
                </button>
              </span>
              <button
                type="button"
                onClick={() => onLock?.(stop.uid)}
                className={`hidden size-9 place-items-center transition-colors sm:grid ${stop.locked ? 'text-lapis' : 'text-ink/35 hover:text-ink'}`}
                aria-pressed={stop.locked}
                aria-label={stop.locked ? tr('Bỏ khóa điểm này', 'Unlock this stop') : tr('Khóa: điểm bắt buộc phải giữ', 'Lock: this stop must stay')}
                title={stop.locked ? tr('Điểm bắt buộc', 'Mandatory stop') : tr('Khóa điểm này', 'Lock this stop')}
              >
                {stop.locked ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>
              <button type="button" onClick={() => onRemove?.(stop.uid)} className="hidden size-9 place-items-center text-ink/35 transition-colors hover:text-pomegranate sm:grid" aria-label={tr('Xóa điểm này', 'Remove this stop')}>
                <Trash2 size={16} />
              </button>
              <span
                onPointerDown={(event) => {
                  event.preventDefault()
                  controls.start(event)
                }}
                className="grid size-9 cursor-grab touch-none place-items-center text-ink/35 transition-colors hover:text-lapis active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical size={18} />
              </span>
            </div>
          )}
        </div>

        {violation && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-pomegranate" role="alert">
            <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden="true" />
            {vi ? violation.detail : violation.detailEn}
          </p>
        )}

        {!readOnly && (
          <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
            <button type="button" onClick={() => onLock?.(stop.uid)} aria-pressed={stop.locked} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${stop.locked ? 'border-lapis bg-lapis/10 text-lapis' : 'border-forest/15'}`}>
              {stop.locked ? <Lock size={13} /> : <LockOpen size={13} />} {stop.locked ? tr('Bắt buộc', 'Locked') : tr('Khóa', 'Lock')}
            </button>
            <button type="button" onClick={() => onRemove?.(stop.uid)} className="inline-flex items-center gap-1 rounded-full border border-pomegranate/40 px-2.5 py-1 text-[0.7rem] font-semibold text-pomegranate">
              <Trash2 size={13} /> {tr('Xóa', 'Remove')}
            </button>
            <button type="button" disabled={index === 0} onClick={() => onMove?.(stop.uid, -1)} className="inline-flex items-center gap-1 rounded-full border border-forest/15 px-2.5 py-1 text-[0.7rem] font-semibold disabled:opacity-30">
              <ChevronUp size={13} /> {tr('Lên', 'Up')}
            </button>
            <button type="button" disabled={index === total - 1} onClick={() => onMove?.(stop.uid, 1)} className="inline-flex items-center gap-1 rounded-full border border-forest/15 px-2.5 py-1 text-[0.7rem] font-semibold disabled:opacity-30">
              <ChevronDown size={13} /> {tr('Xuống', 'Down')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )

  if (readOnly) return <li>{body}</li>

  return (
    <Reorder.Item
      value={stop}
      dragListener={false}
      dragControls={controls}
      onDragEnd={() => onCommit?.()}
      className="relative list-none"
      whileDrag={{ scale: 1.015, boxShadow: '0 22px 40px -18px rgba(19,26,77,0.55)', zIndex: 20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      onKeyDown={(event) => {
        if (event.altKey && event.key === 'ArrowUp') {
          event.preventDefault()
          onMove?.(stop.uid, -1)
        }
        if (event.altKey && event.key === 'ArrowDown') {
          event.preventDefault()
          onMove?.(stop.uid, 1)
        }
      }}
    >
      {body}
    </Reorder.Item>
  )
}

/**
 * A day as a vertical timeline. Editable timelines reorder by dragging the grip (or the Up/Down
 * buttons / Alt+Arrow on touch and keyboard); the parent validates the new order against the hard
 * constraints and either commits it or springs the stop back.
 */
export function Timeline({ stops, readOnly, timed = true, activeUid, violations = [], nowMinutes, date, reveal, ...actions }: Props) {
  const { tr } = useTr()
  const [order, setOrder] = useState(stops)
  const [seen, setSeen] = useState(stops)
  // New data from the parent replaces the local drag order (adjusting state while rendering).
  if (seen !== stops) {
    setSeen(stops)
    setOrder(stops)
  }

  const commit = () => {
    if (order.every((stop, index) => stop.uid === stops[index]?.uid)) return
    if (actions.onCommit?.(order) === false) setOrder(stops)
  }

  const violationFor = (uid: string) => violations.find((violation) => violation.uid === uid)
  const stateFor = (stop: Stop): RowProps['state'] =>
    nowMinutes === undefined ? undefined : stop.end <= nowMinutes ? 'done' : stop.start <= nowMinutes ? 'now' : 'next'

  if (!order.length) {
    return (
      <motion.div
        className="rounded-xl border border-dashed border-forest/25 bg-white/50 px-5 py-10 text-center text-sm text-ink/55"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
      >
        {tr('Ngày này chưa có điểm nào.', 'No stops on this day yet.')}
      </motion.div>
    )
  }

  const rows = order.map((stop, index) => (
    <div key={stop.uid}>
      {timed && index > 0 && <Leg stop={stop} prev={order[index - 1]} date={date} delay={rowDelay(index, reveal) - 0.03} />}
      <StopRow
        stop={stop}
        index={index}
        total={order.length}
        readOnly={readOnly}
        timed={timed}
        active={activeUid === stop.uid}
        violation={violationFor(stop.uid)}
        state={stateFor(stop)}
        date={date}
        reveal={reveal}
        {...actions}
        onCommit={commit}
      />
    </div>
  ))

  if (readOnly) return <ol className="m-0 list-none p-0">{rows}</ol>

  return (
    <Reorder.Group axis="y" values={order} onReorder={setOrder} className="m-0 list-none p-0">
      {order.map((stop, index) => (
        <div key={stop.uid}>
          {timed && index > 0 && <Leg stop={stop} prev={order[index - 1]} date={date} delay={rowDelay(index, reveal) - 0.03} />}
          <StopRow
            stop={stop}
            index={index}
            total={order.length}
            timed={timed}
            active={activeUid === stop.uid}
            violation={violationFor(stop.uid)}
            state={stateFor(stop)}
            date={date}
            reveal={reveal}
            {...actions}
            onCommit={commit}
          />
        </div>
      ))}
    </Reorder.Group>
  )
}
