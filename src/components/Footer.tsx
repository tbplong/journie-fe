import type { PointerEvent } from 'react'
import { imageCredits, siteConfig } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'
import { SPARKLE_EVENT, type SparkleDetail } from './MagicCursor'
import { FooterSky } from './scenes/FooterSky'

function sparkleAtCenter(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  const rect = event.currentTarget.getBoundingClientRect()
  const detail: SparkleDetail = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.4, count: 16 }
  window.dispatchEvent(new CustomEvent(SPARKLE_EVENT, { detail }))
}

export function Footer() {
  const { messages } = useLanguage()

  return (
    <footer className="relative isolate overflow-hidden bg-ink py-14 text-paper">
      <FooterSky />

      <div className="container-shell relative">
        <div className="grid gap-10 border-b border-paper/12 pb-10 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-md">
            <div className="relative inline-block" data-cursor onPointerEnter={sparkleAtCenter}>
              <span aria-hidden="true" className="lamp-glow pointer-events-none absolute -inset-8 rounded-full" />
              <img
                src={siteConfig.logoLockupLight}
                alt={siteConfig.name}
                className="float-slow relative h-40 w-auto transition-transform duration-700 hover:scale-105 sm:h-44"
                width="601"
                height="600"
                loading="lazy"
              />
            </div>
            <p className="mt-6 text-sm leading-6 text-paper/65">{messages.footer.description}</p>
            <p className="mt-2 text-xs leading-5 text-paper/45">{messages.footer.brandStory}</p>
          </div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-paper/70"
            aria-label={messages.accessibility.footerNavigation}
          >
            {messages.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative py-1 transition-colors hover:text-sun after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-sun after:transition-transform after:duration-500 hover:after:scale-x-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <details className="border-b border-paper/12 py-6 text-xs text-paper/55">
          <summary className="cursor-pointer font-medium text-paper/70 transition-colors hover:text-sun">
            {messages.footer.credits}
          </summary>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imageCredits.map((credit, index) => (
              <p key={credit.source} className="leading-5">
                <a
                  href={credit.source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-paper/80 underline decoration-paper/25 underline-offset-3 transition-colors hover:text-sun hover:decoration-sun"
                >
                  {messages.footer.creditPlaces[index]}
                </a>
                <br />
                {credit.author} · {credit.license}
              </p>
            ))}
          </div>
        </details>

        <div className="flex flex-col gap-3 pt-7 text-[0.68rem] text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. {messages.footer.development}</p>
          <p>{messages.footer.tagline}</p>
        </div>
      </div>
    </footer>
  )
}
