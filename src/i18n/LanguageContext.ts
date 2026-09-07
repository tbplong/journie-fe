import { createContext, useContext } from 'react'
import type { Language, Messages } from './messages'

export type LanguageContextValue = {
  language: Language
  locale: string
  messages: Messages
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return context
}
