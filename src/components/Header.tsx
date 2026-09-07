import { useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { siteConfig } from '../content/site'
import { useLanguage } from '../i18n/LanguageContext'

function LanguageSwitcher() {
  const { language, messages, setLanguage } = useLanguage()

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
          className={`min-w-10 px-2 py-1.5 text-[0.68rem] font-bold tracking-[0.12em] transition-colors ${
            language === option
              ? 'bg-forest text-paper'
              : 'text-ink/55 hover:bg-cream hover:text-ink'
          }`}
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages } = useLanguage()

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-forest/10 bg-paper/90 backdrop-blur-xl">
      <div className="container-shell flex h-18 items-center justify-between">
        <a
          href="#top"
          className="group flex items-center gap-3 font-semibold text-ink"
          aria-label={messages.accessibility.home}
          onClick={() => setIsOpen(false)}
        >
          <img
            src={siteConfig.logoMark}
            alt=""
            className="h-12 w-auto transition-transform duration-300 group-hover:-rotate-3"
            width="384"
            height="512"
          />
          <span className="font-display text-xl tracking-[-0.03em]">{siteConfig.name}</span>
        </a>

        <nav
          className="hidden items-center gap-6 lg:flex xl:gap-8"
          aria-label={messages.accessibility.mainNavigation}
        >
          {messages.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-terracotta"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <a href="#hanh-trinh" className="button-primary">
            {messages.headerCta}
            <ArrowUpRight aria-hidden="true" size={17} />
          </a>
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center border border-forest/20 text-ink lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? messages.accessibility.closeMenu : messages.accessibility.openMenu}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
        </button>
      </div>

      {isOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-forest/10 bg-paper px-4 py-5 lg:hidden"
          aria-label={messages.accessibility.mobileNavigation}
        >
          <div className="container-shell flex flex-col">
            {messages.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border-b border-forest/10 py-4 font-medium text-ink last:border-0"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex items-center justify-between pt-5">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">
                {messages.accessibility.language}
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
