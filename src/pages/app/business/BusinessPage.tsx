import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Store, X } from 'lucide-react'
import { getBusinessStats, listOwnedPlaces, setOwnedPlaces } from '../../../api/admin'
import { DashboardView } from '../../../components/admin/DashboardView'
import { PageHeader } from '../../../components/PageHeader'
import { PoiPicker } from '../../../components/sets/PoiPicker'
import { DeviceOnlyNote } from '../../../components/ui/DeviceOnlyNote'
import { EmptyState } from '../../../components/ui/primitives'
import { poiById } from '../../../domain/pois'
import { useDashboardFilters } from '../../../hooks/useDashboardFilters'
import { useTr } from '../../../hooks/useTr'
import { useAuthStore } from '../../../store/authStore'
import { toast } from '../../../store/toastStore'

/** UC 4.4 "View business operation dashboard": only the business's own places count. */
export function BusinessPage() {
  const { tr, place } = useTr()
  const user = useAuthStore((state) => state.user)!
  const businessId = user.businessId ?? user.id
  const client = useQueryClient()
  const f = useDashboardFilters()
  const [picking, setPicking] = useState(false)
  const owned = useQuery({ queryKey: ['owned', businessId], queryFn: () => listOwnedPlaces(businessId) })
  const ids = owned.data ?? []
  const stats = useQuery({ queryKey: ['business-stats', businessId, f.filters, ids], queryFn: () => getBusinessStats(f.filters, ids), enabled: owned.isSuccess && ids.length > 0 })
  const save = useMutation({
    mutationFn: (next: string[]) => setOwnedPlaces(businessId, next),
    onSuccess: (next) => {
      client.setQueryData(['owned', businessId], next)
      toast('success', tr('Đã cập nhật địa điểm của bạn', 'Your places are updated'))
    },
    onError: () => toast('danger', tr('Chưa lưu được địa điểm', 'Could not save your places'), tr('Danh sách vẫn như cũ, thử lại nhé.', 'The list is unchanged; try again.')),
  })

  return (
    <>
      <PageHeader
        title={tr('Bảng điều khiển doanh nghiệp', 'Business dashboard')}
        subtitle={tr('Lượt xuất hiện trong lịch trình, lượt lưu và báo cáo cho các địa điểm bạn quản lý.', 'Itinerary inclusions, saves and reports for the places you manage.')}
        actions={
          <button type="button" className="btn-ghost btn-sm" onClick={() => setPicking(true)}>
            <Store size={15} aria-hidden="true" /> {tr('Địa điểm của tôi', 'My places')} ({ids.length})
          </button>
        }
      />
      <DeviceOnlyNote feature="business-places" className="-mt-4 mb-4">
        {tr('Máy chủ chưa có API sở hữu địa điểm; bạn tự chọn địa điểm mình quản lý và số liệu tính từ dữ liệu trên trình duyệt này.', 'The server has no place-ownership API yet; you pick the places you manage and the numbers come from this browser’s data.')}
      </DeviceOnlyNote>
      {ids.length > 0 && (
        <p className="mb-4 flex flex-wrap gap-1.5 text-xs">
          {ids.filter((id) => poiById[id]).map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-lapis/8 px-2.5 py-1 font-semibold text-lapis">
              {place.name(poiById[id].name)}
              <button type="button" onClick={() => save.mutate(ids.filter((entry) => entry !== id))} className="grid size-4 place-items-center rounded-full hover:bg-lapis/15" aria-label={tr(`Bỏ ${place.name(poiById[id].name)}`, `Remove ${place.name(poiById[id].name)}`)}>
                <X size={11} />
              </button>
            </span>
          ))}
        </p>
      )}
      {owned.isSuccess && ids.length === 0 ? (
        <EmptyState
          title={tr('Chưa gắn địa điểm nào', 'No places linked yet')}
          body={tr('Chọn các địa điểm doanh nghiệp bạn quản lý để xem số liệu của chúng.', 'Pick the places your business manages to see their numbers.')}
          action={
            <button type="button" className="btn-gold" onClick={() => setPicking(true)}>
              <Store size={16} aria-hidden="true" /> {tr('Chọn địa điểm', 'Pick places')}
            </button>
          }
        />
      ) : (
        <DashboardView scope="business" f={f} stats={stats.data} loading={owned.isLoading || stats.isLoading} error={stats.error} />
      )}
      <PoiPicker open={picking} onClose={() => setPicking(false)} title={tr('Địa điểm doanh nghiệp quản lý', 'Places your business manages')} exclude={ids} confirmLabel={(n) => tr(`Thêm ${n} nơi`, `Add ${n} places`)} onConfirm={(added) => save.mutate([...ids, ...added])} />
    </>
  )
}
