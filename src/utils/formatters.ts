import type { Language } from '../types/i18n'

export function formatDuration(minutes: number, language: Language) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const parts: string[] = []

  if (hours) parts.push(language === 'vi' ? `${hours} giờ` : `${hours} hr`)
  if (remainingMinutes) {
    parts.push(language === 'vi' ? `${remainingMinutes} phút` : `${remainingMinutes} min`)
  }

  return parts.join(' ')
}

export function formatCost(amount: number, locale: string) {
  return `~${new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)}`
}

export function formatDistance(distanceKm: number, locale: string) {
  return distanceKm < 1
    ? new Intl.NumberFormat(locale, { style: 'unit', unit: 'meter' }).format(distanceKm * 1000)
    : new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'kilometer',
        maximumFractionDigits: 1,
      }).format(distanceKm)
}
