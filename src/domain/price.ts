/** Reading a place's price note (`price_raw` from the backend) into VND per person. Pure, no imports. */

export type PriceLevel = 1 | 2 | 3 | 4

const MULTIPLIER: Record<string, number> = { k: 1_000, nghin: 1_000, ngan: 1_000, tr: 1_000_000, trieu: 1_000_000, million: 1_000_000 }
// shortcut: one fixed rate (also used to show dollars in English); read a live rate if prices in USD become common
export const VND_PER_USD = 25_000
const AMOUNT = /(\d[\d.,]*)\s*(k\b|nghin|ngan|tr\b|trieu|million)?/g
const RANGE_JOIN = /^\s*(?:-|–|—|to|den|~)\s*(?:usd|\$|vnd|d\b)?\s*$/

const fold = (raw: string) => raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/₫/g, ' vnd ')

function amount(digits: string, unit: string | undefined, usd: boolean): number | undefined {
  const factor = unit ? MULTIPLIER[unit.trim()] : undefined
  // "30,000" and "30.000" group thousands; "1.5 million" is a decimal
  const value = factor && /[.,]\d{1,2}$/.test(digits) ? Number(digits.replace(',', '.')) : Number(digits.replace(/[.,]/g, ''))
  if (!Number.isFinite(value)) return undefined
  return Math.round(value * (factor ?? 1) * (usd ? VND_PER_USD : 1))
}

/** A stated price in VND: `max` equals `min` for one amount, `min` is 0 for "under X", and `max` is missing for "from X". */
export type StatedPrice = { min: number; max?: number }

/**
 * The price a note states: one amount ("Entry 40,000 dong"), a range ("100,000–200,000 dong per person", "USD5–7"), a ceiling
 * ("Under 100,000 dong") or a floor ("Mains from 45k"); `{0, 0}` for "free"; undefined when the note states no amount.
 */
export function readPrice(raw: string | null | undefined): StatedPrice | undefined {
  const text = fold(raw ?? '')
  if (!text.trim()) return undefined
  const usd = /\busd|\$/.test(text)
  const found = [...text.matchAll(AMOUNT)]
  if (!found.length) return /\b(free|mien phi)\b/.test(text) ? { min: 0, max: 0 } : undefined
  const first = found[0]
  const min = amount(first[1], first[2], usd)
  if (min === undefined) return undefined
  const second = found[1]
  if (second && RANGE_JOIN.test(text.slice(first.index! + first[0].length, second.index))) {
    // "50-70k" carries one unit for both ends
    const max = amount(second[1], second[2] ?? first[2], usd)
    const low = amount(first[1], first[2] ?? second[2], usd)
    if (max !== undefined && low !== undefined && max >= low) return { min: low, max }
  }
  const before = text.slice(0, first.index)
  if (/\b(under|below|up to|duoi|toi da)\s*(usd|\$)?\s*$/.test(before)) return { min: 0, max: min }
  if (/\b(from|starting at|tu)\s*(usd|\$)?\s*$/.test(before) || text.slice(first.index! + first[0].length).startsWith('+')) return { min }
  return { min, max: min }
}

/** One number to plan budgets with: a range's midpoint, half a ceiling, a floor itself. */
export const planningCost = (price: StatedPrice): number => Math.round((price.min + (price.max ?? price.min)) / 2)

const LEVELS: Record<string, PriceLevel> = { inexpensive: 1, moderate: 2, expensive: 3, 'very expensive': 4 }

/** A price level with no amount ("Price level: moderate", "₫₫"), 1 = inexpensive ... 4 = very expensive. */
export function priceLevelFrom(raw: string | null | undefined): PriceLevel | undefined {
  const named = fold(raw ?? '').match(/price level:\s*(very expensive|inexpensive|moderate|expensive)/)
  if (named) return LEVELS[named[1]]
  const dongs = (raw ?? '').match(/^\s*(₫{1,4})\s*$/)
  return dongs ? (dongs[1].length as PriceLevel) : undefined
}
