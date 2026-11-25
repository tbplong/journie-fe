import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Copy, Loader2, Minus, Plus } from 'lucide-react'
import { track } from '../../api/analytics'
import { saigonToday } from '../../api/planner'
import { readProfile } from '../../api/profile'
import { useCreateTrip, useProfile, useTrips } from '../../api/queries'
import { DEFAULT_BUDGET } from '../../domain/planner'
import { cities, cityById } from '../../domain/pois'
import { addDays, formatDate } from '../../domain/time'
import { blankTrip, cloneTrip } from '../../domain/tripCopy'
import { nameIdeas, tripTitle } from '../../domain/tripText'
import type { CityId, Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { Sheet } from '../ui/Sheet'

const INPUT = 'mt-1.5 h-11 w-full border border-forest/25 bg-white px-3 text-sm outline-none transition-colors focus:border-terracotta'
const LABEL = 'block text-[0.8rem] font-semibold text-ink/75'

/** UC 2.6 "Blank create": name, city, dates and budget, then an empty draft opens in the editor. */
export function BlankTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tr, money, language } = useTr()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)!
  const profile = useProfile().data ?? readProfile(user.id, user.name)
  const create = useCreateTrip()
  const mine = useTrips().data ?? []
  const [title, setTitle] = useState('')
  const [city, setCity] = useState<CityId>('sai-gon')
  const [startDate, setStartDate] = useState(saigonToday())
  const [days, setDays] = useState(2)
  const shown = mine.map((trip) => tripTitle(trip, language))
  const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const duplicate = title.trim().length > 1 && shown.some((name) => fold(name) === fold(title))
  const ideas = nameIdeas({ id: `${city}-${startDate}`, city, startDate, days: [], pace: profile.pace, rainy: false }, language, shown)
  const [budget, setBudget] = useState(DEFAULT_BUDGET)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (title.trim().length < 2) return setError(tr('Đặt tên chuyến (ít nhất 2 ký tự).', 'Name the trip (2+ characters).'))
    setError(null)
    const trip = blankTrip({ userId: user.id, title, city, startDate, days, budget, pace: profile.pace, transport: profile.transport })
    create.mutate(trip, {
      onSuccess: (saved) => {
        toast('success', tr('Đã tạo chuyến trống', 'Blank trip created'), tr('Thêm địa điểm vào từng ngày nhé.', 'Add places to each day.'))
        onClose()
        navigate(`/app/trips/${saved.id}`)
      },
      onError: () => toast('danger', tr('Chưa tạo được', 'Could not create it')),
    })
  }

  return (
    <Sheet open={open} onClose={onClose} placement="center" width="max-w-lg" title={tr('Bắt đầu từ trang trống', 'Start from scratch')} description={tr('Bạn tự chọn từng nơi; Journie xếp giờ khi bạn cần.', 'You pick each place; Journie times it when you ask.')}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="blank-title" className={LABEL}>
            {tr('Tên chuyến', 'Trip name')}
          </label>
          <input id="blank-title" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} aria-invalid={!!error} aria-describedby="blank-title-error" className={INPUT} placeholder={tr('Ví dụ: Cuối tuần ở Sài Gòn', 'e.g. A weekend in Saigon')} />
          <p id="blank-title-error" className="mt-1 min-h-4 text-xs text-pomegranate" aria-live="polite">
            {error ?? (duplicate ? tr('Bạn đã có chuyến tên này, thử một tên khác bên dưới nhé.', 'You already have a trip with this name; try one below.') : null)}
          </p>
          {ideas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('Gợi ý tên', 'Name ideas')}>
              <span className="text-xs text-ink/55">{tr('Gợi ý:', 'Ideas:')}</span>
              {ideas.map((idea) => (
                <button key={idea} type="button" onClick={() => setTitle(idea)} className="rounded-full border border-forest/20 bg-white px-2.5 py-1 text-xs font-semibold text-ink/80 hover:border-terracotta hover:text-terracotta">
                  {idea}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="blank-city" className={LABEL}>
              {tr('Thành phố', 'City')}
            </label>
            <select id="blank-city" value={city} onChange={(event) => setCity(event.target.value as CityId)} className={INPUT}>
              {cities.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {language === 'vi' ? entry.name : entry.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="blank-date" className={LABEL}>
              {tr('Ngày khởi hành', 'Start date')}
            </label>
            <input id="blank-date" type="date" min={saigonToday()} value={startDate} onChange={(event) => setStartDate(event.target.value || saigonToday())} className={INPUT} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className={LABEL} id="blank-days">
              {tr('Số ngày', 'Days')}
            </p>
            <div className="mt-1.5 inline-flex items-center border border-forest/25 bg-white" role="group" aria-labelledby="blank-days">
              <button type="button" className="grid size-11 place-items-center disabled:opacity-30" disabled={days <= 1} onClick={() => setDays(days - 1)} aria-label={tr('Bớt một ngày', 'One day less')}>
                <Minus size={15} />
              </button>
              <span className="tabular w-12 text-center font-bold" aria-live="polite">
                {days}
              </span>
              <button type="button" className="grid size-11 place-items-center disabled:opacity-30" disabled={days >= 7} onClick={() => setDays(days + 1)} aria-label={tr('Thêm một ngày', 'One day more')}>
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="blank-budget" className={LABEL}>
              {tr('Ngân sách', 'Budget')}: <span className="tabular">{money(budget)}</span>
            </label>
            <input id="blank-budget" type="range" className="range mt-3" min={500_000} max={15_000_000} step={100_000} value={budget} style={{ ['--fill' as string]: `${((budget - 500_000) / 14_500_000) * 100}%` }} onChange={(event) => setBudget(Number(event.target.value))} />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-forest/10 pt-4">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            {tr('Huỷ', 'Cancel')}
          </button>
          <button type="submit" className="btn-gold btn-sm" disabled={create.isPending}>
            {create.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {tr('Tạo chuyến trống', 'Create blank trip')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

/** UC 2.7 "Clone create": a copy of one of your trips (or a shared one) as a new draft on new dates. */
export function CloneTripSheet({ open, onClose, source }: { open: boolean; onClose: () => void; source?: Trip }) {
  const { tr, language, locale } = useTr()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const trips = useTrips()
  const create = useCreateTrip()
  const [pickedId, setPickedId] = useState('')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(saigonToday())
  const candidates = (trips.data ?? []).filter((trip) => trip.days.some((day) => day.stops.length))
  const from = source ?? candidates.find((trip) => trip.id === pickedId) ?? candidates[0]
  const newDate = formatDate(startDate, locale, { day: 'numeric', month: 'numeric' })
  const shownTitle = title || (from ? `${tripTitle(from, language)} (${newDate})` : '')
  // The sheet stays mounted between opens, so what was typed for one trip must not carry over to the next
  const close = () => {
    setTitle('')
    setPickedId('')
    setStartDate(saigonToday())
    onClose()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!from || !user) return
    const copy = cloneTrip(from, { userId: user.id, startDate, title: shownTitle })
    create.mutate(copy, {
      onSuccess: (saved) => {
        track({ type: 'trip_cloned', city: saved.city, tripId: from.id })
        toast('success', tr('Đã nhân bản lịch trình', 'Itinerary copied'), tr('Bản sao là bản nháp, kiểm tra rồi lưu nhé.', 'The copy is a draft; check it, then save.'))
        close()
        navigate(`/app/trips/${saved.id}`)
      },
      onError: () => toast('danger', tr('Chưa nhân bản được', 'Could not copy it')),
    })
  }

  return (
    <Sheet open={open} onClose={close} placement="center" width="max-w-lg" title={tr('Nhân bản lịch trình', 'Copy an itinerary')} description={tr('Giữ nguyên các điểm theo ngày, đổi ngày đi.', 'Same places on the same days, new dates.')}>
      <form onSubmit={submit} className="space-y-4">
        {!source &&
          (candidates.length === 0 ? (
            <p className="text-sm text-ink/60">{tr('Bạn chưa có chuyến nào có địa điểm để nhân bản.', 'You have no trip with places to copy yet.')}</p>
          ) : (
            <div>
              <label htmlFor="clone-from" className={LABEL}>
                {tr('Nhân bản từ', 'Copy from')}
              </label>
              <select id="clone-from" value={from?.id} onChange={(event) => setPickedId(event.target.value)} className={INPUT}>
                {candidates.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {`${tripTitle(trip, language, candidates)} · ${language === 'vi' ? cityById[trip.city].name : cityById[trip.city].nameEn} · ${formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}`}
                  </option>
                ))}
              </select>
            </div>
          ))}
        {from && (
          <>
            <div>
              <label htmlFor="clone-title" className={LABEL}>
                {tr('Tên bản sao', 'Name of the copy')}
              </label>
              <input id="clone-title" value={shownTitle} maxLength={80} onChange={(event) => setTitle(event.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="clone-date" className={LABEL}>
                {tr('Ngày khởi hành mới', 'New start date')}
              </label>
              <input id="clone-date" type="date" min={saigonToday()} value={startDate} onChange={(event) => setStartDate(event.target.value || saigonToday())} className={INPUT} />
              <p className="mt-1 text-xs text-ink/55">
                {from.days.length} {tr('ngày', 'days')}, {tr('đến', 'until')} {formatDate(addDays(startDate, from.days.length - 1), locale, { day: 'numeric', month: 'short' })}. {startDate !== from.startDate && tr('Giờ mở cửa sẽ được kiểm tra lại khi bạn tạo lịch.', 'Opening hours are checked again when you create the schedule.')}
              </p>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2.5 border-t border-forest/10 pt-4">
          <button type="button" className="btn-ghost btn-sm" onClick={close}>
            {tr('Huỷ', 'Cancel')}
          </button>
          <button type="submit" className="btn-gold btn-sm" disabled={!from || !user || create.isPending || shownTitle.trim().length < 2}>
            {create.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {tr('Tạo bản sao', 'Make the copy')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
