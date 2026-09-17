import type { ReactNode } from 'react'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { useLanguage } from '../hooks/useLanguage'

export function SiteLayout({ children }: { children: ReactNode }) {
  const { messages } = useLanguage()

  return (
    <div className="min-h-screen overflow-hidden bg-paper text-ink">
      <a href="#main-content" className="skip-link">
        {messages.accessibility.skipNavigation}
      </a>
      <Header />
      <main id="main-content" className="pt-18">
        {children}
      </main>
      <Footer />
    </div>
  )
}
