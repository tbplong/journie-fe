import { categories } from './categories'
import { cities, cityById, cityNamed, normalize, pois } from './pois'
import { nameTermsFor } from './tags'
import type { Conflict, Extraction } from './extraction'
import { hm } from './time'
import type { CategoryId, CityId, Interests, Pace, Poi, TransportPref } from './types'

/**
 * Stand-in for the Gemini intent-extraction call (report §5.8): free text in, a structured and
 * validated request out. Everything here is shown to the traveler as editable chips, so the user can
 * see exactly which parts of their wish became hard constraints and which became soft preferences.
 */

export type Intent = {
  city?: CityId
  days?: number
  budget?: number
  budgetHard: boolean
  interests: Interests
  keywords: string[]
  pace?: Pace
  avoidTags: string[]
  mustInclude: string[]
  transport?: TransportPref
  dayStart?: number
  dayEnd?: number
  /** Evening venues a day the traveler asked for ("3 quán bar mỗi đêm"); the planner's own limit is one. */
  nightsPerDay?: number
  /** What the backend model extracted; the places are retrieved with it. */
  extraction?: Extraction
  /** YYYY-MM-DD when the request named a start date; only the backend reader sets it. */
  startDate?: string
  /** True when the model found a value too vague to use ("khoảng", "giá rẻ") and wants the traveler to confirm. */
  needsClarification?: boolean
  /** True when text was written but the model found nothing in it to plan with, so it did not change the plan. */
  textIgnored?: boolean
  /** Contradictions it noticed, such as an end date before the start date. */
  conflicts?: Conflict[]
  /** A destination the traveler named that we have no places for; planning waits until they pick a covered city. */
  unsupportedDestination?: string
  chips: IntentChip[]
}

export type IntentChip = {
  kind: 'hard' | 'soft'
  field: 'city' | 'days' | 'budget' | 'interest' | 'pace' | 'avoid' | 'must' | 'transport' | 'time'
  vi: string
  en: string
}


export const INTEREST_RULES: [CategoryId, RegExp, string[]][] = [
  ['food', /\b(an uong|am thuc|mon ngon|an ngon|food|eat|foodie|pho|banh mi|bun|hu tieu|hai san|dac san)\b/, []],
  ['cafe', /\b(ca phe|cafe|coffee|caphe)\b/, ['coffee']],
  ['culture', /\b(van hoa|lich su|bao tang|di san|culture|history|museum|heritage|chua|den)\b/, []],
  ['beach', /\b(bien|tam bien|beach|swim|boi)\b/, []],
  ['nature', /\b(thien nhien|nui|thac|song|nature|trekking|hike|leo nui|rung)\b/, []],
  ['market', /\b(cho|cho dem|night market|market|mua sam|shopping)\b/, []],
  // Drinking is a night out ("uống rượu", "đi nhậu", "bia hơi", "cocktail"). Folded, two of these words are also other words: "nhau"
  // is nhậu or nhau (each other), told apart by the written accents or, without accents, by the word before it (SAME_FOLDED and
  // EACH_OTHER below; match these rules with `ruleMatches` or `writtenMatches`); "bia" is also a stone stele ("bia tiến sĩ",
  // "nhà bia", "bia mộ"), written the same, so the rule leaves those out itself. "drinks" counts only in a going-out phrase
  // ("go for drinks", "grab a drink", "drinks with friends"), because "food and drinks" or "fruit drinks" are not a night out.
  ['nightlife', /\b(ve dem|nightlife|bars?|pubs?|clubs?|skybar|lounges?|cocktails?|beers?|wines?|whiske?y|(?:go(?:ing)?(?: out)? for|out for|grab|have) (?:a |some |a few )?drinks?|drinks? with (?:my |some )?friends|drinking|ruou|nhau|(?<!\b(?:nha|tam|van|doi) )bia(?! (?:da )?(?:tien si|mo|tuong niem|ky niem|ghi danh)))\b/, []],
  ['adventure', /\b(phieu luu|mao hiem|adventure|thrill|cap treo|kham pha)\b/, []],
]

export const KEYWORD_RULES: [RegExp, string][] = [
  [/\b(chup anh|song ao|check in|checkin|view dep|ngam canh|viewpoint)\b/, 'viewpoint'],
  [/\b(rooftop|san thuong)\b/, 'rooftop'],
  // a sunset is watched before the evening rules for bars apply, so it is a wish, not a night out
  [/\b(hoang hon|sunset)\b/, 'sunset'],
  [/\b(ao dai|den long|lantern)\b/, 'lanterns'],
  [/\b(an chay|vegetarian|vegan)\b/, 'vegetarian'],
  [/\b(street food|an vat|an via he)\b/, 'street-food'],
  [/\b(thuyen|boat|di do)\b/, 'boat'],
]

export const AVOID_RULES: [RegExp, string[], string, string][] = [
  // The spaces inside a dish name are optional: the backend sometimes returns "haisan" for "hải sản"
  [/(di ung|allerg\w*)\s*(hai ?san|seafood|tom|cua|ghe|ca(?!\s*phe))\b/, ['seafood'], 'Dị ứng hải sản', 'Seafood allergy'],
  [/(kieng|khong an|no)\s*(hai ?san|seafood|tom|cua|ghe|ca(?!\s*phe))\b/, ['seafood'], 'Không ăn hải sản', 'No seafood'],
  [/(di ung|kieng|khong an|allerg\w*|no)\s*(dau ?phong|peanut|lac)\b/, ['peanut'], 'Dị ứng đậu phộng', 'Peanut allergy'],
  [/(khong an|kieng|no)\s*(thit ?heo|thit ?lon|pork)\b/, ['pork'], 'Không ăn thịt heo', 'No pork'],
  [/(khong an|kieng|no)\s*(thit ?bo|beef)\b/, ['beef'], 'Không ăn thịt bò', 'No beef'],
  [/\b(an chay|vegetarian|vegan)\b/, ['seafood', 'pork', 'beef', 'goat'], 'Ăn chay', 'Vegetarian'],
]

/** Longest trip the planner builds. */
export const MAX_TRIP_DAYS = 7
/** Weight of an interest the traveler named (soft preference, 0..1). */
export const INTEREST_WEIGHT = 0.95
/** Amounts below this are read as noise ("2k"), not a trip budget. */
export const MIN_BUDGET_VND = 100_000
/** A place is spotted in free text only by a name at least this long, so short words never match. */
export const MIN_POI_HEAD = 6

/** A place's short normalised name ("Hội quán Phúc Kiến (Fujian)" gives "hoi quan phuc kien"), used to spot it in text. */
export function poiHead(poi: Poi): string {
  const short = normalize(poi.name).replace(/\(.*?\)/g, '').trim()
  return short.split(/ & | – /)[0]
}

/** Up to two words after a negation, ending where a keyword starts: "khong an ca phe", "no coffee", "tranh cho dem". */
const NEGATION = /\b(?:khong|ko|dung|tranh|kieng|bo qua|no|not|without|skip)\s+(?:[a-z]+\s+){0,2}$/

/** Where `pattern` occurs in the normalised text `t`, and whether each occurrence sits right after a negation. */
export function occurrences(t: string, pattern: RegExp): { negated: boolean }[] {
  const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  return [...t.matchAll(global)].map((m) => ({ negated: NEGATION.test(t.slice(Math.max(0, m.index - 30), m.index)) }))
}

/**
 * Folded words that are also other everyday words: "cho" is chợ (a market) but also chỗ (a spot) and cho (for), "den" is đền but
 * also đến (to), "pho" is phở but also phố (a street). A rule that matched only such a word counts when the traveler wrote that
 * accent, or wrote no accents at all, so "chỗ ngắm hoàng hôn" is not read as a wish for a market. "nhau" is nhậu (a drinking
 * night) but also nhau (each other), "ruou" only rượu, and "bia" (beer) is not bìa (a cover) or bịa (made up).
 */
export const SAME_FOLDED: Record<string, string[]> = { cho: ['chợ'], chua: ['chùa'], den: ['đền'], pho: ['phở'], song: ['sông'], boi: ['bơi'], bien: ['biển'], nhau: ['nhậu'], ruou: ['rượu'], bia: ['bia'] }
/** Without accents, "nhau" after these words is "each other" ("cung nhau", "hen nhau"); with accents the accent tells nhậu from nhau. */
const EACH_OTHER = /\b(?:cung|voi|gap|ben|lan|khac|giong|nhu|giup|yeu|thuong|hen|chia) $/

/**
 * Where the folded-text rule `pattern` occurs in `written`, and whether each occurrence sits right after a negation. An ambiguous
 * word in `forms` is left out where its written accents say it is the other word; with `strict`, it counts only where the accents
 * written confirm it (text without accents never does).
 */
export function writtenMatches(pattern: RegExp, written: string, forms: Record<string, string[]> = SAME_FOLDED, strict = false): { negated: boolean }[] {
  const nfc = written.normalize('NFC').toLowerCase()
  const folded = normalize(nfc)
  const plain = folded === nfc
  // When folding changed the length the positions do not line up and the accents cannot be read: the folded match decides
  const unread = plain || folded.length !== nfc.length
  const found: { negated: boolean }[] = []
  for (const m of folded.matchAll(new RegExp(pattern.source, 'g'))) {
    const accented = forms[m[0]]
    if (accented && (unread ? strict : !accented.includes(nfc.slice(m.index, m.index + m[0].length)))) continue
    if (plain && m[0] === 'nhau' && EACH_OTHER.test(folded.slice(0, m.index))) continue
    found.push({ negated: NEGATION.test(folded.slice(Math.max(0, m.index - 30), m.index)) })
  }
  return found
}

/** `pattern` (a rule on folded text) matches `written`, with the accents of the ambiguous words in `forms` checked. */
export const ruleMatches = (pattern: RegExp, written: string, forms: Record<string, string[]> = SAME_FOLDED, strict = false) =>
  writtenMatches(pattern, written, forms, strict).length > 0

/** True when `pattern` is stated at least once and not negated: "thich ca phe" yes, "khong ca phe" no. */
export const affirmed = (t: string, pattern: RegExp) => occurrences(t, pattern).some((o) => !o.negated)

/** Wording for pace and transport, matched on normalised text; shared with the backend adapter, which applies it to the model's own `other` notes. */
// Whole words only: "o to" inside "cho toi" is not a taxi, and "cham" inside "chamomile" is not a slow pace
export const PACE_RULES: [Pace, RegExp][] = [
  ['slow', /\b(?:cham|thong tha|thu thai|chill|slow|relax|nhe nhang|khong voi)\b/],
  ['fast', /\b(?:nhanh|day dac|nhieu cho|packed|fast|full|toi da diem)\b/],
]
export const TRANSPORT_RULES: [TransportPref, RegExp, [vi: string, en: string]][] = [
  // "phố đi bộ" (a walking street) is a place to visit, not a way to get around
  ['walk', /(?<!\bpho )\bdi bo\b|\bwalk/, ['Ưu tiên đi bộ', 'Prefer walking']],
  ['bike', /\b(?:xe may|grab bike|motorbike|scooter|xe om)\b/, ['Đi xe máy', 'By motorbike']],
  ['taxi', /\b(?:taxi|grab car|o to|car)\b/, ['Đi taxi', 'By taxi']],
]
export const PACE_LABEL: Record<Pace, [vi: string, en: string]> = { slow: ['Nhịp chậm', 'Slow pace'], balanced: ['Nhịp vừa', 'Balanced pace'], fast: ['Nhịp nhanh', 'Fast pace'] }

const NUMBER_WORDS: Record<string, number> = { mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, sau: 6, bay: 7, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }

const num = (raw: string) => Number(raw.replace(',', '.'))

export function extractIntent(text: string): Intent {
  const t = normalize(text)
  const intent: Intent = { budgetHard: false, interests: {}, keywords: [], avoidTags: [], mustInclude: [], chips: [] }
  const chip = (c: IntentChip) => intent.chips.push(c)

  // Destination
  const named = cityNamed(t)
  if (named) {
    intent.city = named
    chip({ kind: 'hard', field: 'city', vi: cityById[named].name, en: cityById[named].nameEn })
  }

  // Duration
  const digitDays = t.match(/(\d+)\s*(ngay|dem|day|night)/)
  const wordDays = t.match(/\b(mot|hai|ba|bon|nam|sau|bay|one|two|three|four|five|six|seven)\s*(ngay|dem|day|night)/)
  if (digitDays) intent.days = Math.min(MAX_TRIP_DAYS, Math.max(1, Number(digitDays[1])))
  else if (wordDays) intent.days = NUMBER_WORDS[wordDays[1]]
  else if (/cuoi tuan|weekend/.test(t)) intent.days = 2
  else if (/trong ngay|1 ngay|a day|one day|mot ngay/.test(t)) intent.days = 1
  if (intent.days) chip({ kind: 'hard', field: 'days', vi: `${intent.days} ngày`, en: `${intent.days} day${intent.days > 1 ? 's' : ''}` })

  // Budget
  const million = t.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr\b|million|m\b)/)
  const thousand = t.match(/(\d+(?:[.,]\d+)?)\s*(k\b|nghin|ngan|thousand)/)
  if (million) intent.budget = Math.round(num(million[1]) * 1_000_000)
  else if (thousand) intent.budget = Math.round(num(thousand[1]) * 1_000)
  if (intent.budget && intent.budget >= MIN_BUDGET_VND) {
    intent.budgetHard = /toi da|khong qua|duoi|under|max|at most|no more/.test(t)
    chip({
      kind: intent.budgetHard ? 'hard' : 'soft',
      field: 'budget',
      vi: `${intent.budgetHard ? 'Tối đa' : 'Khoảng'} ${new Intl.NumberFormat('vi-VN').format(intent.budget)} VND`,
      en: `${intent.budgetHard ? 'Max' : 'About'} ${new Intl.NumberFormat('en-US').format(intent.budget)} VND`,
    })
  } else {
    intent.budget = undefined
  }
  if (!intent.budget && /tiet kiem|binh dan|gia re|budget|cheap|limited budget/.test(t)) {
    intent.budget = 1_500_000
    chip({ kind: 'soft', field: 'budget', vi: 'Tiết kiệm', en: 'Budget-friendly' })
  }

  // Interests become soft weights; the accents written tell the ambiguous words apart ("cho nhau" is neither chợ nor nhậu)
  for (const [cat, pattern, words] of INTEREST_RULES) {
    const found = writtenMatches(pattern, text)
    if (found.some((o) => !o.negated)) {
      intent.interests[cat] = INTEREST_WEIGHT
      intent.keywords.push(...words)
      chip({ kind: 'soft', field: 'interest', vi: categories[cat].vi, en: categories[cat].en })
    } else if (found.length > 0) {
      // "không cà phê" is something to avoid, never an interest
      intent.avoidTags.push(cat)
      chip({ kind: 'hard', field: 'avoid', vi: `Tránh: ${categories[cat].vi}`, en: `Avoid: ${categories[cat].en}` })
    }
  }
  for (const [pattern, word] of KEYWORD_RULES) if (affirmed(t, pattern) && !intent.keywords.includes(word)) intent.keywords.push(word)

  // Pace
  intent.pace = PACE_RULES.find(([, pattern]) => affirmed(t, pattern))?.[0]
  if (intent.pace) chip({ kind: 'soft', field: 'pace', vi: PACE_LABEL[intent.pace][0], en: PACE_LABEL[intent.pace][1] })

  // Allergies and diet are hard
  for (const [pattern, tags, vi, en] of AVOID_RULES) {
    if (pattern.test(t)) {
      intent.avoidTags.push(...[...tags, ...nameTermsFor(tags)].filter((tag) => !intent.avoidTags.includes(tag)))
      chip({ kind: 'hard', field: 'avoid', vi, en })
    }
  }

  // Transport
  const ride = TRANSPORT_RULES.find(([, pattern]) => affirmed(t, pattern))
  if (ride) {
    intent.transport = ride[0]
    chip({ kind: 'soft', field: 'transport', vi: ride[2][0], en: ride[2][1] })
  }

  // Times
  const startMatch = t.match(/(?:bat dau|xuat phat|tu|start(?:ing)?(?: at)?)\s*(?:luc\s*)?(\d{1,2})\s*(?:h|gio|:|am)?(\d{2})?/)
  const endMatch = t.match(/(?:ve truoc|ket thuc|truoc|until|back by|finish by)\s*(?:luc\s*)?(\d{1,2})\s*(?:h|gio|:|pm)?(\d{2})?/)
  if (startMatch && Number(startMatch[1]) >= 5 && Number(startMatch[1]) <= 12) intent.dayStart = hm(`${startMatch[1]}:${startMatch[2] ?? '00'}`)
  if (endMatch && Number(endMatch[1]) >= 15 && Number(endMatch[1]) <= 23) intent.dayEnd = hm(`${endMatch[1]}:${endMatch[2] ?? '00'}`)
  if (intent.dayStart !== undefined || intent.dayEnd !== undefined) {
    const from = intent.dayStart !== undefined ? `${String(Math.floor(intent.dayStart / 60)).padStart(2, '0')}:${String(intent.dayStart % 60).padStart(2, '0')}` : '…'
    const to = intent.dayEnd !== undefined ? `${String(Math.floor(intent.dayEnd / 60)).padStart(2, '0')}:${String(intent.dayEnd % 60).padStart(2, '0')}` : '…'
    chip({ kind: 'hard', field: 'time', vi: `${from} – ${to}`, en: `${from} – ${to}` })
  }

  // Named places become mandatory stops
  const scope = intent.city ? pois.filter((poi) => poi.city === intent.city) : pois
  for (const poi of scope) {
    const head = poiHead(poi)
    if (head.length >= MIN_POI_HEAD && t.includes(head)) {
      intent.mustInclude.push(poi.id)
      if (!intent.city) intent.city = poi.city
      chip({ kind: 'hard', field: 'must', vi: `Phải có: ${poi.name}`, en: `Must include: ${poi.name}` })
    }
  }
  if (intent.mustInclude.length && !intent.chips.some((c) => c.field === 'city') && intent.city) {
    const city = cities.find((c) => c.id === intent.city)!
    intent.chips.unshift({ kind: 'hard', field: 'city', vi: city.name, en: city.nameEn })
  }

  return intent
}
