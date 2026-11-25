import type { Language } from '../types/i18n'
import { VND_PER_USD } from './price'

/** Clock helpers: the whole domain works in minutes after midnight. */

export const hm = (value: string): number => {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + (m || 0)
}

export const fmtTime = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Minutes in a day: a day that runs past midnight keeps counting on, so 03:00 the next day is 1620. */
export const DAY_MINUTES = 1440

/** The tag a time past midnight is shown with. */
export const nextDayTag = (vi = true) => (vi ? '(hôm sau)' : '(next day)')

/** A time as the traveler reads it: past midnight with its tag, "02:30 (hôm sau)". Midnight itself stays "00:00". */
export const fmtClock = (minutes: number, vi = true): string => (Math.round(minutes) > DAY_MINUTES ? `${fmtTime(minutes)} ${nextDayTag(vi)}` : fmtTime(minutes))

/** A span of time, the tag said once at its end: "09:00–03:00 (hôm sau)", "01:00–02:30 (hôm sau)". */
export const fmtSpan = (from: number, to: number, vi = true): string => `${fmtTime(from)}–${fmtTime(to)}${Math.round(to) > DAY_MINUTES ? ` ${nextDayTag(vi)}` : ''}`

/**
 * The end of a day window read from two clocks ('HH:MM' as minutes): an end at or before the start is the next day, so 09:00–03:00
 * ends at 1620 (18 h). An end already past midnight (1620) is kept.
 */
export const dayEndAfter = (start: number, end: number) => (end <= start ? end + DAY_MINUTES : end)

/** The latest a day may end: 05:00 the next morning. */
export const LATEST_DAY_END = DAY_MINUTES + 5 * 60
/**
 * The longest a day may be: 20 h on a one-day trip; 18 h on a longer one, where every day has the same hours, so the night between two days
 * keeps at least 6 h of rest (a 09:00–03:00 day leaves 03:00–09:00).
 */
export const maxDayLength = (days: number) => (days > 1 ? 18 * 60 : 20 * 60)

/** What is wrong with a day window in minutes (its end past midnight when it is the next day), or null when it can be planned. */
export function dayWindowProblem(start: number, end: number, days: number): 'day-window' | 'day-too-late' | 'day-too-long' | null {
  if (end <= start) return 'day-window'
  if (end > LATEST_DAY_END) return 'day-too-late'
  return end - start > maxDayLength(days) ? 'day-too-long' : null
}

export const fmtMinutes = (minutes: number, vi = true): string => {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return vi ? `${m} phút` : `${m} min`
  if (!m) return vi ? `${h} giờ` : `${h} h`
  return vi ? `${h} giờ ${m}` : `${h} h ${m}`
}

const isoOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Today in the traveler's own calendar (not UTC, which is still yesterday before 07:00 in Vietnam). */
export const todayIso = () => isoOf(new Date())

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return isoOf(date)
}

/** Calendar days from one ISO date to another (negative when `to` is earlier), the same in every time zone. */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

/** Weekday (0 = Sunday) of an ISO date, the same in every time zone. */
export const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay()

export function formatDate(iso: string, locale: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(`${iso}T00:00:00`)
  // A trip from the server or a share link may carry a malformed date; Intl throws on it and takes the page down
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, options ?? { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}


/** Prices are always written in full with the ISO code: `2.000.000 VND`; in English `2,000,000 VND (≈ $80)`. */
export const formatVnd = (amount: number, language: Language = 'vi'): string => {
  const rounded = Math.round(amount)
  if (language === 'vi') return `${new Intl.NumberFormat('vi-VN').format(rounded)} VND`
  const text = `${new Intl.NumberFormat('en-US').format(rounded)} VND`
  if (!rounded) return text
  const usd = Math.abs(rounded) / VND_PER_USD
  // A change can be negative: the sign goes before the dollar sign ("≈ -$9.6"), not after it
  return `${text} (≈ ${rounded < 0 ? '-' : ''}$${usd >= 10 ? Math.round(usd) : +usd.toFixed(1)})`
}
