import type { Messages } from '../i18n/messages'

export type Language = 'vi' | 'en'

export type LanguageContextValue = {
  language: Language
  locale: string
  messages: Messages
  setLanguage: (language: Language) => void
}
