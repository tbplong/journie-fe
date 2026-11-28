import type { ReactNode } from 'react'
import { Compass } from 'lucide-react'
import { motion, stagger, type Variants } from 'motion/react'
import { categories } from '../../domain/categories'
import type { CategoryId } from '../../domain/types'
import { useTr } from '../../hooks/useTr'
import { CategoryIcon } from '../icons'
import { popItem, riseItem } from '../motion/variants'

const emptyGroup: Variants = { hidden: {}, show: { transition: { delayChildren: stagger(0.08, { startDelay: 0.05 }) } } }
const pressLabel: Variants = { press: { scale: 0.94 } }

/** A category "sticker": the hand-drawn icon on a tinted paper chip with a hairline edge. */
export function CategoryGlyph({ cat, size = 36 }: { cat: CategoryId; size?: number }) {
  const color = categories[cat].color
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[0.5rem] border"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 13%, #fbf5e6)`, borderColor: `color-mix(in srgb, ${color} 32%, transparent)`, color: '#173f35' }}
      aria-hidden="true"
    >
      <CategoryIcon cat={cat} size={Math.round(size * 0.74)} />
    </span>
  )
}

export function CategoryName({ cat }: { cat: CategoryId }) {
  const { tr } = useTr()
  return <>{tr(categories[cat].vi, categories[cat].en)}</>
}

/** Fades in after a beat, so a quick load never flashes grey blocks. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`skeleton ${className}`}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
    />
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <motion.div className="panel flex flex-col items-center px-6 py-12 text-center" variants={emptyGroup} initial="hidden" animate="show">
      <motion.div variants={popItem}>
        <span className="grid size-14 place-items-center rounded-full border border-forest/15 bg-forest/5 text-forest/45" aria-hidden="true">
          <Compass size={26} />
        </span>
      </motion.div>
      <motion.h3 variants={riseItem} className="h-display mt-3 text-xl text-forest">
        {title}
      </motion.h3>
      <motion.p variants={riseItem} className="mt-1.5 max-w-sm text-sm text-ink/60">
        {body}
      </motion.p>
      {action && (
        <motion.div variants={riseItem} className="mt-5">
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}

/** A list or page that could not be loaded (server error, offline): told apart from one that is simply empty, with a retry. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { tr } = useTr()
  return (
    <EmptyState
      title={tr('Chưa tải được', 'Could not load it')}
      body={tr('Máy chủ hoặc mạng đang trục trặc. Dữ liệu của bạn vẫn còn, thử lại nhé.', 'The server or the network had a problem. Your data is still there; try again.')}
      action={
        <button type="button" className="btn-ghost" onClick={onRetry}>
          {tr('Thử lại', 'Try again')}
        </button>
      }
    />
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; hint?: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-[0.4rem] bg-forest/6 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <motion.button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            whileTap="press"
            className={`relative rounded-[0.3rem] px-3 py-2 text-[0.8rem] font-semibold transition-colors ${active ? 'text-paper' : 'text-ink/65 hover:text-ink'}`}
          >
            {active && (
              <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-[0.3rem] bg-forest" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
            )}
            <motion.span variants={pressLabel} className="relative block">
              {option.label}
            </motion.span>
            {option.hint && (
              <motion.span variants={pressLabel} className="relative block text-[0.65rem] font-normal opacity-70">
                {option.hint}
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.92 }}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${checked ? 'bg-firuze' : 'bg-forest/25'}`}
    >
      <motion.span
        className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  )
}

export function Meter({ value, max, tone = 'lapis', label }: { value: number; max: number; tone?: 'lapis' | 'warn' | 'danger'; label?: string }) {
  const ratio = Math.min(1.15, value / Math.max(1, max))
  const color = tone === 'danger' || ratio > 1 ? 'bg-pomegranate' : tone === 'warn' || ratio > 0.9 ? 'bg-sun' : 'bg-firuze'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-forest/10" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
      <motion.div className={`h-full w-full rounded-full ${color}`} initial={{ x: '-100%' }} animate={{ x: `${Math.min(100, ratio * 100) - 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  )
}
