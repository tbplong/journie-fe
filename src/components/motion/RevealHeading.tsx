import { motion, type Variants } from 'motion/react'
import { useMotionPrefs } from '../../hooks/useMotionPrefs'

export type HeadingPart = {
  text: string
  className?: string
  /** Extra classes for each word, e.g. a text effect that must sit on the word itself. */
  wordClassName?: string
  /** Render this part on its own line. */
  block?: boolean
}

type Props = {
  as?: 'h1' | 'h2' | 'h3'
  parts: readonly HeadingPart[]
  className?: string
  delay?: number
  stagger?: number
  /** Animate on mount instead of waiting for the heading to enter the viewport. */
  immediate?: boolean
}

const wordVariants: Variants = {
  hidden: { y: '112%', rotate: 4 },
  show: (custom: { index: number; delay: number; stagger: number }) => ({
    y: '0%',
    rotate: 0,
    transition: {
      delay: custom.delay + custom.index * custom.stagger,
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

const MotionTags = { h1: motion.h1, h2: motion.h2, h3: motion.h3 } as const

/**
 * Headline whose words rise out of a mask. The full text stays available to
 * assistive tech through aria-label while the split spans are hidden from it.
 * Keyed by its text so a language switch remounts and replays the reveal.
 */
export function RevealHeading({
  as = 'h2',
  parts,
  className,
  delay = 0,
  stagger = 0.055,
  immediate = false,
}: Props) {
  const { reduced } = useMotionPrefs()
  const Tag = MotionTags[as]
  const label = parts.map((part) => part.text.trim()).join(' ')
  let wordIndex = 0

  if (reduced) {
    return (
      <Tag className={className}>
        {parts.map((part, index) => (
          <span key={index} className={`${part.block ? 'block' : ''} ${part.className ?? ''}`}>
            {index > 0 && !part.block ? ' ' : ''}
            {part.text.trim()}
          </span>
        ))}
      </Tag>
    )
  }

  return (
    <Tag
      key={label}
      className={className}
      aria-label={label}
      initial="hidden"
      animate={immediate ? 'show' : undefined}
      whileInView={immediate ? undefined : 'show'}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
    >
      {parts.map((part, partIndex) => {
        const words = part.text.trim().split(/\s+/)

        return (
          <span
            key={partIndex}
            aria-hidden="true"
            className={`${part.block ? 'block' : ''} ${part.className ?? ''}`}
          >
            {partIndex > 0 && !part.block ? ' ' : ''}
            {words.map((word, index) => {
              const custom = { index: wordIndex++, delay, stagger }
              return (
                <span key={`${word}-${index}`}>
                  <span className="reveal-mask">
                    <motion.span
                      className={`inline-block origin-left ${part.wordClassName ?? ''}`}
                      variants={wordVariants}
                      custom={custom}
                    >
                      {word}
                    </motion.span>
                  </span>
                  {index < words.length - 1 ? ' ' : ''}
                </span>
              )
            })}
          </span>
        )
      })}
    </Tag>
  )
}
