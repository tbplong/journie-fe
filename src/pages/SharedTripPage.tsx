import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Copy, MapPin, UserRound } from 'lucide-react'
import { openShare } from '../api/shares'
import { useCatalog } from '../api/queries'
import { LangSwitch } from '../components/LangSwitch'
import { Logo } from '../components/Logo'
import { RouteMap } from '../components/map/RouteMap'
import { CloneTripSheet } from '../components/trip/CreateTripSheets'
import { DayTabs, TripStats } from '../components/trip/parts'
import { Timeline } from '../components/trip/Timeline'
import { EmptyState, Skeleton } from '../components/ui/primitives'
import { Toasts } from '../components/ui/Toasts'
import { isScheduled } from '../domain/planner'
import { cityById } from '../domain/pois'
import { addDays, formatDate } from '../domain/time'
import { tripTitle } from '../domain/tripText'
import { useTr } from '../hooks/useTr'
import { homeFor, useAuthStore } from '../store/authStore'

/** UC 2.4: what a share link opens, without signing in. Read only; "Use this itinerary" copies it into your own trips (UC 2.7). */
export function SharedTripPage() {
  const { token = '' } = useParams()
  const { tr, language, locale } = useTr()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const shared = useQuery({ queryKey: ['shared', token], queryFn: () => openShare(token), retry: false })
  const [day, setDay] = useState(0)
  const [copying, setCopying] = useState(false)
  const trip = shared.data?.trip
  useCatalog(trip?.city ?? 'sai-gon')

  const useIt = () => {
    if (user) setCopying(true)
    else navigate('/login', { state: { from: location.pathname } })
  }

  return (
    <div className="app-bg min-h-dvh">
      <header className="flex items-center justify-between border-b border-forest/12 bg-paper/90 px-4 py-3 backdrop-blur sm:px-8">
        <Link to={user ? homeFor(user.role) : '/'} aria-label="Journie">
          <Logo tone="dark" height="2.6rem" />
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitch tone="light" />
          {!user && (
            <Link to="/login" state={{ from: location.pathname }} className="btn-ghost btn-sm">
              {tr('Đăng nhập', 'Sign in')}
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[80rem] px-4 pb-16 pt-6 sm:px-8">
        {shared.isLoading ? (
          <Skeleton className="h-[30rem]" />
        ) : !trip ? (
          <EmptyState
            title={tr('Liên kết không còn dùng được', 'This link no longer works')}
            body={tr('Người chia sẻ có thể đã thu hồi liên kết hoặc xoá lịch trình.', 'The owner may have revoked the link or deleted the itinerary.')}
            action={
              <Link to="/" className="btn-gold">
                {tr('Về trang chủ Journie', 'Go to Journie')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex flex-wrap items-center gap-3 text-xs font-semibold text-terracotta-ink">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} aria-hidden="true" /> {language === 'vi' ? cityById[trip.city].name : cityById[trip.city].nameEn}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={13} aria-hidden="true" /> {formatDate(trip.startDate, locale, { day: 'numeric', month: 'short' })}
                    {trip.days.length > 1 && ` – ${formatDate(addDays(trip.startDate, trip.days.length - 1), locale, { day: 'numeric', month: 'short' })}`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserRound size={13} aria-hidden="true" /> {tr(`Chia sẻ bởi ${shared.data?.ownerName ?? ''}`, `Shared by ${shared.data?.ownerName ?? ''}`)}
                  </span>
                </p>
                <h1 className="h-display mt-2 text-[2.1rem] text-forest sm:text-[2.5rem]">{tripTitle(trip, language)}</h1>
                <p className="text-sm text-ink/60">{tr('Bản chỉ xem.', 'View only.')}</p>
              </div>
              <button type="button" className="btn-gold" onClick={useIt}>
                <Copy size={16} aria-hidden="true" /> {tr('Dùng lịch trình này', 'Use this itinerary')}
              </button>
            </div>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
              <section className="panel p-4 sm:p-5" aria-label={tr('Lịch trình theo ngày', 'Day by day itinerary')}>
                <DayTabs trip={trip} value={Math.min(day, trip.days.length - 1)} onChange={setDay} />
                <div className="mt-5">
                  <Timeline stops={trip.days[Math.min(day, trip.days.length - 1)]?.stops ?? []} readOnly timed={isScheduled(trip)} date={addDays(trip.startDate, day)} />
                </div>
              </section>
              <div className="space-y-5 xl:sticky xl:top-6">
                <div className="panel overflow-hidden">
                  <RouteMap stops={trip.days[Math.min(day, trip.days.length - 1)]?.stops ?? []} center={cityById[trip.city]} className="h-[21rem] w-full" />
                </div>
                <section className="panel p-5">
                  <TripStats trip={trip} />
                </section>
              </div>
            </div>
            {user && <CloneTripSheet source={trip} open={copying} onClose={() => setCopying(false)} />}
          </>
        )}
      </main>
      <Toasts />
    </div>
  )
}
