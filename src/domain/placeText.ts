import type { Language } from '../types/i18n'
import { poiById } from './pois'

/**
 * Reading a Vietnamese place in English: administrative words are translated ("Phường Bến Thành" is "Ben Thanh Ward", "Quận 1" is
 * "District 1"), street and building words too, the kind of place moves behind its name ("Chợ Bến Thành" is "Ben Thanh Market"), and the
 * proper names lose their tone marks, as they do on English maps. Names already in Latin letters pass through untouched. The data is
 * never changed; this only decides what is shown.
 */
export const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')

/** Tone marks gone and every word capitalised ("Chứng tích Chiến tranh" is "Chung Tich Chien Tranh"). */
const proper = (text: string) => plain(text).replace(/(^|[\s-])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase())

const CITY = /^(?:thành phố|tp\.?)\s*hồ chí minh$|^hồ chí minh(?:\s*city)?$|^ho chi minh$/i
const NUMBER = /^\d+$/

/** A segment of an address that names an administrative area, or null when it is something else. */
function adminSegment(segment: string): string | null {
  if (CITY.test(segment)) return 'Ho Chi Minh City'
  const m = segment.match(/^(thành phố|phường|quận|huyện|xã|thị trấn|đặc khu)\s+(.+)$/i)
  if (!m) return null
  const kind = m[1].toLowerCase()
  const rest = proper(m[2])
  const number = NUMBER.test(rest)
  if (kind === 'phường') return number ? `Ward ${rest}` : `${rest} Ward`
  if (kind === 'quận') return number ? `District ${rest}` : `${rest} District`
  if (kind === 'huyện') return `${rest} District`
  if (kind === 'xã') return `${rest} Commune`
  if (kind === 'thị trấn') return `${rest} Town`
  if (kind === 'đặc khu') return `${rest} Special Zone`
  return `${rest} City`
}

/** Street and building words at the front of an address segment, after an optional house number: [pattern, how to write it]. */
const STREET: [RegExp, (rest: string) => string][] = [
  [/^(?:đường|đ\.)\s+số\s+(.+)$/i, (r) => `Street No. ${r}`],
  [/^(?:đường|đ\.)\s+(.+)$/i, (r) => `${r} Street`],
  [/^(?:phố)\s+(.+)$/i, (r) => `${r} Street`],
  [/^(?:hẻm|hem)\s+(.+)$/i, (r) => `Alley ${r}`],
  [/^ngõ\s+(.+)$/i, (r) => `Lane ${r}`],
  [/^(?:quốc lộ|ql\.?)\s*(.+)$/i, (r) => `National Road ${r}`],
  [/^xa lộ\s+(.+)$/i, (r) => `${r} Highway`],
  [/^công trường\s+(.+)$/i, (r) => `${r} Square`],
  [/^cầu\s+(.+)$/i, (r) => `${r} Bridge`],
  [/^chung cư\s+(.+)$/i, (r) => `${r} Apartments`],
  [/^(?:toà nhà|tòa nhà)\s+(.+)$/i, (r) => `${r} Building`],
  [/^khu phố\s+(.+)$/i, (r) => `Quarter ${r}`],
  [/^khu dân cư\s+(.+)$/i, (r) => `${r} Residential Area`],
  [/^tầng\s+(.+)$/i, (r) => `Floor ${r}`],
  [/^lầu\s+(.+)$/i, (r) => `Floor ${r}`],
]

function streetSegment(segment: string): string {
  const m = segment.match(/^([\dA-Za-z/-]+\s+)?(.+)$/)
  const number = m?.[1] && /\d/.test(m[1]) ? m[1] : ''
  const body = number ? segment.slice(number.length) : segment
  for (const [pattern, write] of STREET) {
    const hit = body.match(pattern)
    if (hit) return `${number}${write(proper(hit[1].replace(/(^|\s)đường số(?=\s|$)/i, '$1Street No.')))}`.trim()
  }
  return proper(segment)
}

/** "Phường Bến Thành" in English: "Ben Thanh Ward". */
export function areaEn(area: string): string {
  return area
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => adminSegment(part) ?? streetSegment(part))
    .join(', ')
}

/** "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Thành phố Hồ Chí Minh" in English: "135 Nam Ky Khoi Nghia, Ben Thanh Ward, Ho Chi Minh City". */
export const addressEn = areaEn

/** The kind of place a name starts with, longest first: [pattern, the English word that goes after the proper name]. */
const KINDS: [RegExp, string][] = [
  [/^trung tâm thương mại\s+/i, 'Mall'],
  [/^phố đi bộ\s+/i, 'Walking Street'],
  [/^khu du lịch\s+/i, 'Tourist Area'],
  [/^quán cà phê\s+/i, 'Café'],
  [/^cà phê\s+/i, 'Café'],
  [/^nhà hàng\s+/i, 'Restaurant'],
  [/^quán ăn\s+/i, 'Eatery'],
  [/^nhà thờ\s+/i, 'Church'],
  [/^giáo xứ\s+/i, 'Parish'],
  [/^hội thánh\s+/i, 'Church'],
  [/^thánh đường\s+/i, 'Cathedral'],
  [/^bảo tàng\s+/i, 'Museum'],
  [/^công viên\s+/i, 'Park'],
  [/^phòng trưng bày\s+/i, 'Gallery'],
  [/^phòng tranh\s+/i, 'Gallery'],
  [/^phòng trà\s+/i, 'Music Lounge'],
  [/^nhà hát\s+/i, 'Theatre'],
  [/^bưu điện\s+/i, 'Post Office'],
  [/^địa đạo\s+/i, 'Tunnels'],
  [/^di tích\s+/i, 'Historic Site'],
  [/^chợ đêm\s+/i, 'Night Market'],
  [/^chợ\s+/i, 'Market'],
  [/^chùa\s+/i, 'Pagoda'],
  [/^tịnh xá\s+/i, 'Hermitage'],
  [/^hội quán\s+/i, 'Assembly Hall'],
  [/^đền\s+/i, 'Temple'],
  [/^đình\s+/i, 'Communal House'],
  [/^miếu\s+/i, 'Shrine'],
  [/^dinh\s+/i, 'Palace'],
  [/^vườn\s+/i, 'Garden'],
]

/** A place name in English: "Chợ Bến Thành" is "Ben Thanh Market". A branch in brackets is an address and is translated like one. */
export function nameEn(name: string): string {
  const branch = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (branch) return `${nameEn(branch[1])} (${addressEn(branch[2])})`
  if (plain(name) === name) return name
  for (const [pattern, word] of KINDS) {
    if (pattern.test(name)) return `${proper(name.replace(pattern, ''))} ${word}`.trim()
  }
  return proper(name)
}

const WEEKDAYS: Record<string, [vi: string, en: string]> = {
  Mo: ['T2', 'Mon'],
  Tu: ['T3', 'Tue'],
  We: ['T4', 'Wed'],
  Th: ['T5', 'Thu'],
  Fr: ['T6', 'Fri'],
  Sa: ['T7', 'Sat'],
  Su: ['CN', 'Sun'],
  PH: ['ngày lễ', 'holidays'],
}

/** Opening hours as the map data writes them ("Mo-Su 00:00-22:00; PH off") in words a traveler reads ("T2-CN 00:00-22:00; ngày lễ nghỉ"). */
export function hoursText(raw: string, language: Language): string {
  const text = raw.trim()
  const vi = language === 'vi'
  if (text === '24/7') return vi ? 'Mở cả ngày' : 'Open 24 hours'
  return text.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (day) => WEEKDAYS[day][vi ? 0 : 1]).replace(/\boff\b/gi, vi ? 'nghỉ' : 'closed')
}

export const placeName = (name: string, language: Language) => (language === 'en' ? nameEn(name) : name)
/** The name of the place behind an id; a trip, link or set can name a place this browser has not loaded. */
export const placeNameOf = (poiId: string, language: Language) => {
  const poi = poiById[poiId] as (typeof poiById)[string] | undefined
  return poi ? placeName(poi.name, language) : language === 'en' ? 'Place not loaded' : 'Địa điểm chưa tải được'
}
export const placeArea = (area: string, language: Language) => (language === 'en' ? areaEn(area) : area)
export const placeAddress = (address: string, language: Language) => (language === 'en' ? addressEn(address) : address)
