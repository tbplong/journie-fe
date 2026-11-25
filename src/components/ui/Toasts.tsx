import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { useTr } from '../../hooks/useTr'
import { useToastStore, type ToastTone } from '../../store/toastStore'

const TONES: Record<ToastTone, { icon: typeof Info; ring: string; text: string }> = {
  info: { icon: Info, ring: 'border-lapis/40', text: 'text-lapis' },
  success: { icon: CheckCircle2, ring: 'border-firuze/60', text: 'text-jade-ink' },
  warning: { icon: AlertTriangle, ring: 'border-sun/70', text: 'text-sun-ink' },
  danger: { icon: XCircle, ring: 'border-pomegranate/60', text: 'text-pomegranate' },
}

const SPRING = { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 } as const
const EXIT_EASE = [0.4, 0, 1, 1] as const

export function Toasts() {
  const { tr } = useTr()
  const { toasts, dismiss } = useToastStore()
  // Toasts sit bottom-right on wide screens and bottom-centre on phones, so they arrive from that edge.
  const fromSide = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[95] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-8" aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout" anchorY="bottom">
        {toasts.map((toast) => {
          const tone = TONES[toast.tone]
          const Icon = tone.icon
          return (
            <motion.div
              key={toast.id}
              layout
              initial={fromSide ? { opacity: 0, x: 96, scale: 0.96 } : { opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={
                fromSide
                  ? { opacity: 0, x: 72, transition: { duration: 0.18, ease: EXIT_EASE } }
                  : { opacity: 0, y: 18, scale: 0.96, transition: { duration: 0.16, ease: EXIT_EASE } }
              }
              transition={SPRING}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border-l-4 bg-paper px-4 py-3 shadow-[0_18px_40px_-16px_rgba(9,13,43,0.6)] ${tone.ring}`}
              role={toast.tone === 'danger' || toast.tone === 'warning' ? 'alert' : 'status'}
            >
              <motion.span
                className={`mt-0.5 grid shrink-0 ${tone.text}`}
                initial={{ scale: 0.3, rotate: -35, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.12 }}
                aria-hidden="true"
              >
                <Icon size={19} />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{toast.title}</p>
                {toast.body && <p className="mt-0.5 text-[0.82rem] leading-snug text-ink/70">{toast.body}</p>}
                {toast.action && (
                  <button
                    type="button"
                    className="mt-1.5 text-[0.8rem] font-bold text-lapis underline-offset-4 hover:underline"
                    onClick={() => {
                      toast.action?.run()
                      dismiss(toast.id)
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <motion.button
                type="button"
                className="text-ink/40 transition-colors hover:text-ink"
                onClick={() => dismiss(toast.id)}
                aria-label={tr('Đóng', 'Dismiss')}
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <X size={16} />
              </motion.button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
