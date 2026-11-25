import { useId, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useTr } from '../../hooks/useTr'
import { Sheet } from './Sheet'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: string
  description?: string
  confirmLabel: string
  /** Red button for something that cannot be taken back. */
  danger?: boolean
  busy?: boolean
  /** The exact text to type before the button works (a destructive delete). */
  typeToConfirm?: string
  /** Shows an optional "reason" box; its text is handed to `onConfirm`. */
  reasonLabel?: string
  reasonOptions?: { value: string; label: string }[]
  children?: ReactNode
}

/** A centred yes/no dialog, optionally asking for a reason or for a name to be typed first. */
export function ConfirmSheet({ open, onClose, onConfirm, title, description, confirmLabel, danger, busy, typeToConfirm, reasonLabel, reasonOptions, children }: Props) {
  const { tr } = useTr()
  const id = useId()
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const close = () => {
    setTyped('')
    setReason('')
    onClose()
  }
  const ready = !typeToConfirm || typed.trim() === typeToConfirm.trim()
  return (
    <Sheet
      open={open}
      onClose={close}
      placement="center"
      width="max-w-md"
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2.5">
          <button type="button" className="btn-ghost btn-sm" onClick={close}>
            {tr('Huỷ', 'Cancel')}
          </button>
          <button
            type="button"
            className={danger ? 'btn-night btn-sm !bg-pomegranate' : 'btn-gold btn-sm'}
            disabled={!ready || busy}
            onClick={() => {
              onConfirm(reason)
              setTyped('')
              setReason('')
            }}
          >
            {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      {children}
      {reasonLabel && (
        <div className="mt-3">
          <label htmlFor={`${id}-reason`} className="block text-[0.8rem] font-semibold text-ink/75">
            {reasonLabel}
          </label>
          {reasonOptions ? (
            <select id={`${id}-reason`} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 h-11 w-full border border-forest/25 bg-white px-3 text-sm outline-none focus:border-terracotta">
              <option value="">{tr('Không nói lý do', 'No reason')}</option>
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <textarea id={`${id}-reason`} rows={2} maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full resize-none border border-forest/25 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta" />
          )}
        </div>
      )}
      {typeToConfirm && (
        <div className="mt-3">
          <label htmlFor={`${id}-type`} className="block text-[0.8rem] font-semibold text-ink/75">
            {tr(`Gõ “${typeToConfirm}” để xác nhận`, `Type “${typeToConfirm}” to confirm`)}
          </label>
          <input id={`${id}-type`} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" className="mt-1.5 h-11 w-full border border-forest/25 bg-white px-3 text-sm outline-none focus:border-terracotta" />
        </div>
      )}
    </Sheet>
  )
}
