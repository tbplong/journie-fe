import { useId } from 'react'
import { motion } from 'motion/react'
import { useLanguage } from '../hooks/useLanguage'

/** VI/EN toggle for dark surfaces (auth and the signed-in app). */
export function LangSwitch({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { language, messages, setLanguage } = useLanguage()
  const pill = useId()
  const dark = tone === 'dark'

  return (
    <div
      className={`inline-flex border p-0.5 ${dark ? 'border-paper/20 bg-paper/5' : 'border-forest/20 bg-paper'}`}
      role="group"
      aria-label={messages.accessibility.language}
    >
      {(['vi', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
          className={`relative min-w-9 px-2 py-1 text-[0.68rem] font-bold tracking-[0.12em] transition-colors ${
            language === option ? (dark ? 'text-night' : 'text-paper') : dark ? 'text-paper/60 hover:text-paper' : 'text-ink/70 hover:text-ink'
          }`}
        >
          {language === option && (
            <motion.span
              layoutId={pill}
              className={`absolute inset-0 ${dark ? 'bg-gold' : 'bg-forest'}`}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{option.toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}
