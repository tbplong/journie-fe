import { useState } from 'react'
import { Bell, Loader2, LocateFixed, MapPinned } from 'lucide-react'
import { locationBlocker, locationProblemText, requestLocation, useLocationPermission, type LocationProblem } from '../../hooks/useLivePosition'
import { useTr } from '../../hooks/useTr'
import { Sheet } from '../ui/Sheet'

/**
 * UC 3.2 "Grant real-time location access": says why Journie wants the location, what it is used for and when it stops, then asks
 * the browser. A refusal leads to the demo mode instead of a dead end.
 */
export function LocationPermissionSheet({ open, onClose, onGranted, onDemo }: { open: boolean; onClose: () => void; onGranted: () => void; onDemo: () => void }) {
  const { tr } = useTr()
  const permission = useLocationPermission()
  const [asking, setAsking] = useState(false)
  const [problem, setProblem] = useState<LocationProblem | null>(locationBlocker())
  const [notify, setNotify] = useState(typeof Notification !== 'undefined' && Notification.permission === 'default')
  const blocked = problem ?? (permission === 'denied' ? 'denied' : null)

  const allow = async () => {
    setAsking(true)
    const result = await requestLocation()
    setAsking(false)
    if (typeof result === 'string') return setProblem(result)
    // Asked right after the location, while the traveler is already deciding about permissions (UC 3.5)
    if (notify && typeof Notification !== 'undefined') await Notification.requestPermission().catch(() => undefined)
    onGranted()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      placement="center"
      width="max-w-md"
      title={tr('Cho Journie biết bạn đang ở đâu?', 'Let Journie know where you are?')}
      footer={
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" className="btn-ghost btn-sm" onClick={onDemo}>
            {tr('Dùng chế độ mô phỏng', 'Use demo mode instead')}
          </button>
          <button type="button" className="btn-gold btn-sm" onClick={allow} disabled={asking || blocked === 'unsupported' || blocked === 'insecure'}>
            {asking ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
            {blocked === 'denied' ? tr('Thử lại', 'Try again') : tr('Cho phép vị trí', 'Allow location')}
          </button>
        </div>
      }
    >
      <ul className="space-y-3 text-sm text-ink/75">
        <li className="flex gap-2.5">
          <MapPinned size={17} className="mt-0.5 shrink-0 text-lapis" aria-hidden="true" />
          {tr('Để biết bạn đã tới điểm nào, còn bao lâu tới điểm kế, và đổi lịch khi có sự cố quanh bạn.', 'To tell which stop you reached, how long until the next one, and to adjust when something happens near you.')}
        </li>
        <li className="flex gap-2.5">
          <LocateFixed size={17} className="mt-0.5 shrink-0 text-lapis" aria-hidden="true" />
          {tr('Vị trí chỉ dùng trên máy này khi trang “Đang đi” mở, và dừng ngay khi bạn rời trang, kết thúc hoặc huỷ chuyến.', 'Your position is used on this device only while the live page is open, and stops as soon as you leave it, finish or cancel the trip.')}
        </li>
      </ul>
      {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink/75">
          <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="mt-1 accent-[#d96745]" />
          <span>
            <Bell size={14} className="mr-1 inline text-terracotta" aria-hidden="true" />
            {tr('Cũng cho phép thông báo, để biết khi lịch đổi lúc bạn đang tắt màn hình.', 'Also allow notifications, so you hear about plan changes while the screen is off.')}
          </span>
        </label>
      )}
      {blocked && (
        <p role="alert" className="mt-4 border-l-4 border-sun bg-sun/12 px-3 py-2 text-sm text-ink/80">
          {tr(...locationProblemText(blocked))}
        </p>
      )}
    </Sheet>
  )
}
