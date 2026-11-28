import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { track } from '../../api/analytics'
import { reportPoi, type ReportType } from '../../api/poiReports'
import { useTr } from '../../hooks/useTr'
import { toast } from '../../store/toastStore'
import { DeviceOnlyNote } from '../ui/DeviceOnlyNote'
import { Sheet } from '../ui/Sheet'

/** UC 1.5: tell Journie a place is closed, has the wrong hours or address, or something else is off. */
export function ReportSheet({ poiId, name, userId, open, onClose }: { poiId: string; name: string; userId: string; open: boolean; onClose: () => void }) {
  const { tr } = useTr()
  const [type, setType] = useState<ReportType>('closed')
  const [note, setNote] = useState('')
  const send = useMutation({
    mutationFn: reportPoi,
    onSuccess: () => {
      track({ type: 'poi_reported', poiId, detail: type })
      toast('success', tr('Cảm ơn bạn đã báo', 'Thanks for the report'), tr('Đội ngũ sẽ kiểm tra lại thông tin nơi này.', 'The team will check this place again.'))
      setNote('')
      onClose()
    },
    onError: () => toast('danger', tr('Chưa gửi được', 'Could not send it'), tr('Thử lại sau ít phút nhé.', 'Try again in a few minutes.')),
  })
  const options: { value: ReportType; label: string }[] = [
    { value: 'closed', label: tr('Đã đóng cửa hẳn', 'Closed for good') },
    { value: 'hours', label: tr('Sai giờ mở cửa', 'Wrong opening hours') },
    { value: 'address', label: tr('Sai địa chỉ hoặc vị trí', 'Wrong address or location') },
    { value: 'other', label: tr('Lý do khác', 'Something else') },
  ]
  const needsNote = type === 'other'
  return (
    <Sheet
      open={open}
      onClose={onClose}
      placement="center"
      width="max-w-md"
      title={tr('Báo thông tin sai', 'Report a problem')}
      description={name}
      footer={
        <div className="flex justify-end gap-2.5">
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            {tr('Huỷ', 'Cancel')}
          </button>
          <button type="button" className="btn-gold btn-sm" disabled={send.isPending || (needsNote && note.trim().length < 5)} onClick={() => send.mutate({ poiId, userId, type, note })}>
            {send.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {tr('Gửi báo cáo', 'Send report')}
          </button>
        </div>
      }
    >
      <fieldset>
        <legend className="text-[0.8rem] font-semibold text-ink/75">{tr('Điều gì chưa đúng?', 'What is wrong?')}</legend>
        <div className="mt-2 space-y-1.5">
          {options.map((option) => (
            <label key={option.value} className={`flex cursor-pointer items-center gap-2.5 border px-3 py-2.5 text-sm transition-colors ${type === option.value ? 'border-terracotta bg-terracotta/5' : 'border-forest/15 hover:border-gold'}`}>
              <input type="radio" name="report-type" value={option.value} checked={type === option.value} onChange={() => setType(option.value)} className="accent-[#d96745]" />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="report-note" className="mt-4 block text-[0.8rem] font-semibold text-ink/75">
        {needsNote ? tr('Mô tả (bắt buộc)', 'Details (required)') : tr('Ghi chú thêm (không bắt buộc)', 'More details (optional)')}
      </label>
      <textarea id="report-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder={tr('Ví dụ: quán dời sang số 12 cùng đường', 'e.g. it moved to number 12 on the same street')} className="mt-1.5 w-full resize-none border border-forest/25 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta" />
      <DeviceOnlyNote feature="poi-reports" className="mt-3" />
    </Sheet>
  )
}
