import { useId, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { siteConfig } from '../content/site'
import { useActiveSection } from '../hooks/useActiveSection'
import { useLanguage } from '../hooks/useLanguage'
import { Magnetic } from './motion/Magnetic'

const navSectionIds = ['cau-chuyen', 'cach-hoat-dong', 'hanh-trinh', 'kham-pha'] as const
const ease = [0.22, 1, 0.36, 1] as const

function LanguageSwitcher() {
  const { language, messages, setLanguage } = useLanguage()
  const pillId = useId()

  return (
    <div
      className="inline-flex border border-forest/20 bg-paper p-1"
      role="group"
      aria-label={messages.accessibility.language}
    >
      {(['vi', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={`relative min-w-10 px-2 py-1.5 text-[0.68rem] font-bold tracking-[0.12em] transition-colors ${
            language === option ? 'text-paper' : 'text-ink/55 hover:text-ink'
          }`}
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
        >
          {language === option && (
            <motion.span
              layoutId={pillId}
              className="absolute inset-0 bg-forest"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{option.toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const { messages } = useLanguage()
  const { scrollY } = useScroll()
  const activeSection = useActiveSection(navSectionIds)
  const underlineId = useId()

  useMotionValueEvent(scrollY, 'change', (current) => {
    const previous = scrollY.getPrevious() ?? 0
    setScrolled(current > 24)
    setHidden(current > 560 && current > previous)
  })

  return (
    <motion.header
      animate={{ y: hidden && !isOpen ? '-100%' : '0%' }}
      transition={{ duration: 0.45, ease }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-500 ${
        scrolled
          ? 'border-forest/12 bg-paper/95 shadow-[0_10px_40px_-24px_rgba(23,63,53,0.5)]'
          : 'border-transparent bg-paper/70 backdrop-blur-xl'
      }`}
    >
      <div
        className={`container-shell flex items-center justify-between transition-[height] duration-500 ${
          scrolled ? 'h-16' : 'h-18'
        }`}
      >
        <a
          href="#top"
          className="group flex items-center gap-3 font-semibold text-ink"
          aria-label={messages.accessibility.home}
          onClick={() => setIsOpen(false)}
        >
          <img
            src={siteConfig.logoMark}
            alt=""
            className={`w-auto transition-all duration-500 group-hover:-rotate-6 ${scrolled ? 'h-10' : 'h-12'}`}
            width="384"
            height="512"
          />
          <span className="font-display text-xl tracking-[-0.03em]">{siteConfig.name}</span>
        </a>

        <nav
          className="hidden items-center gap-6 lg:flex xl:gap-8"
          aria-label={messages.accessibility.mainNavigation}
        >
          {messages.nav.map((item) => {
            const isActive = activeSection === item.href.slice(1)
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                className={`relative py-1 text-sm font-medium transition-colors hover:text-terracotta after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-terracotta/70 after:transition-transform after:duration-500 hover:after:scale-x-100 ${
                  isActive ? 'text-ink after:hidden' : 'text-ink/70'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId={underlineId}
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-terracotta"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </a>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Magnetic>
            <a href="#hanh-trinh" className="button-primary">
              {messages.headerCta}
              <ArrowUpRight aria-hidden="true" size={17} />
            </a>
          </Magnetic>
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center border border-forest/20 text-ink lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? messages.accessibility.closeMenu : messages.accessibility.openMenu}
          onClick={() => setIsOpen((open) => !open)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isOpen ? 'close' : 'open'}
              initial={{ rotate: -80, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 80, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {isOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.nav
            id="mobile-navigation"
            key="mobile-navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            className="overflow-hidden border-t border-forest/10 bg-paper lg:hidden"
            aria-label={messages.accessibility.mobileNavigation}
          >
            <div className="container-shell flex flex-col px-0 py-5">
              {messages.nav.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + index * 0.06, duration: 0.5, ease }}
                  className="border-b border-forest/10 py-4 font-medium text-ink last:border-0"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </motion.a>
              ))}
              <div className="flex items-center justify-between pt-5">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">
                  {messages.accessibility.language}
                </span>
                <LanguageSwitcher />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
