import type { Language } from '../types/i18n'
import { normalize } from './pois'
import type { Poi } from './types'

/** Place tags are data keys (`old-town`); this is how they read in each language. */
const TAGS: Record<string, [vi: string, en: string]> = {
  architecture: ['kiến trúc', 'architecture'],
  'banh-mi': ['bánh mì', 'banh mi'],
  beach: ['bãi biển', 'beach'],
  beef: ['thịt bò', 'beef'],
  birds: ['chim', 'birdlife'],
  boat: ['đi thuyền', 'boat ride'],
  bridge: ['cây cầu', 'bridge'],
  'cable-car': ['cáp treo', 'cable car'],
  cave: ['hang động', 'cave'],
  chinatown: ['phố Hoa', 'Chinatown'],
  church: ['nhà thờ', 'church'],
  clay: ['đồ gốm đất sét', 'clay craft'],
  coffee: ['cà phê', 'coffee'],
  'cooking-class': ['lớp nấu ăn', 'cooking class'],
  crab: ['cua', 'crab'],
  cruise: ['du thuyền', 'cruise'],
  factory: ['xưởng thủ công', 'workshop'],
  farm: ['nông trại', 'farm'],
  'fish-sauce': ['nước mắm', 'fish sauce'],
  garden: ['vườn', 'garden'],
  goat: ['thịt dê', 'goat'],
  heritage: ['di sản', 'heritage'],
  hike: ['đi bộ đường dài', 'hike'],
  history: ['lịch sử', 'history'],
  house: ['nhà cổ', 'old house'],
  island: ['đảo', 'island'],
  karst: ['núi đá vôi', 'karst'],
  lake: ['hồ', 'lake'],
  landmark: ['địa danh', 'landmark'],
  lanterns: ['đèn lồng', 'lanterns'],
  market: ['chợ', 'market'],
  museum: ['bảo tàng', 'museum'],
  'night-market': ['chợ đêm', 'night market'],
  noodles: ['món sợi', 'noodles'],
  'old-town': ['phố cổ', 'old town'],
  park: ['công viên', 'park'],
  pho: ['phở', 'pho'],
  pork: ['thịt heo', 'pork'],
  rice: ['cơm, gạo', 'rice'],
  'rice-field': ['ruộng lúa', 'rice fields'],
  riverfront: ['bờ sông', 'riverfront'],
  rooftop: ['sân thượng', 'rooftop'],
  sculpture: ['điêu khắc', 'sculpture'],
  seafood: ['hải sản', 'seafood'],
  seaside: ['ven biển', 'seaside'],
  shopping: ['mua sắm', 'shopping'],
  skyline: ['toàn cảnh thành phố', 'skyline'],
  'street-food': ['ăn vặt đường phố', 'street food'],
  sunset: ['hoàng hôn', 'sunset'],
  swim: ['bơi lội', 'swimming'],
  tea: ['trà', 'tea'],
  temple: ['đền chùa', 'temple'],
  'thang-co': ['thắng cố', 'thang co'],
  train: ['tàu hỏa', 'train'],
  unesco: ['UNESCO', 'UNESCO'],
  vegetarian: ['món chay', 'vegetarian'],
  view: ['view đẹp', 'great view'],
  viewpoint: ['điểm ngắm cảnh', 'viewpoint'],
  walk: ['đi dạo', 'stroll'],
  waterfall: ['thác nước', 'waterfall'],
}

/** Every tag the app has a name for. */
export const TAG_KEYS = Object.keys(TAGS)

export function tagLabel(tag: string, language: Language): string {
  const entry = TAGS[tag]
  return entry ? entry[language === 'vi' ? 0 : 1] : tag.replace(/-/g, ' ')
}

/** Prefix of an avoid key that names a word in a place's name: "name:pho" for "không ăn phở". */
export const NAME_TERM = 'name:'
/** The same for a word naming a kind of sight: it leaves out sights only, never a café or restaurant named after one ("Cộng Cà Phê Nhà Thờ"). */
export const SIGHT_TERM = 'sight:'
/** Tags for kinds of sights, whose words in a name say what the place is only when it is not somewhere to eat or drink. */
export const SIGHT_TAGS = new Set(['museum', 'park', 'garden', 'market', 'night-market', 'temple', 'church'])

/**
 * Words in a place's name that say what it serves, for the tags the data does not give food places ("hải sản" leaves out "Ốc Đào" and
 * "Hải Sản Biển Nhớ"). Words with a second meaning stay out: "cua" is also "cửa" (door) and "ghe" is also "ghế" (chair).
 */
const NAME_TERMS: Record<string, string[]> = { seafood: ['hai san', 'oc', 'ngheu'] }

/** The name-word avoid keys for these tags. */
export const nameTermsFor = (tags: readonly string[]) => tags.flatMap((tag) => (NAME_TERMS[tag] ?? []).map((term) => `${NAME_TERM}${term}`))

/** Accent-free words of a text, joined by single spaces, so a phrase can be looked for between word boundaries. */
export const wordsOf = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter(Boolean).join(' ')

const nameHas = (name: string, term: string) => ` ${wordsOf(name)} `.includes(` ${term} `)

/**
 * A place is avoided when the traveler excluded one of its tags, its whole category, or a word in its name (`avoid` holds all three kinds
 * of key). The data lists no dishes for most places, so a dish such as phở can only be told from a name like "Phở Minh".
 */
export const isAvoided = (poi: Pick<Poi, 'cat' | 'tags' | 'name'>, avoid: ReadonlySet<string>) =>
  avoid.has(poi.cat) ||
  poi.tags.some((tag) => avoid.has(tag)) ||
  [...avoid].some(
    (key) =>
      (key.startsWith(NAME_TERM) && nameHas(poi.name, key.slice(NAME_TERM.length))) ||
      (key.startsWith(SIGHT_TERM) && poi.cat !== 'food' && poi.cat !== 'cafe' && nameHas(poi.name, key.slice(SIGHT_TERM.length))),
  )
