import { HardDrive } from 'lucide-react'
import { isDeviceOnly } from '../../api/http'
import { useTr } from '../../hooks/useTr'

/** Says plainly that a feature's data stays in this browser because the backend has no route for it yet. */
export function DeviceOnlyNote({ feature, className = '', children }: { feature: string; className?: string; children?: string }) {
  const { tr } = useTr()
  if (!isDeviceOnly(feature)) return null
  return (
    <p className={`flex items-start gap-1.5 text-[0.74rem] leading-snug text-ink/55 ${className}`} role="note">
      <HardDrive size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
      {children ?? tr('Máy chủ chưa có API cho phần này, nên dữ liệu chỉ lưu trên trình duyệt này.', 'The server has no API for this yet, so the data stays in this browser only.')}
    </p>
  )
}
