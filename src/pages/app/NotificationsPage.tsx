import { useState } from 'react'
import { Link } from 'react-router'
import { Bell, Megaphone, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { DeviceOnlyNote } from '../../components/ui/DeviceOnlyNote'
import { EmptyState } from '../../components/ui/primitives'
import { Sheet } from '../../components/ui/Sheet'
import { useNotifications, type MergedNotification } from '../../hooks/useNotifications'
import { useTr } from '../../hooks/useTr'

/** UC 6.15 "Receive system notification": every note, unread first to see, each opened in full and marked read on its own. */
export function NotificationsPage() {
  const { tr, language } = useTr()
  const { items, unread, markRead, remove, markAllRead, clear } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [open, setOpen] = useState<MergedNotification | null>(null)
  const shown = items.filter((item) => filter === 'all' || !item.read)
  const vi = language === 'vi'

  return (
    <>
      <PageHeader
        title={tr('Thông báo', 'Notifications')}
        actions={
          <>
            <button type="button" className="btn-ghost btn-sm" onClick={markAllRead} disabled={!unread}>
              {tr('Đánh dấu đã đọc hết', 'Mark all read')}
            </button>
            <button type="button" className="btn-ghost btn-sm !text-pomegranate" onClick={clear} disabled={!items.length}>
              {tr('Xoá tất cả', 'Clear all')}
            </button>
          </>
        }
      />
      <div role="tablist" aria-label={tr('Lọc thông báo', 'Filter notifications')} className="mb-5 inline-flex rounded-xl bg-forest/6 p-1">
        {(['all', 'unread'] as const).map((value) => (
          <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-lg px-4 py-2 text-[0.82rem] font-semibold ${filter === value ? 'bg-lapis text-paper' : 'text-ink/65'}`}>
            {value === 'all' ? tr(`Tất cả (${items.length})`, `All (${items.length})`) : tr(`Chưa đọc (${unread})`, `Unread (${unread})`)}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title={tr('Không có thông báo', 'No notifications')} body={tr('Cảnh báo chuyến đi và tin từ Journie sẽ hiện ở đây.', 'Trip alerts and messages from Journie show up here.')} />
      ) : (
        <ul className="panel divide-y divide-forest/8">
          {shown.map((item) => (
            <li key={item.id} className={`flex items-start gap-3 px-4 py-3 ${item.read ? '' : 'bg-sun/8'}`}>
              <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${item.kind === 'announcement' ? 'bg-lapis/10 text-lapis' : 'bg-terracotta/10 text-terracotta'}`} aria-hidden="true">
                {item.kind === 'announcement' ? <Megaphone size={15} /> : <Bell size={15} />}
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  markRead(item)
                  setOpen(item)
                }}
              >
                <p className={`text-sm ${item.read ? 'text-ink/80' : 'font-bold text-ink'}`}>{vi ? item.vi : item.en}</p>
                {(item.bodyVi || item.bodyEn) && <p className="mt-0.5 truncate text-xs text-ink/60">{vi ? item.bodyVi : item.bodyEn}</p>}
                <p className="mt-1 text-[0.7rem] text-ink/45">{new Date(item.at).toLocaleString(vi ? 'vi-VN' : 'en-US')}</p>
              </button>
              <button type="button" onClick={() => remove(item)} className="grid size-8 shrink-0 place-items-center text-ink/35 hover:text-pomegranate" aria-label={tr('Xoá thông báo', 'Delete notification')}>
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DeviceOnlyNote feature="notifications" className="mt-4">
        {tr('Máy chủ chưa có API thông báo; thông báo chỉ lưu trên trình duyệt này.', 'The server has no notifications API yet; notes are kept in this browser only.')}
      </DeviceOnlyNote>
      <Sheet open={!!open} onClose={() => setOpen(null)} placement="center" width="max-w-md" title={open ? (vi ? open.vi : open.en) : ''} description={open ? new Date(open.at).toLocaleString(vi ? 'vi-VN' : 'en-US') : undefined}>
        {open && (
          <div className="space-y-4">
            <p className="whitespace-pre-line text-sm text-ink/80">{(vi ? open.bodyVi : open.bodyEn) || tr('Không có nội dung thêm.', 'No more details.')}</p>
            {open.to && open.to !== '/app/notifications' && (
              <Link to={open.to} className="btn-gold btn-sm" onClick={() => setOpen(null)}>
                {tr('Mở', 'Open')}
              </Link>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}
