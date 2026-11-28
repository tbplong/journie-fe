import { useCallback, useMemo } from 'react'
import { categories } from '../domain/categories'
import { hoursText, placeAddress, placeArea, placeName, placeNameOf } from '../domain/placeText'
import { formatVnd } from '../domain/time'
import type { PriceLevel } from '../domain/price'
import type { Poi } from '../domain/types'
import { useLanguage } from './useLanguage'

const PRICE_LEVEL: Record<PriceLevel, [string, string]> = { 1: ['Giá rẻ', 'Inexpensive'], 2: ['Giá vừa phải', 'Moderate'], 3: ['Giá cao', 'Expensive'], 4: ['Rất đắt', 'Very expensive'] }

/** Inline bilingual copy: `tr('Đăng nhập', 'Sign in')`. Keeps each string next to where it is used. */
export function useTr() {
  const { language, locale } = useLanguage()
  const tr = useCallback((vi: string, en: string) => (language === 'vi' ? vi : en), [language])
  /** `formatVnd` in the current language: `2.000.000 VND` in Vietnamese, `2,000,000 VND (≈ $80)` in English. */
  const money = useCallback((amount: number) => formatVnd(amount, language), [language])
  /** What a place costs per person as its data states it: an amount or range, "Free", a price level, else "Price unknown" (never the category guess). */
  const price = useCallback(
    (poi: Pick<Poi, 'cost' | 'costKnown' | 'costRange' | 'priceLevel'>) => {
      const range = poi.costRange
      if (range) {
        if (range.max === undefined) return tr(`Từ ${money(range.min)}`, `From ${money(range.min)}`)
        if (range.min === 0) return tr(`Dưới ${money(range.max)}`, `Under ${money(range.max)}`)
        return `${new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(range.min)}–${money(range.max)}`
      }
      if (poi.costKnown) return poi.cost ? money(poi.cost) : tr('Miễn phí', 'Free')
      if (poi.priceLevel) return tr(...PRICE_LEVEL[poi.priceLevel])
      return tr('Chưa rõ giá', 'Price unknown')
    },
    [language, money, tr],
  )
  /** A place name, ward and address as the current language reads them: in English "Phường Bến Thành" is "Ben Thanh Ward". */
  const place = useMemo(
    () => ({
      name: (name: string) => placeName(name, language),
      /** The name behind a place id, or "Place not loaded" when this browser does not have it. */
      nameOf: (poiId: string) => placeNameOf(poiId, language),
      area: (area: string) => placeArea(area, language),
      address: (address: string) => placeAddress(address, language),
      hours: (hours: string) => hoursText(hours, language),
      /** "Cafés · Ben Thanh Ward": the kind of place and where it is. */
      blurb: (poi: Pick<Poi, 'cat' | 'area'>) => `${tr(categories[poi.cat].vi, categories[poi.cat].en)}${poi.area ? ` · ${placeArea(poi.area, language)}` : ''}`,
    }),
    [language, tr],
  )
  return { tr, money, price, place, language, locale }
}
