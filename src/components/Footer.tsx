import type { PointerEvent } from 'react'
import { motion, type Variants } from 'motion/react'
import { imageCredits, siteConfig } from '../content/site'
import { cityGallery } from '../domain/cityMedia'
import { useLanguage } from '../hooks/useLanguage'
import { SPARKLE_EVENT, type SparkleDetail } from './MagicCursor'
import { Stagger } from './motion/Stagger'
import { EASE_OUT, riseItem } from './motion/variants'
import { FooterSky } from './scenes/FooterSky'
import { Logo } from './Logo'

/** Every city photo (covers and the planning wait screen), credited after the destination photos. */
const cityCredits = Object.values(cityGallery).flat()

const linkItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

function sparkleAtCenter(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  const rect = event.currentTarget.getBoundingClientRect()
  const detail: SparkleDetail = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.4, count: 16 }
  window.dispatchEvent(new CustomEvent(SPARKLE_EVENT, { detail }))
}

export function Footer() {
  const { messages, language } = useLanguage()

  return (
    <footer className="relative isolate overflow-hidden bg-ink py-14 text-paper">
      <FooterSky />

      <Stagger inView gap={0.07} className="container-shell relative">
        <div className="grid gap-10 border-b border-paper/12 pb-10 lg:grid-cols-[1fr_auto] lg:items-start">
          <motion.div variants={riseItem} className="max-w-md">
            <div className="relative inline-block" data-cursor onPointerEnter={sparkleAtCenter}>
              <span aria-hidden="true" className="lamp-glow pointer-events-none absolute -inset-8 rounded-full" />
              <Logo tone="light" height="clamp(6rem, 14vw, 7rem)" className="relative transition-transform duration-700 hover:scale-105" />
            </div>
            <p className="mt-6 text-sm leading-6 text-paper/65">{messages.footer.description}</p>
            <p className="mt-2 text-xs leading-5 text-paper/45">{messages.footer.brandStory}</p>
          </motion.div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-paper/70"
            aria-label={messages.accessibility.footerNavigation}
          >
            {messages.nav.map((item) => (
              <motion.a
                key={item.href}
                variants={linkItem}
                href={item.href}
                className="relative py-1 transition-colors hover:text-sun after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-sun after:transition-transform after:duration-500 hover:after:scale-x-100"
              >
                {item.label}
              </motion.a>
            ))}
          </nav>
        </div>

        <motion.details variants={linkItem} className="border-b border-paper/12 py-6 text-xs text-paper/55">
          <summary className="cursor-pointer font-medium text-paper/70 transition-colors hover:text-sun">
            {messages.footer.credits}
          </summary>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ...imageCredits.map((credit, index) => ({ ...credit, place: messages.footer.creditPlaces[index] })),
              ...cityCredits.map((photo) => ({ ...photo, place: photo.name[language === 'vi' ? 0 : 1] })),
            ].map((credit) => (
              <p key={credit.source} className="leading-5">
                <a
                  href={credit.source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-paper/80 underline decoration-paper/25 underline-offset-3 transition-colors hover:text-sun hover:decoration-sun"
                >
                  {credit.place}
                </a>
                <br />
                {credit.author} · {credit.license}
              </p>
            ))}
          </div>
        </motion.details>

        <motion.div
          variants={linkItem}
          className="flex flex-col gap-3 pt-7 text-[0.68rem] text-paper/50 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>© {new Date().getFullYear()} {siteConfig.name}. {messages.footer.development}</p>
          <p>{messages.footer.tagline}</p>
        </motion.div>
      </Stagger>
    </footer>
  )
}

