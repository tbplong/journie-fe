import type { CategoryId } from './types'

export const categories: Record<CategoryId, { vi: string; en: string; color: string }> = {
  culture: { vi: 'Văn hóa', en: 'Culture', color: '#173f35' },
  food: { vi: 'Ẩm thực', en: 'Food', color: '#d96745' },
  cafe: { vi: 'Cà phê', en: 'Cafés', color: '#a0693a' },
  nature: { vi: 'Thiên nhiên', en: 'Nature', color: '#4c8f4a' },
  beach: { vi: 'Biển', en: 'Beach', color: '#3fa6b8' },
  market: { vi: 'Chợ & phố', en: 'Markets', color: '#e0a02b' },
  nightlife: { vi: 'Về đêm', en: 'Nightlife', color: '#705cc4' },
  adventure: { vi: 'Phiêu lưu', en: 'Adventure', color: '#8a3b2a' },
}

export const categoryIds = Object.keys(categories) as CategoryId[]

export const dietaryTags = [
  { id: 'seafood', vi: 'Hải sản', en: 'Seafood' },
  { id: 'peanut', vi: 'Đậu phộng', en: 'Peanuts' },
  { id: 'pork', vi: 'Thịt heo', en: 'Pork' },
  { id: 'beef', vi: 'Thịt bò', en: 'Beef' },
  { id: 'goat', vi: 'Thịt dê', en: 'Goat' },
] as const
