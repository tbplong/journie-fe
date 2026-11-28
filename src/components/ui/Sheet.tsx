import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, stagger, type Variants } from 'motion/react'
import { X } from 'lucide-react'
import { useTr } from '../../hooks/useTr'
import { EASE_OUT } from '../motion/variants'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Side sheet slides from the right (default); `center` is a modal for short confirmations. */
  placement?: 'right' | 'center'
  width?: string
  footer?: ReactNode
}

const EXIT_EASE = [0.4, 0, 1, 1] as const

const PANEL: Record<'right' | 'center', Variants> = {
  right: {
    hidden: { x: '100%' },
    show: { x: 0, transition: { type: 'spring', stiffness: 320, damping: 34, delayChildren: stagger(0.07, { startDelay: 0.12 }) } },
    exit: { x: '100%', transition: { duration: 0.2, ease: EXIT_EASE } },
  },
  center: {
    hidden: { y: 40, scale: 0.92, opacity: 0 },
    show: { y: 0, scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 26, delayChildren: stagger(0.06, { startDelay: 0.08 }) } },
    exit: { y: 12, scale: 0.98, opacity: 0, transition: { duration: 0.15, ease: EXIT_EASE } },
  },
}

// No exit state on purpose: the parts leave with the panel instead of one by one.
const PART: Record<'right' | 'center', Variants> = {
  right: {
    hidden: { opacity: 0, x: 36 },
    show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE_OUT } },
  },
  center: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  },
}

/** Accessible dialog: Escape and backdrop close it, focus moves in and returns to the trigger. */
export function Sheet({ open, onClose, title, description, children, placement = 'right', width = 'max-w-xl', footer }: SheetProps) {
  const { tr } = useTr()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<Element | null>(null)
  // Callers pass a new onClose on every render; depending on it re-ran the focus effect on each keystroke and pulled focus out of the input.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    returnTo.current = document.activeElement
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      ;(returnTo.current as HTMLElement | null)?.focus?.()
    }
  }, [open])

  // In the body, not where the page put it: a page with a transform (the route transition) turns `fixed` into "fixed to the page", so a
  // sheet inside it ran behind the bottom bar and its buttons could not be pressed.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          data-lenis-prevent
          className={`fixed inset-0 z-[80] flex ${placement === 'right' ? 'justify-end' : 'items-center justify-center p-4'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: EXIT_EASE } }}
        >
          <button type="button" aria-label={tr('Đóng', 'Close')} tabIndex={-1} className="absolute inset-0 cursor-default bg-night/60" onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={PANEL[placement]}
            initial="hidden"
            animate="show"
            exit="exit"
            className={`relative flex max-h-dvh w-full flex-col bg-paper outline-none ${width} ${
              placement === 'right' ? 'h-dvh border-l border-gold/50 shadow-2xl' : 'max-h-[88dvh] rounded-2xl border border-gold/50 shadow-2xl'
            }`}
          >
            <motion.header variants={PART[placement]} className="flex items-start justify-between gap-4 border-b border-forest/10 px-5 py-4 sm:px-6">
              <div>
                <h2 id={titleId} className="h-display text-[1.45rem] text-forest">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                className="grid size-10 shrink-0 place-items-center text-ink/55 transition-colors hover:text-terracotta"
                aria-label={tr('Đóng', 'Close')}
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <X size={20} />
              </motion.button>
            </motion.header>
            <motion.div variants={PART[placement]} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {children}
            </motion.div>
            {footer && (
              <motion.footer variants={PART[placement]} className="border-t border-forest/10 bg-cream/50 px-5 py-4 sm:px-6">
                {footer}
              </motion.footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
