import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { listActivity } from '../../api/admin'
import type { AnalyticsEvent, EventType } from '../../api/analytics'
import { readAccounts } from '../../api/accountStore'
import { disruptionMeta } from '../../domain/replan'
import { cityById, poiById } from '../../domain/pois'
import { useTr } from '../../hooks/useTr'
import { DeviceOnlyNote } from '../ui/DeviceOnlyNote'
import { Skeleton } from '../ui/primitives'

const EVENT_LABELS: Record<EventType, [string, string]> = {
  trip_created: ['Tạo lịch trình', 'Created an itinerary'],
  trip_saved: ['Lưu lịch trình', 'Saved an itinerary'],
  trip_edited: ['Sửa lịch trình', 'Edited an itinerary'],
  trip_started: ['Bắt đầu chuyến đi', 'Started a trip'],
  trip_cancelled: ['Huỷ chuyến đi', 'Cancelled a trip'],
  trip_completed: ['Hoàn thành chuyến đi', 'Finished a trip'],
  trip_shared: ['Chia sẻ lịch trình', 'Shared an itinerary'],
  trip_cloned: ['Nhân bản lịch trình', 'Copied an itinerary'],
  replan_suggested: ['Nhận đề xuất đổi lịch', 'Got a replan proposal'],
  replan_accepted: ['Chấp nhận đổi lịch', 'Accepted a replan'],
  replan_dismissed: ['Giữ lịch cũ', 'Kept the plan'],
  replan_auto: ['Lịch tự điều chỉnh', 'Plan adjusted automatically'],
  edit_rejected: ['Từ chối bản sửa', 'Rejected an edit'],
  search: ['Tìm kiếm', 'Searched'],
  poi_opened: ['Xem địa điểm', 'Viewed a place'],
  poi_saved: ['Lưu địa điểm', 'Saved a place'],
  poi_reported: ['Báo sai thông tin', 'Reported a place'],
  set_created: ['Tạo bộ sưu tập', 'Created a set'],
  set_deleted: ['Xoá bộ sưu tập', 'Deleted a set'],
  login: ['Đăng nhập', 'Signed in'],
  account_updated: ['Cập nhật tài khoản', 'Updated the account'],
}

/** Activity history (UC 6.10 for admins, UC 6.14 for the user themselves), filterable by kind and date, newest first. */
export function ActivityList({ userId, self = false, showUser = false }: { userId?: string; self?: boolean; showUser?: boolean }) {
  const { tr, language, place } = useTr()
  const [type, setType] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['activity', userId ?? 'all', self, type, from, to, page], queryFn: () => listActivity({ userId, type, from: from || undefined, to: to || undefined, page, pageSize: 15 }, self) })
  const names = showUser ? new Map(readAccounts().map((a) => [a.id, a.name])) : null
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 15))

  const detail = (event: AnalyticsEvent) =>
    [
      event.city && (language === 'vi' ? cityById[event.city]?.name : cityById[event.city]?.nameEn),
      event.poiId && poiById[event.poiId] && place.name(poiById[event.poiId].name),
      event.reason && tr(disruptionMeta[event.reason].vi, disruptionMeta[event.reason].en),
      event.stops !== undefined && tr(`${event.stops} điểm`, `${event.stops} stops`),
      event.type === 'search' && event.detail && `“${event.detail}”`,
    ]
      .filter(Boolean)
      .join(' · ')

  const field = 'h-9 border border-forest/20 bg-white px-2 text-sm'
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-ink/60">
          {tr('Loại', 'Kind')}
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setPage(1)
            }}
            className={`${field} mt-1 block`}
          >
            <option value="all">{tr('Tất cả', 'All')}</option>
            {(Object.keys(EVENT_LABELS) as EventType[]).map((key) => (
              <option key={key} value={key}>
                {tr(...EVENT_LABELS[key])}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink/60">
          {tr('Từ ngày', 'From')}
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(1)
            }}
            className={`${field} mt-1 block`}
          />
        </label>
        <label className="text-xs font-semibold text-ink/60">
          {tr('Đến ngày', 'To')}
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(1)
            }}
            className={`${field} mt-1 block`}
          />
        </label>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-48" />
      ) : !query.data?.items.length ? (
        <p className="py-8 text-center text-sm text-ink/55">{tr('Chưa có hoạt động nào.', 'No activity yet.')}</p>
      ) : (
        <ol className="divide-y divide-forest/8">
          {query.data.items.map((event, index) => (
            <li key={`${event.t}-${index}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-sm">
              <time dateTime={event.t} className="tabular w-36 shrink-0 text-xs text-ink/50">
                {new Date(event.t).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </time>
              <span className="font-semibold text-ink">{tr(...(EVENT_LABELS[event.type] ?? [event.type, event.type]))}</span>
              {names && <span className="text-xs text-lapis">{event.userName ?? names.get(event.userId ?? '') ?? tr('Không rõ', 'Unknown')}</span>}
              <span className="min-w-0 truncate text-xs text-ink/55">{detail(event)}</span>
            </li>
          ))}
        </ol>
      )}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr('Trang trước', 'Previous page')}>
            <ChevronLeft size={15} />
          </button>
          <span className="tabular text-ink/60">
            {page}/{pages}
          </span>
          <button type="button" className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={tr('Trang sau', 'Next page')}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
      <DeviceOnlyNote feature="activity" className="mt-3">
        {tr('Máy chủ chưa có API lịch sử hoạt động, nên đây chỉ là hoạt động ghi trên trình duyệt này.', 'The server has no activity API yet, so this is only what this browser recorded.')}
      </DeviceOnlyNote>
    </div>
  )
}
