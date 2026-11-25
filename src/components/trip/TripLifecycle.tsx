import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Copy, Link2, Loader2, Share2, Unlink } from 'lucide-react'
import { track } from '../../api/analytics'
import { getShareFor, revokeShare, shareTrip, shareUrl } from '../../api/shares'
import { useSaveTrip } from '../../api/queries'
import { tripTitle } from '../../domain/tripText'
import type { Trip } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { useAuthStore } from '../../store/authStore'
import { useLiveStore } from '../../store/liveStore'
import { useNotificationStore } from '../../store/notificationStore'
import { toast } from '../../store/toastStore'
import { useWeatherStore } from '../../store/weatherStore'
import { ConfirmSheet } from '../ui/ConfirmSheet'
import { DeviceOnlyNote } from '../ui/DeviceOnlyNote'
import { Sheet } from '../ui/Sheet'

/** UC 2.4: make a read-only link, copy or share it, or take it back. */
export function ShareSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { tr, language } = useTr()
  const user = useAuthStore((state) => state.user)!
  const client = useQueryClient()
  const key = ['share', trip.id]
  const share = useQuery({ queryKey: key, queryFn: () => getShareFor(trip.id), enabled: open })
  const make = useMutation({
    mutationFn: () => shareTrip(trip, user.name),
    onSuccess: (made) => {
      client.setQueryData(key, made)
      track({ type: 'trip_shared', city: trip.city, tripId: trip.id })
    },
    onError: () => toast('danger', tr('Chưa tạo được liên kết', 'Could not make the link')),
  })
  const revoke = useMutation({
    mutationFn: () => revokeShare(trip.id),
    onSuccess: () => {
      client.setQueryData(key, null)
      toast('info', tr('Đã thu hồi liên kết', 'Link revoked'), tr('Ai mở liên kết cũ sẽ không xem được nữa.', 'Anyone opening the old link can no longer see the trip.'))
    },
  })
  const url = share.data ? shareUrl(share.data.token) : null
  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast('success', tr('Đã chép liên kết', 'Link copied'))
    } catch {
      toast('warning', tr('Không chép được, hãy chọn và chép tay', 'Could not copy; select it and copy by hand'))
    }
  }
  const nativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <Sheet open={open} onClose={onClose} placement="center" width="max-w-lg" title={tr('Chia sẻ lịch trình', 'Share the itinerary')} description={tripTitle(trip, language)}>
      {share.isLoading ? (
        <Loader2 size={18} className="animate-spin text-ink/50" aria-label={tr('Đang tải', 'Loading')} />
      ) : url ? (
        <div className="space-y-3">
          <p className="text-sm text-ink/70">{tr('Ai có liên kết đều xem được lịch trình (chỉ xem, không sửa) và có thể nhân bản về tài khoản của họ.', 'Anyone with the link can view the itinerary (read only) and copy it into their own account.')}</p>
          <label htmlFor="share-url" className="sr-only">
            {tr('Liên kết chia sẻ', 'Share link')}
          </label>
          <input id="share-url" readOnly value={url} onFocus={(event) => event.target.select()} className="h-11 w-full border border-forest/25 bg-white px-3 text-sm" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold btn-sm" onClick={copy}>
              <Copy size={15} aria-hidden="true" /> {tr('Chép liên kết', 'Copy link')}
            </button>
            {nativeShare && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => navigator.share({ title: tripTitle(trip, language), url }).catch(() => undefined)}>
                <Share2 size={15} aria-hidden="true" /> {tr('Gửi qua…', 'Send via…')}
              </button>
            )}
            <button type="button" className="btn-ghost btn-sm !text-pomegranate" disabled={revoke.isPending} onClick={() => revoke.mutate()}>
              <Unlink size={15} aria-hidden="true" /> {tr('Thu hồi liên kết', 'Revoke link')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink/70">{tr('Tạo một liên kết chỉ-xem để gửi cho bạn bè. Bạn có thể thu hồi bất cứ lúc nào.', 'Make a view-only link to send to friends. You can revoke it at any time.')}</p>
          <button type="button" className="btn-gold btn-sm" disabled={make.isPending} onClick={() => make.mutate()}>
            {make.isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />} {tr('Tạo liên kết', 'Create link')}
          </button>
        </div>
      )}
      <DeviceOnlyNote feature="shares" className="mt-4">
        {tr('Máy chủ chưa có API chia sẻ, nên liên kết hiện chỉ mở được trên trình duyệt này.', 'The server has no sharing API yet, so the link only opens in this browser for now.')}
      </DeviceOnlyNote>
    </Sheet>
  )
}

/** UC 3.9 "Cancel ongoing itinerary": stops tracking, drops any pending proposal and keeps the trip in the history as cancelled. */
export function CancelTripSheet({ trip, open, onClose }: { trip: Trip; open: boolean; onClose: () => void }) {
  const { tr, language } = useTr()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const save = useSaveTrip()
  const clearLive = useLiveStore((state) => state.clear)
  const pushNote = useNotificationStore((state) => state.push)
  return (
    <ConfirmSheet
      open={open}
      onClose={onClose}
      danger
      busy={save.isPending}
      title={tr('Huỷ chuyến đang đi?', 'Cancel this trip?')}
      description={tr('Journie ngừng theo dõi vị trí và sự cố. Lịch trình vẫn nằm trong mục “Đã huỷ”, bạn có thể bắt đầu lại sau.', 'Journie stops following your location and incidents. The itinerary stays under “Cancelled” and you can start it again later.')}
      confirmLabel={tr('Huỷ chuyến', 'Cancel the trip')}
      reasonLabel={tr('Lý do (không bắt buộc)', 'Reason (optional)')}
      reasonOptions={[
        { value: 'weather', label: tr('Thời tiết xấu', 'Bad weather') },
        { value: 'health', label: tr('Sức khoẻ', 'Health') },
        { value: 'plans', label: tr('Đổi kế hoạch', 'Plans changed') },
        { value: 'other', label: tr('Lý do khác', 'Something else') },
      ]}
      onConfirm={(reason) =>
        save.mutate(
          { ...trip, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelReason: reason || undefined },
          {
            onSuccess: () => {
              clearLive(trip.id)
              useWeatherStore.getState().clearOverride()
              track({ type: 'trip_cancelled', city: trip.city, tripId: trip.id, detail: reason || undefined })
              pushNote({ kind: 'info', vi: `Đã huỷ chuyến “${tripTitle(trip, 'vi')}”`, en: `Cancelled “${tripTitle(trip, 'en')}”`, bodyVi: 'Journie đã ngừng theo dõi chuyến này.', bodyEn: 'Journie stopped following this trip.', to: `/app/trips/${trip.id}`, userId: user?.id })
              toast('info', tr('Đã huỷ chuyến', 'Trip cancelled'), tripTitle(trip, language))
              onClose()
              navigate('/app/trips', { replace: true })
            },
          },
        )
      }
    />
  )
}
