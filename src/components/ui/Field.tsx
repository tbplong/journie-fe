import { useCallback, useEffect, useId, useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { AnimatePresence, cancelFrame, frame, motion, useAnimate, useMotionValueEvent } from 'motion/react'
import { AlertCircle } from 'lucide-react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'
import { useLight } from '../auth/light-context'
import { EASE_OUT } from '../motion/variants'

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string
  icon?: ReactNode
  error?: string
  hint?: string
  /** Slot on the right edge, e.g. the lamp that reveals a password. */
  trailing?: ReactNode
  /** For secret fields under the torch: the real input stays a password field, and the characters show only where the light falls. */
  lit?: { on: boolean; value: string }
  inputRef?: Ref<HTMLInputElement>
  inputClassName?: string
}

/** Labelled input for the auth pages. Colours come from the `--a-*` variables so it works by day and by night. */
/**
 * The characters of a secret, drawn over the field and masked to the torch's circle of light. The
 * dots layer is the inverse mask, so outside the light you still see how long the password is.
 */
function LitReadout({ value, on }: { value: string; on: boolean }) {
  const { x, y } = useLight()
  const ref = useRef<HTMLDivElement>(null)
  const place = useCallback(() => {
    const el = ref.current
    if (!el || !on) return
    const box = el.getBoundingClientRect()
    el.style.setProperty('--ox', `${x.get() - box.left}px`)
    el.style.setProperty('--oy', `${y.get() - box.top}px`)
  }, [x, y, on])
  // Both springs fire every frame; one read and write per frame is enough.
  const schedule = useCallback(() => frame.render(place), [place])
  useMotionValueEvent(x, 'change', schedule)
  useMotionValueEvent(y, 'change', schedule)
  useEffect(() => () => cancelFrame(place), [place])
  useLayoutEffect(place, [place, on, value])
  return (
    <div ref={ref} className="lit-readout" data-on={on} aria-hidden="true">
      <span className="lit-dots">{'•'.repeat(value.length)}</span>
      <span className="lit-chars">{value}</span>
    </div>
  )
}

export function Field({ label, icon, error, hint, trailing, lit, inputRef, inputClassName = '', className = '', id, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const { reduced } = useMotionPrefs()
  const [shell, animate] = useAnimate<HTMLDivElement>()
  const hasError = Boolean(error)

  // Shake in place instead of remounting the shell, which used to drop focus from the input as you typed.
  useEffect(() => {
    if (!hasError || reduced || !shell.current) return
    animate(shell.current, { x: [0, -7, 6, -4, 2, 0] }, { duration: 0.42, ease: 'easeInOut' })
  }, [hasError, reduced, animate, shell])

  return (
    <div className={`group/field ${className}`}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[0.78rem] font-semibold text-[color:var(--a-ink)] transition-[color,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/field:-translate-y-0.5 group-focus-within/field:text-[color:var(--a-accent)] motion-reduce:transition-none"
      >
        {label}
      </label>
      <div ref={shell} data-error={error ? 'true' : undefined} className="field-shell relative flex items-center">
        {icon && (
          <span
            className="pl-3.5 text-[color:var(--a-muted)] transition-[color,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/field:scale-110 group-focus-within/field:text-[color:var(--a-accent)] motion-reduce:transition-none"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            ref={inputRef}
            className={`field-input h-12 w-full bg-transparent px-3 text-[0.95rem] outline-none ${lit ? 'font-mono' : ''} ${lit?.on ? 'lit-input' : ''} ${inputClassName}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? `${inputId}-note` : undefined}
            {...rest}
          />
          {lit && <LitReadout value={lit.value} on={lit.on} />}
        </div>
        {trailing && <span className="relative z-[3] pr-1.5">{trailing}</span>}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 -bottom-px z-[2] h-0.5 origin-left scale-x-0 transition-[scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/field:scale-x-100 motion-reduce:transition-none ${error ? 'bg-[color:var(--a-error)]' : 'bg-[color:var(--a-accent)]'}`}
        />
      </div>
      <div id={`${inputId}-note`} className="min-h-5 pt-1.5 text-xs" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
              className="flex items-start gap-1.5 font-medium text-[color:var(--a-error)]"
            >
              <AlertCircle size={14} className="mt-px shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[color:var(--a-muted)]">
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
