import type { ReactNode } from 'react'
import { motion, stagger, type Variants } from 'motion/react'
import { useAuthStore } from '../store/authStore'
import { EASE_OUT, riseItem } from './motion/variants'

const group: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.05, { startDelay: 0.03 }) } } }
const titleLine: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } } }
const routeDraw: Variants = { hidden: { clipPath: 'inset(0 100% 0 0)' }, show: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.45, delay: 0.12, ease: EASE_OUT } } }

/** Page title that settles in with a short fade (quick enough not to feel like a reload when moving between pages), then draws its little route. */
/** `titleName`: a view-transition name, so the same title on the page left (a trip's card) glides into this one. */
export function PageHeader({ title, titleNode, subtitle, actions, kicker, titleName }: { title: string; titleNode?: ReactNode; subtitle?: string; actions?: ReactNode; kicker?: ReactNode; titleName?: string }) {
  // The admin console has a plain, compact title
  const plain = useAuthStore((state) => state.user?.role === 'admin')
  if (plain)
    return (
      <header className="console-head">
        <div className="min-w-0">
          <h1>{titleNode ?? title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )
  return (
    <motion.header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4" variants={group} initial="hidden" animate="show">
      <div className="min-w-0">
        {kicker && (
          <motion.div variants={riseItem} className="mb-2 flex items-center gap-2 text-xs font-semibold text-terracotta-ink">
            {kicker}
          </motion.div>
        )}
        <h1 className="h-display flex items-center gap-3 text-[2.1rem] text-forest sm:text-[2.6rem]">
          <span className="min-w-0" style={titleName ? { viewTransitionName: titleName } : undefined}>
            <motion.span className="inline-block" variants={titleLine}>
              {titleNode ?? title}
            </motion.span>
          </span>
          <motion.span className="mt-2 hidden shrink-0 sm:block" variants={routeDraw} aria-hidden="true">
            <svg viewBox="0 0 56 14" width="56" height="14" className="block" fill="none">
              <path className="header-route" d="M2 7H40" stroke="#4fb8a4" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 6" />
              <circle className="header-pin" cx="49" cy="7" r="4.2" stroke="#d96745" strokeWidth="2.4" />
            </svg>
          </motion.span>
        </h1>
        {subtitle && (
          <motion.p variants={riseItem} className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-ink/65">
            {subtitle}
          </motion.p>
        )}
      </div>
      {actions && (
        // Outside the cascade on purpose: the page's main buttons must be usable at once.
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="flex flex-wrap items-center gap-2.5">
          {actions}
        </motion.div>
      )}
    </motion.header>
  )
}
