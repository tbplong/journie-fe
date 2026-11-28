import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueries } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowLeft, CalendarDays, Route, Save, X } from 'lucide-react'
import { catalogQuery, useDeleteTrips, useSaveTrip, useTrips } from '../../api/queries'
import { PageHeader } from '../../components/PageHeader'
import { EASE_OUT } from '../../components/motion/variants'
import { PoiSheet } from '../../components/place/PoiSheet'
import { WholeTrip } from '../../components/trip/WholeTrip'
import { EmptyState, LoadError, Skeleton } from '../../components/ui/primitives'
import { journeyRoute, journeysOf } from '../../domain/journey'
import { tripSpend, tripStopCount } from '../../domain/planner'
import { addDays, formatDate } from '../../domain/time'
import { useTr } from '../../hooks/useTr'
import { toast } from '../../store/toastStore'
import { useUiStore } from '../../store/uiStore'

/**
 * A journey through several cities (spec docs/specs/merge-collections-multi-city.md): its legs, ordinary one-city trips, shown as one
 * trip read top to bottom on a single page. Each leg opens on its own page to be edited.
 */
export function JourneyPage() {
  const { id } = useParams()
  const { tr, language, locale, money } = useTr()
  const navigate = useNavigate()
  const trips = useTrips()
  const legs = journeysOf(trips.data ?? []).find((journey) => journey.id === id)?.legs ?? []
  // The legs' places, so the names show (and the page draws again once a city's places arrive)
  useQueries({ queries: [...new Set(legs.map((leg) => leg.city))].map((city) => catalogQuery(city)) })
  const save = useSaveTrip()
  const removeAll = useDeleteTrips()
  const openPoi = useUiStore((state) => state.openPoi)
  const [saving, setSaving] = useState(false)

  if (trips.isLoading) return <Skeleton className="h-96" />
  if (trips.isError) return <LoadError onRetry={() => trips.refetch()} />
  if (!legs.length)
    return (
      <EmptyState
        title={tr('Không tìm thấy hành trình này', 'This journey was not found')}
        body={tr('Có thể các chặng đã bị xoá.', 'Its legs may have been deleted.')}
        action={
          <Link to="/app/trips" className="btn-gold">
            {tr('Về chuyến đi của tôi', 'Back to my trips')}
          </Link>
        }
      />
    )

  const days = legs.reduce((sum, leg) => sum + leg.days.length, 0)
  const last = legs[legs.length - 1]
  const drafts = legs.filter((leg) => leg.status === 'draft')

  const saveAll = async () => {
    setSaving(true)
    try {
      for (const leg of drafts) await save.mutateAsync({ ...leg, status: 'upcoming' })
      toast('success', tr('Đã lưu cả hành trình', 'Journey saved'), tr('Bạn xem lại trong “Chuyến đi của tôi”.', 'Find it under “My trips”.'))
    } finally {
      setSaving(false)
    }
  }
  const discardAll = () =>
    removeAll.mutate(
      drafts.map((leg) => leg.id),
      {
        onSuccess: () => {
          toast('info', tr('Đã bỏ bản nháp hành trình', 'Journey draft discarded'))
          navigate('/app/plan', { replace: true })
        },
      },
    )

  return (
    <>
      <PageHeader
        title={journeyRoute(legs, language)}
        subtitle={[
          `${formatDate(legs[0].startDate, locale, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(last.startDate, last.days.length - 1), locale, { day: 'numeric', month: 'short' })}`,
          tr(`${days} ngày · ${legs.length} chặng`, `${days} days · ${legs.length} legs`),
          `${legs.reduce((sum, leg) => sum + tripStopCount(leg), 0)} ${tr('điểm', 'stops')}`,
          money(legs.reduce((sum, leg) => sum + tripSpend(leg), 0)),
        ].join(' · ')}
        actions={
          <Link to="/app/trips" className="btn-ghost btn-sm">
            <ArrowLeft size={15} aria-hidden="true" /> {tr('Chuyến đi của tôi', 'My trips')}
          </Link>
        }
      />

      {drafts.length > 0 && (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-3 border border-sun/60 bg-sun/12 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-ink/80">
            <strong>{tr('Hành trình nháp chưa lưu.', 'Unsaved journey draft.')}</strong> {tr('Xem lại cả chuyến rồi lưu, hoặc mở từng chặng để chỉnh trước.', 'Look over the whole trip and save it, or open a leg to edit it first.')}
          </p>
          <button type="button" className="btn-ghost btn-sm" onClick={discardAll} disabled={removeAll.isPending || saving}>
            <X size={15} aria-hidden="true" /> {tr('Bỏ bản nháp', 'Discard')}
          </button>
          <button type="button" className="btn-gold btn-sm" onClick={() => void saveAll()} disabled={saving || removeAll.isPending}>
            <Save size={15} aria-hidden="true" /> {saving ? tr('Đang lưu…', 'Saving…') : tr('Lưu cả hành trình', 'Save the journey')}
          </button>
        </div>
      )}

      <motion.nav aria-label={tr('Các chặng', 'Legs')} className="mb-6 flex flex-wrap items-center gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }}>
        <Route size={16} className="text-terracotta" aria-hidden="true" />
        {legs.map((leg, index) => (
          <a key={leg.id} href={`#leg-${index + 1}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest/25 px-3 py-1 text-[0.8rem] font-semibold text-ink/80 transition-colors hover:border-terracotta hover:text-ink">
            <CalendarDays size={13} className="text-lapis" aria-hidden="true" />
            {index + 1}.{' '}
            {journeyRoute([leg], language)} · {leg.days.length} {tr('ngày', leg.days.length === 1 ? 'day' : 'days')}
          </a>
        ))}
      </motion.nav>

      <motion.article className="panel mx-auto max-w-3xl p-4 sm:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: EASE_OUT }} aria-label={tr('Cả hành trình', 'The whole journey')}>
        <WholeTrip trips={legs} anchors onSelect={(stop) => openPoi(stop.poiId)} />
      </motion.article>
      <PoiSheet />
    </>
  )
}
