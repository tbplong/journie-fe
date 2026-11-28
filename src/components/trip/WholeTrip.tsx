import { Link } from 'react-router'
import { ArrowUpRight, TrainFront } from 'lucide-react'
import { cityById } from '../../domain/pois'
import { addDays, formatDate } from '../../domain/time'
import type { Stop, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { Timeline } from './Timeline'

/**
 * The whole trip on one page, read top to bottom: every day one after another instead of one day at a time. Given the legs of a journey
 * (`domain/journey.ts`), the days run on across the cities, with each city's leg introduced and the travel between two cities marked.
 */
export function WholeTrip({ trips, onSelect, anchors }: { trips: Trip[]; onSelect?: (stop: Stop, trip: Trip) => void; /** Give each leg an id (`leg-1`…) to link to. */ anchors?: boolean }) {
  const { tr, language, locale } = useTr()
  const vi = language === 'vi'
  const journey = trips.length > 1
  // Day numbers run on across the legs, as the traveler lives them
  const firstDay = trips.map((_, i) => trips.slice(0, i).reduce((sum, trip) => sum + trip.days.length, 0))

  return (
    <div className="whole-trip">
      {trips.map((trip, leg) => {
        const city = cityById[trip.city]
        const cityName = vi ? city.name : city.nameEn
        return (
          <section key={trip.id} id={anchors ? `leg-${leg + 1}` : undefined} aria-label={journey ? tr(`Chặng ${leg + 1}: ${cityName}`, `Leg ${leg + 1}: ${cityName}`) : undefined}>
            {journey && leg > 0 && (
              <p className="whole-trip-transfer my-5 flex items-center gap-2.5 border border-dashed border-forest/25 px-4 py-2.5 text-[0.8rem] text-ink/65">
                <TrainFront size={16} className="shrink-0 text-lapis" aria-hidden="true" />
                {tr(
                  `Di chuyển ${cityById[trips[leg - 1].city].name} → ${cityName}: bạn tự sắp xếp (máy bay, tàu hoặc xe).`,
                  `${cityById[trips[leg - 1].city].nameEn} → ${cityName}: arrange the travel yourself (flight, train or coach).`,
                )}
              </p>
            )}
            {journey && (
              <header className="mb-1 mt-2 flex items-end justify-between gap-3 border-b-2 border-forest/80 pb-2">
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-terracotta-ink">{tr(`Chặng ${leg + 1}`, `Leg ${leg + 1}`)}</p>
                  <h2 className="h-display text-2xl leading-tight text-forest">{cityName}</h2>
                </div>
                <Link to={`/app/trips/${trip.id}`} className="inline-flex shrink-0 items-center gap-1 text-[0.8rem] font-semibold text-lapis hover:underline">
                  {tr('Mở để chỉnh', 'Open to edit')} <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </header>
            )}
            {trip.days.map((day, index) => {
              const date = addDays(trip.startDate, index)
              const number = firstDay[leg] + index + 1
              return (
                <div key={day.index} className="pt-5">
                  <h3 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b border-forest/12 pb-1.5">
                    <span className="h-display text-lg text-forest">{tr(`Ngày ${number}`, `Day ${number}`)}</span>
                    <span className="text-[0.8rem] capitalize text-ink/60">{formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'numeric' })}</span>
                    <span className="tabular ml-auto text-xs text-ink/50">
                      {journey ? `${cityName} · ` : ''}
                      {day.stops.length} {tr('điểm', day.stops.length === 1 ? 'stop' : 'stops')}
                    </span>
                  </h3>
                  {day.stops.length ? (
                    <div className="mt-3">
                      <Timeline
                        stops={day.stops}
                        readOnly
                        timed={trip.scheduled !== false}
                        date={date}
                        onSelect={(uid) => {
                          const stop = day.stops.find((entry) => entry.uid === uid)
                          if (stop) onSelect?.(stop, trip)
                        }}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ink/50">{tr('Ngày này còn trống.', 'Nothing planned for this day.')}</p>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
