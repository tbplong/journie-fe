import { useEffect, useState, type ReactNode } from 'react'
import { LanguageContext } from './LanguageContext'
import { messages, type Language } from './messages'

const STORAGE_KEY = 'journie-language'

function getInitialLanguage(): Language {
  const savedLanguage = localStorage.getItem(STORAGE_KEY)
  return savedLanguage === 'en' ? 'en' : 'vi'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const content = messages[language]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
    document.title = content.meta.title

    const metadata = [
      ['meta[name="description"]', content.meta.description],
      ['meta[property="og:title"]', content.meta.ogTitle],
      ['meta[property="og:description"]', content.meta.ogDescription],
      ['meta[property="og:locale"]', content.meta.ogLocale],
    ] as const

    metadata.forEach(([selector, value]) => {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value)
    })
  }, [content, language])

  return (
    <LanguageContext.Provider
      value={{ language, locale: language === 'vi' ? 'vi-VN' : 'en-US', messages: content, setLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  )
}
