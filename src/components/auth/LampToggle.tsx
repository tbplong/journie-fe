import { motion } from 'motion/react'
import { EASE_OUT } from '../motion/variants'

const RAYS = ['M25 5.5L27.5 3.5', 'M27.4 10.2L30 10.6', 'M20.6 3.4L20.8 1']

/** A little torch. On, it glows and the whole page gets a soft light that follows the pointer. */
export function LampToggle({ on, onToggle, labelOn, labelOff }: { on: boolean; onToggle: (aim: { fieldX: number; fieldY: number }) => void; labelOn: string; labelOff: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.86 }}
      onClick={(event) => {
        // when the torch comes on it starts over the middle of the field it belongs to
        const shell = event.currentTarget.closest('.field-shell') ?? event.currentTarget
        const box = shell.getBoundingClientRect()
        onToggle({ fieldX: box.left + box.width * 0.42, fieldY: box.top + box.height / 2 })
      }}
      aria-pressed={on}
      aria-label={on ? labelOn : labelOff}
      title={on ? labelOn : labelOff}
      className="torch-btn relative grid size-10 place-items-center transition-colors"
      data-on={on}
    >
      <motion.svg
        viewBox="0 0 32 32"
        width="27"
        height="27"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        animate={on ? { rotate: [0, -14, 10, -5, 0] } : { rotate: 0 }}
        transition={{ duration: 0.7 }}
      >
        {/* handle and head of a torch, tilted */}
        <g transform="rotate(-38 16 16)">
          <path d="M12.5 24H19.5L18.2 14H13.8Z" fill="currentColor" fillOpacity={on ? 0.28 : 0.08} />
          <path d="M11 14H21L22.8 8.8H9.2Z" fill="currentColor" fillOpacity={on ? 0.5 : 0.14} />
          <path d="M14.5 17.5V20.5" />
        </g>
        {on &&
          RAYS.map((d, index) => (
            <motion.path
              key={d}
              d={d}
              strokeWidth="1.7"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.32, ease: EASE_OUT, delay: 0.12 + index * 0.06 }}
            />
          ))}
      </motion.svg>
      {on && <span className="torch-glow" aria-hidden="true" />}
    </motion.button>
  )
}
