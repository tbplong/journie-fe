import { motion, stagger, type Variants } from 'motion/react'
import { CalendarDays, Clock, Route, Wallet } from 'lucide-react'
import { isScheduled } from '../../domain/planner'
import { dayCost, tripCost, windowsOn } from '../../domain/solver'
import { addDays, fmtMinutes, fmtTime, formatDate, weekdayOf } from '../../domain/time'
import type { Poi, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { EASE_OUT, riseItem } from '../motion/variants'
import { Meter } from '../ui/primitives'

const statGrid: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.07, { startDelay: 0.1 }) } } }

export function DayTabs({ trip, value, onChange }: { trip: Trip; value: number; onChange: (index: number) => void }) {
  const { tr, locale } = useTr()
  return (
    <div role="tablist" aria-label={tr('Chọn ngày', 'Choose a day')} className="flex gap-1.5 overflow-x-auto pb-1">
      {trip.days.map((day) => {
        const active = day.index === value
        return (
          <motion.button
            key={day.index}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(day.index)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.15 + Math.min(day.index, 8) * 0.05, ease: EASE_OUT } }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.12 }}
            className={`relative shrink-0 rounded-xl px-4 py-2 text-left transition-colors ${active ? 'text-paper' : 'text-ink/70 hover:bg-lapis/8'}`}
          >
            {active && <motion.span layoutId={`day-tab-${trip.id}`} className="absolute inset-0 rounded-xl bg-lapis" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative block text-[0.8rem] font-bold">{tr(`Ngày ${day.index + 1}`, `Day ${day.index + 1}`)}</span>
            <span className={`relative block text-[0.68rem] ${active ? 'text-paper/70' : 'text-ink/45'}`}>{formatDate(addDays(trip.startDate, day.index), locale, { day: 'numeric', month: 'short' })}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/**
 * A place's opening hours on `date`: the interval a visit starting at `at` falls in, else every interval of that weekday. Without a date,
 * its summary window.
 */
export function OpeningHours({ poi, date, at }: { poi: Poi; date?: string; at?: number }) {
  const { tr } = useTr()
  // Unknown hours plan as a 0–1440 window too, so only real intervals may read "open 24h"
  if (!poi.windows) return <span>{tr('Chưa rõ giờ', 'Hours unknown')}</span>
  const windows = windowsOn(poi, date ? weekdayOf(date) : undefined)
  if (!windows.length) return <span className="font-semibold text-pomegranate">{tr('Đóng cửa ngày này', 'Closed that day')}</span>
  if (windows.some(([open, close]) => open <= 0 && close >= 1440)) return <span>{tr('Mở cả ngày', 'Open 24h')}</span>
  const holding = at === undefined ? undefined : windows.find(([open, close]) => open <= at && at < close)
  return <span className="tabular">{(holding ? [holding] : windows).map(([open, close]) => `${fmtTime(open)}–${fmtTime(close)}`).join(', ')}</span>
}

export function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <motion.div className="flex items-center gap-3" variants={riseItem}>
      <span className="grid size-10 place-items-center rounded-xl bg-lapis/10 text-lapis" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[0.7rem] font-medium text-ink/50">{label}</p>
        {/* Keyed by value so an edit to the trip visibly ticks the number. */}
        <motion.p key={value} className="tabular text-[0.95rem] font-bold text-ink" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
          {value}
        </motion.p>
      </div>
    </motion.div>
  )
}

/** Day and trip totals: stops, time on the road and distance (once scheduled), and spend against the budget. */
export function TripStats({ trip, dayIndex }: { trip: Trip; dayIndex?: number }) {
  const { tr, money, language } = useTr()
  const days = dayIndex === undefined ? trip.days : [trip.days[dayIndex]]
  const stops = days.flatMap((day) => day.stops)
  const travel = stops.reduce((sum, stop) => sum + stop.travelMin, 0)
  const km = stops.reduce((sum, stop) => sum + stop.travelKm, 0)
  const spend = dayIndex === undefined ? tripCost(trip.days) : dayCost(trip.days[dayIndex])
  const budget = dayIndex === undefined ? trip.budget : trip.budget / trip.days.length
  return (
    <div className="space-y-4">
      <motion.div className="grid grid-cols-2 gap-x-4 gap-y-4" variants={statGrid} initial="hidden" animate="show">
        <Stat icon={CalendarDays} label={tr('Số điểm', 'Stops')} value={`${stops.length}`} />
        {isScheduled(trip) && (
          <>
            <Stat icon={Clock} label={tr('Di chuyển', 'Travel time')} value={fmtMinutes(travel, language === 'vi')} />
            <Stat icon={Route} label={tr('Quãng đường', 'Distance')} value={`${km.toFixed(1)} km`} />
          </>
        )}
        <Stat icon={Wallet} label={tr('Chi phí ước tính', 'Estimated cost')} value={money(spend)} />
      </motion.div>
      <div>
        <div className="mb-1.5 flex justify-between text-[0.72rem] font-medium text-ink/55">
          <span>{tr('Ngân sách', 'Budget')}</span>
          <span className="tabular">
            {money(spend)} / {money(budget)}
          </span>
        </div>
        <Meter value={spend} max={budget} label={tr('Chi phí so với ngân sách', 'Spend against budget')} />
      </div>
    </div>
  )
}
