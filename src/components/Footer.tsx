import { imageCredits, siteConfig } from '../content/site'
import { useLanguage } from '../hooks/useLanguage'

export function Footer() {
  const { messages } = useLanguage()

  return (
    <footer className="bg-ink py-12 text-paper">
      <div className="container-shell">
        <div className="grid gap-10 border-b border-paper/12 pb-10 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-md">
            <div className="inline-flex bg-paper p-3">
              <img
                src={siteConfig.logoLockup}
                alt={siteConfig.name}
                className="h-28 w-auto"
                width="640"
                height="600"
                loading="lazy"
              />
            </div>
            <p className="mt-5 text-sm leading-6 text-paper/52">{messages.footer.description}</p>
            <p className="mt-2 text-xs leading-5 text-paper/38">{messages.footer.brandStory}</p>
          </div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-paper/65"
            aria-label={messages.accessibility.footerNavigation}
          >
            {messages.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-sun"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <details className="border-b border-paper/12 py-6 text-xs text-paper/48">
          <summary className="cursor-pointer font-medium text-paper/65">
            {messages.footer.credits}
          </summary>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imageCredits.map((credit, index) => (
              <p key={credit.source} className="leading-5">
                <a
                  href={credit.source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-paper/75 underline decoration-paper/25 underline-offset-3 hover:text-sun"
                >
                  {messages.footer.creditPlaces[index]}
                </a>
                <br />
                {credit.author} · {credit.license}
              </p>
            ))}
          </div>
        </details>

        <div className="flex flex-col gap-3 pt-7 text-[0.68rem] text-paper/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. {messages.footer.development}</p>
          <p>{messages.footer.tagline}</p>
        </div>
      </div>
    </footer>
  )
}
