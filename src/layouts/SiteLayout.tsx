import type { ReactNode } from 'react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { JourneyRail } from '../components/JourneyRail'
import { MagicCursor } from '../components/MagicCursor'
import { ScrollProgress } from '../components/ScrollProgress'
import { SmoothScroll } from '../components/SmoothScroll'
import { useLanguage } from '../hooks/useLanguage'

export function SiteLayout({ children }: { children: ReactNode }) {
  const { messages } = useLanguage()

  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink">
      <SmoothScroll />
      <ScrollProgress />
      <MagicCursor />
      <a href="#main-content" className="skip-link">
        {messages.accessibility.skipNavigation}
      </a>
      <Header />
      <JourneyRail />
      <main id="main-content" className="pt-18">
        {children}
      </main>
      <Footer />
    </div>
  )
}
