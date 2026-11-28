import { categories } from './categories'
import type { Conflict, Constraint, ConstraintField, Extraction, ExtractionResponse } from './extraction'
import {
  affirmed,
  AVOID_RULES,
  INTEREST_RULES,
  INTEREST_WEIGHT,
  KEYWORD_RULES,
  MAX_TRIP_DAYS,
  MIN_BUDGET_VND,
  MIN_POI_HEAD,
  PACE_LABEL,
  PACE_RULES,
  poiHead,
  ruleMatches,
  SAME_FOLDED,
  TRANSPORT_RULES,
  type Intent,
  type IntentChip,
} from './nlp'
import { cityById, cityNamed, normalize, pois } from './pois'
import { NAME_TERM, SIGHT_TAGS, SIGHT_TERM, TAG_KEYS, nameTermsFor, tagLabel, wordsOf } from './tags'
import { DAY_MINUTES, dayWindowProblem, fmtMinutes, fmtSpan, fmtTime, hm, LATEST_DAY_END, maxDayLength } from './time'
import type { CategoryId, CityId, Poi } from './types'

/**
 * Turns what the backend model extracted (`POST /chat`) into the `Intent` the planner and the review
 * screen use. Everything comes from the model's answer; nothing is guessed from keywords in the
 * original text, so what the traveler sees is exactly what the model understood.
 */

const DAY_MS = 86_400_000
/** A number of bars in a nightlife wish, on folded text: "3 quan bar", "2 bar", "bar hopping 3", "3 quan moi dem"; never "3 ngay", "3 quan an", "3 quan (district)". */
const NIGHT_COUNT = /\b(\d)\s*(?:quan\s+)?(?:bar|pub|club|lounge)\b|\bhopping\s*(\d)\b|\b(\d)\s*quan\s+(?:moi|1|mot)\s+(?:dem|toi)\b/
/** The day's hours when the request names none, or completes the one it names. */
export const DEFAULT_DAY_START = hm('08:00')
export const DEFAULT_DAY_END = hm('21:00')
/** Tags the app has a name for; anything else a traveler says stays a visible chip only. */
const KNOWN_TAGS = new Set(TAG_KEYS)
/** A tag that names a whole planner category: avoiding "mua sắm" (shopping) leaves out the whole market-and-shopping category, not only places tagged with it. */
const TAG_CATEGORY: Record<string, CategoryId> = { shopping: 'market' }

/**
 * The backend prompt canonicalises interests to these eight values (journie-be `extraction/prompt.py`).
 * `own` marks the ones that name a whole planner category, so avoiding them can exclude that category;
 * the others (a museum, a park) are only part of a category and are excluded through their place tag instead.
 */
const CANONICAL_INTEREST: Record<string, { cat: CategoryId; own: boolean }> = {
  museum: { cat: 'culture', own: false },
  cafe: { cat: 'cafe', own: true },
  food: { cat: 'food', own: true },
  park: { cat: 'nature', own: false },
  shopping: { cat: 'market', own: true },
  beach: { cat: 'beach', own: true },
  culture: { cat: 'culture', own: true },
  nature: { cat: 'nature', own: true },
}

export const CONFLICT_LABEL: Record<Conflict, [vi: string, en: string]> = {
  date_order: ['Ngày kết thúc đứng trước ngày bắt đầu', 'The end date is before the start date'],
  time_order: ['Giờ kết thúc sớm hơn giờ bắt đầu', 'The end time is earlier than the start time'],
  duration_disagreement: ['Số ngày và khoảng ngày không khớp nhau', 'The number of days and the date range disagree'],
  budget_disagreement: ['Ngân sách được nói theo hai cách khác nhau', 'The budget is stated two different ways'],
  must_visit_avoid: ['Một nơi vừa phải ghé vừa muốn tránh', 'A place is both a must-visit and to avoid'],
  destination_disagreement: ['Có hai điểm đến khác nhau', 'Two different destinations were mentioned'],
}

/**
 * The note for a conflict. Hours with only one end are completed with the default day, so that note names the default it clashed with and the day kept;
 * an end in the small hours that the default start would make too long a day names that limit and the latest start that keeps it.
 * Hours with both ends say what is wrong with them: past a day's limits (`dayWindowProblem`, for a trip of `days`) or, an end before the start that is
 * not said to be the next day, how to say so.
 */
export function conflictLabel(conflict: Conflict, e?: Pick<Extraction, 'available_start' | 'available_end'>, days = 2): [vi: string, en: string] {
  const start = e?.available_start ? hm(e.available_start) : undefined
  const end = e?.available_end ? hm(e.available_end) : undefined
  const day = `${fmtTime(DEFAULT_DAY_START)}–${fmtTime(DEFAULT_DAY_END)}`
  if (conflict !== 'time_order' || (start === undefined && end === undefined)) return CONFLICT_LABEL[conflict]
  if (start !== undefined && end === undefined && start >= DEFAULT_DAY_END) {
    const same = start === DEFAULT_DAY_END
    return [
      `Giờ bắt đầu ${fmtTime(start)} ${same ? 'trùng với' : 'muộn hơn'} giờ kết thúc mặc định ${fmtTime(DEFAULT_DAY_END)}, mình giữ khung ${day}.`,
      `The ${fmtTime(start)} start ${same ? 'is the same as' : 'is later than'} the default ${fmtTime(DEFAULT_DAY_END)} end, so the day stays ${day}.`,
    ]
  }
  if (end !== undefined && start === undefined && end <= DEFAULT_DAY_START) {
    // An end in the small hours may be the next morning's: then what keeps it out is the length of the day from the default start
    const late = end + DAY_MINUTES
    if (late <= LATEST_DAY_END && dayWindowProblem(DEFAULT_DAY_START, late, days) === 'day-too-long') {
      const most = maxDayLength(days) / 60
      const earliest = fmtTime(late - maxDayLength(days))
      return [
        `Khung ${fmtSpan(DEFAULT_DAY_START, late)} (bắt đầu mặc định ${fmtTime(DEFAULT_DAY_START)}) dài ${fmtMinutes(late - DEFAULT_DAY_START)}, quá ${most} tiếng một ngày${days > 1 ? ' của chuyến nhiều ngày' : ''}. Muốn về lúc ${fmtTime(end)} hôm sau thì nói giờ bắt đầu từ ${earliest} trở đi, ví dụ “từ ${earliest} tới ${fmtTime(end)} sáng hôm sau”; mình giữ khung ${day}.`,
        `${fmtSpan(DEFAULT_DAY_START, late, false)} (from the default ${fmtTime(DEFAULT_DAY_START)} start) is ${fmtMinutes(late - DEFAULT_DAY_START, false)} long, over the ${most} h a day${days > 1 ? ' has on a trip of several days' : ' may last'}. To end at ${fmtTime(end)} the next day, say a start at ${earliest} or later, e.g. “from ${earliest} until ${fmtTime(end)} the next day”; the day stays ${day}.`,
      ]
    }
    const same = end === DEFAULT_DAY_START
    return [
      `Giờ kết thúc ${fmtTime(end)} ${same ? 'trùng với' : 'sớm hơn'} giờ bắt đầu mặc định ${fmtTime(DEFAULT_DAY_START)}, mình giữ khung ${day}.`,
      `The ${fmtTime(end)} end ${same ? 'is the same as' : 'is earlier than'} the default ${fmtTime(DEFAULT_DAY_START)} start, so the day stays ${day}.`,
    ]
  }
  const from = start ?? DEFAULT_DAY_START
  const to = end ?? DEFAULT_DAY_END
  // Read as the next day when it ends at or before it starts: what the day would be then
  const last = to <= from ? to + DAY_MINUTES : to
  const problem = dayWindowProblem(from, last, days)
  if (problem === 'day-too-late') {
    return [`Khung ${fmtSpan(from, last)} kết thúc sau 05:00 sáng hôm sau, mình giữ khung ${day}.`, `${fmtSpan(from, last, false)} ends after 05:00 the next morning, so the day stays ${day}.`]
  }
  if (problem === 'day-too-long') {
    const most = maxDayLength(days) / 60
    return [
      `Khung ${fmtSpan(from, last)} dài ${fmtMinutes(last - from)}, quá ${most} tiếng một ngày${days > 1 ? ' của chuyến nhiều ngày' : ''}, mình giữ khung ${day}.`,
      `${fmtSpan(from, last, false)} is ${fmtMinutes(last - from, false)} long, over the ${most} h a day${days > 1 ? ' has on a trip of several days' : ' may last'}, so the day stays ${day}.`,
    ]
  }
  if (to <= from) {
    return [
      `Giờ kết thúc ${fmtTime(to)} sớm hơn giờ bắt đầu ${fmtTime(from)}. Muốn đi qua đêm thì ghi rõ “hôm sau”, ví dụ “tới 3h sáng hôm sau”; mình giữ khung ${day}.`,
      `The ${fmtTime(to)} end is earlier than the ${fmtTime(from)} start. To go past midnight say so, e.g. “until 3am the next day”; the day stays ${day}.`,
    ]
  }
  return CONFLICT_LABEL[conflict]
}

/** One of our cities for the destination the model read ("Hanoi", "Đà Nẵng", "Huế", "Ho Chi Minh City"). */
export const cityFromDestination = (destination: string | null): CityId | undefined => cityNamed(destination)

/** Trip length: the stated number of days, else the inclusive span between the two dates. */
export function daysFromExtraction(e: Pick<Extraction, 'duration_days' | 'start_date' | 'end_date'>): number | undefined {
  if (e.duration_days) return Math.min(MAX_TRIP_DAYS, e.duration_days)
  if (e.start_date && e.end_date) {
    const span = Math.round((Date.parse(e.end_date) - Date.parse(e.start_date)) / DAY_MS) + 1
    if (span >= 1) return Math.min(MAX_TRIP_DAYS, span)
  }
  return undefined
}

export function related(a: string, b: string) {
  const x = normalize(a).trim()
  const y = normalize(b).trim()
  return x !== '' && y !== '' && (x.includes(y) || y.includes(x))
}

/** The model labels each constraint hard or soft; fall back to the field's usual weight when it did not list this one. */
function kindOf(e: Extraction, field: ConstraintField, value: string, fallback: IntentChip['kind']): IntentChip['kind'] {
  const listed = (list: Constraint[]) => list.some((c) => c.field === field && (field === 'budget_vnd' || related(c.value, value)))
  if (listed(e.hard_constraints)) return 'hard'
  if (listed(e.soft_constraints)) return 'soft'
  return fallback
}

/**
 * "không đi chợ nào cả" is about "chợ": drop the negation, the verbs and the closing filler words around the thing excluded.
 * A time of day goes with its "nay" or "mai" ("chiều nay đi bảo tàng", "tối nay đi bar" are about "bảo tàng" and "bar", never
 * "nay đi bảo tàng"), and a phrase that is only the time ("tối nay", "chiều mai") is kept whole rather than cut to "nay".
 */
const LEAD_WORDS = 'khong|ko|dung|tranh|kieng|bo qua|cho toi|cho minh|toi(?:\\s+(?:nay|mai))?|minh|muon|thich|them|di|an(?!\\s+(?:vat|sang|dem|khuya)\\b)|uong|ghe|choi|tham quan|(?:sang|trua|chieu)(?:\\s+(?:nay|mai))?|bua|cac|nhung|moi'
// "an" stays before "vat", "sang", "dem", "khuya": "ăn vặt" (street snacks) and "ăn sáng" (breakfast) name a kind of eating, not "vặt" or a morning
const LEAD_WORD = new RegExp(`^(?:${LEAD_WORDS})\\s+(?!(?:nay|mai)$)`)
const TRAILING = /(?:\s+(?:nao|ca|het|nhe|nha|thoi|a|nua))+$/
/** Folded, after a written "tối" these make another word: "tối đa" (at most), "tối ưu" (best). */
const NOT_EVENING = /^toi\s+(?:da|uu)\b/
/**
 * How much of the folded `t` its leading words take. Folded, "toi" is tôi (I), tới (to) or tối (the evening), all dropped like
 * the other times of day; `written` (the phrase with its accents) keeps "tối đa" and "tối ưu", which are not the evening.
 */
function leadLength(t: string, written = t): number {
  let at = 0
  for (let m = t.match(LEAD_WORD); m; m = t.slice(at).match(LEAD_WORD)) {
    if (written.slice(at, at + 3).toLowerCase() === 'tối' && NOT_EVENING.test(t.slice(at))) break
    at += m[0].length
  }
  return at
}
/** Refusing bars as a kind of place ("không đi bar", "không uống rượu", "no nightlife", on the core of the phrase); a named bar ("Illusion Bar") is not this. */
const NO_NIGHTLIFE = /^(?:(?:no|without|skip|avoid|den|toi|vao|quan|hoat dong|choi|uong)\s+)*(?:bars?|pubs?|clubs?|lounges?|nightlife|nhau|ruou|bia|uong ruou|dem|ve dem)(?:\s*(?:,|or|and|va|hoac)?\s+(?:quan\s+)?(?:bars?|pubs?|clubs?|lounges?|ruou|bia|nhau))*$/
/** How the backend's interest names are said by the traveler, so "cafe" is recognised as what "không cà phê" refuses. */
const SPOKEN: Record<string, string> = { cafe: 'ca phe', museum: 'bao tang', park: 'cong vien', shopping: 'mua sam', food: 'an uong', nightlife: 've dem' }
export const spoken = (value: string) => SPOKEN[normalize(value).trim()] ?? value
/** The other way round, for refusals: "không đi quán cà phê" refuses the café category like "no cafe" does. */
const UNSPOKEN: Record<string, string> = { ...Object.fromEntries(Object.entries(SPOKEN).map(([value, said]) => [said, value])), coffee: 'cafe', cafes: 'cafe', 'coffee shop': 'cafe', 'coffee shops': 'cafe' }
/** A venue word before the thing refused ("quán cà phê", "các bảo tàng"), dropped when what follows is a category or a tag. */
const VENUE_LEAD = /^(?:quan|tiem|nha hang|cac|nhung)\s+/
/** Where a refusal lists several things ("temples or pagodas", "chùa và bảo tàng"), on folded text. */
const LIST = /\s*(?:,|\/|&|\bor\b|\band\b|\bva\b|\bhoac\b)\s*/
/**
 * Other names for a tag in a refusal, folded: "chùa" alone, "đền", plurals. They leave out the tagged places and are never looked for
 * in place names: folded, "chua" is also sour (Nem Chua Rán), and a café is often named after a church or a pagoda on its street.
 */
const TAG_WORDS: Record<string, string> = {
  chua: 'temple', 'chua chien': 'temple', 'dinh chua': 'temple', 'den chua': 'temple', den: 'temple', 'den mieu': 'temple', mieu: 'temple', 'thien vien': 'temple',
  temples: 'temple', pagoda: 'temple', pagodas: 'temple', shrine: 'temple', shrines: 'temple',
  'nha tho': 'church', churches: 'church', cathedral: 'church', cathedrals: 'church',
  museums: 'museum', markets: 'market', parks: 'park',
  chay: 'vegetarian', 'do chay': 'vegetarian',
}

/** The model sometimes puts several wishes in one `other` requirement ("không ăn phở nữa, thích bánh mì"); each clause is read on its own. */
const CLAUSES = /\s*(?:[,;]|\s(?:nhưng|nhung)\s)\s*/i
export function splitOther(e: Extraction): Extraction {
  const split = (list: Constraint[]) => list.flatMap((atom) => (atom.field === 'other' ? atom.value.split(CLAUSES).filter((part) => part.trim()).map((value) => ({ ...atom, value })) : [atom]))
  return { ...e, hard_constraints: split(e.hard_constraints), soft_constraints: split(e.soft_constraints) }
}

/** A requirement that starts with a negation ("không ăn phở"). The model usually marks it `exclude`, but sometimes files it under another operator. */
const NEGATED = /^(?:khong|ko|dung|tranh|kieng|bo qua|no|not|without|skip)\b/
/** What the traveler rules out: every `exclude`, and any `other` requirement worded as a refusal whatever its operator. */
export const isExclusion = (atom: Constraint) => atom.operator === 'exclude' || (atom.field === 'other' && NEGATED.test(normalize(atom.value).trim()))
/** The thing a folded phrase is about; pass the phrase as `written` too when its accents are known (see `leadLength`). */
export const coreOf = (t: string, written?: string) => t.slice(leadLength(t, written)).replace(TRAILING, '').trim() || t

/** A place tag the phrase names, by the tag itself or by how the app writes it ("bảo tàng" is `museum`, "chợ đêm" is `night-market`). */
function tagNamed(t: string): string | undefined {
  if (TAG_WORDS[t]) return TAG_WORDS[t]
  const slug = t.replace(/\s+/g, '-')
  if (KNOWN_TAGS.has(slug)) return slug
  return [...KNOWN_TAGS].find((tag) => [tagLabel(tag, 'vi'), tagLabel(tag, 'en')].some((label) => normalize(label) === t))
}

type Refusal = { kind: 'nightlife' } | { kind: 'rule'; rule: (typeof AVOID_RULES)[number] } | { kind: 'category'; cat: CategoryId } | { kind: 'tag'; tag: string; word: string }

/** Whether `pattern` matches the whole of `text`: "cửa hàng lưu niệm" holds "cua" (crab) and "cà chua" holds "ca" (fish), and neither is a dish refused. */
const wholly = (pattern: RegExp, text: string) => {
  const found = text.match(pattern)
  return !!found && found.index === 0 && found[0].length === text.length
}

/**
 * Whether a folded word with a second meaning was written as that other word: "chỗ" is not chợ, "đèn" or "đến" not đền. Without accents
 * it cannot be told, and the model often drops them ("chua" for chùa), so it is read as the place.
 */
const otherWord = (word: string, written: string) => !!SAME_FOLDED[word] && written !== word && !SAME_FOLDED[word].includes(written)

/**
 * What a refused core has a rule for: bars, a dish or allergy, a whole category or a place tag; undefined for anything else. `full` is the
 * whole folded phrase and `written` the core as typed, with its accents.
 */
function refusalOf(t: string, full = t, written = t): Refusal | undefined {
  if (NO_NIGHTLIFE.test(t)) return { kind: 'nightlife' }
  // A diet ("ăn chay") is not something refused: refusing it ("không ăn chay") leaves out vegetarian places, never meat
  const rule = AVOID_RULES.find(([pattern]) => wholly(pattern, `khong an ${t}`) || wholly(pattern, full))
  if (rule) return { kind: 'rule', rule }
  // Eating or drinking it ("không ăn chua") is about food, not a sight with the same folded name
  const eats = /\b(?:an|uong|eat|drink)\b/.test(full.slice(0, Math.max(0, full.lastIndexOf(t))))
  for (const word of new Set([t, t.replace(VENUE_LEAD, '')])) {
    const canonical = CANONICAL_INTEREST[word] ?? CANONICAL_INTEREST[UNSPOKEN[word]]
    if (canonical?.own) return { kind: 'category', cat: canonical.cat }
    const tag = tagNamed(word)
    if (tag && !otherWord(word, written.slice(written.length - word.length)) && !(eats && SIGHT_TAGS.has(tag))) return { kind: 'tag', tag, word }
  }
  return undefined
}

/** The folded `core` of the folded `full` as `raw` writes it; folding keeps one character per character, else the folded core. */
function writtenCore(raw: string, full: string, core: string): string {
  const typed = raw.normalize('NFC').trim().toLowerCase()
  const at = full.lastIndexOf(core)
  return typed.length === full.length && at >= 0 ? typed.slice(at, at + core.length) : core
}

function poiByName(raw: string, scope: Poi[]): Poi | undefined {
  const t = normalize(raw)
  if (t.length < MIN_POI_HEAD) return undefined
  return scope.find((poi) => {
    const head = poiHead(poi)
    return head.length >= MIN_POI_HEAD && (t.includes(head) || head.includes(t))
  })
}

/** Everything the traveler excluded, as written and normalised: the `avoid` list plus every `exclude` constraint, once each. */
function avoidedItems(e: Extraction): { raw: string; t: string }[] {
  const excluded = [...e.hard_constraints, ...e.soft_constraints].filter(isExclusion).map((c) => c.value)
  const seen = new Set<string>()
  // The model sometimes lists a refusal twice, with and without accents ("chợ", "cho"): the accented spelling is the one shown
  const accented = (raw: string) => raw.toLowerCase() !== normalize(raw)
  return [...e.avoid, ...excluded]
    .map((raw) => ({ raw, t: normalize(raw).trim() }))
    .sort((a, b) => Number(accented(b.raw)) - Number(accented(a.raw)))
    .filter(({ t }) => t !== '' && !seen.has(t) && !!seen.add(t))
}

/**
 * An hour with its unit ("3h", "3 giờ", "2h30", "2h rưỡi", "3:00", "1.30am", "2 o'clock", "3am", "3 in the morning", "3 the next day"), in group `h`; then, right after it, a word that puts it
 * in the small hours or the next day ("sáng hôm sau", "sáng", "đêm", "khuya", "am", "the next day"). Folded "sang" and "dem" are also sang
 * (to go over: "3h sang Hội An") and đem, so without accents they count only at the end of a clause or before "hôm sau", "mai".
 */
const SMALL_HOUR = String.raw`(?<!\d)(?<h>\d{1,2})(?:\s*(?:h|giờ|gio)(?:\s*\d{2}(?:\s*(?:phút|phut))?|\s*(?:rưỡi|ruoi))?(?!\p{L})|\s*:\s*\d{2}|\.\d{2}(?=\s*(?:am|a\.m\.|in the morning|at night)(?!\p{L}))|\s*o['’]?\s?clock(?!\p{L})|(?=\s*(?:am|a\.m\.|in the morning|at night|(?:the )?next (?:day|morning)|the following (?:day|morning))(?!\p{L})))`
const AFTER_SMALL_HOUR = new RegExp(
  String.raw`${SMALL_HOUR}\s*(?:sáng|rạng sáng|đêm|khuya|hôm sau|ngày hôm sau|ngày mai|am|a\.m\.|in the morning|at night|(?:the )?next (?:day|morning)|the following (?:day|morning)|khuya|hom sau|ngay hom sau|ngay mai|rang sang|(?:sang|dem)(?=\s*(?:$|[,;.!?)]|(?:hom sau|ngay hom sau|ngay mai|mai|nhé|nhe|nha|thôi|thoi|luôn|luon)(?!\p{L}))))(?!\p{L})`,
  'giu',
)
/** The word before the hour: "chơi tới khuya 2h", "rạng sáng 4h", "hôm sau lúc 3h". "Đêm" before it is not one ("chợ đêm 3h" is a night market). */
const BEFORE_SMALL_HOUR = new RegExp(String.raw`(?<!\p{L})(?:khuya|rạng sáng|sáng hôm sau|hôm sau|rang sang|sang hom sau|hom sau)\s+(?:(?:lúc|luc|tầm|tam|khoảng|khoang)\s+)?${SMALL_HOUR}`, 'giu')
/** Midnight said in words, the end of the day at 00:00. */
const MIDNIGHT = /(?<!\p{L})(?:nửa đêm|nua dem|midnight)(?!\p{L})/giu
/** The words between "tới"/"until" and the hour: "tới tận 3h", "về lúc 2h", "tới khuya 2h". */
const UNTIL_FILLER = String.raw`(?:(?:tận|tan|lúc|luc|tầm|tam|khoảng|khoang|at|by|around|khuya|rạng sáng|rang sang)\s+)*`
const UNTIL = String.raw`(?<!\p{L})(?:tới|đến|toi|den|về|ve|kết thúc|ket thuc|until|till|to|back|end(?:ing)?|finish(?:ing)?)\s+${UNTIL_FILLER}`
/** An hour said as the time to stay out until ("chơi tới 2h khuya", "tới khuya 2h30", "until 3am", "về lúc 2h rưỡi sáng"), its hour in `h`, minutes in `m` (`half` for rưỡi). */
const UNTIL_HOUR = new RegExp(String.raw`${UNTIL}(?<!\d)(?<h>\d{1,2})(?:\s*(?:h|giờ|gio)(?:\s*(?<m>\d{2})|\s*(?<half>rưỡi|ruoi))?|(?:\s*:\s*|\.)(?<mm>\d{2})(?!\d))?`, 'giu')
/** Midnight as the time to stay out until: "tới nửa đêm", "until midnight"; not "a midnight snack". */
const UNTIL_MIDNIGHT = new RegExp(String.raw`${UNTIL}(?:nửa đêm|nua dem|midnight)(?!\p{L})`, 'giu')
/**
 * A place's hours said right before an hour or its "tới" ("quán mở tới 2h sáng", "chợ mở cửa đến 12h đêm", "đóng cửa lúc 2h sáng", "bars stay open
 * until 3am"): that hour is when the place closes, not when the traveler's day ends. Folded "ban" is also bạn (a friend), so only "bán" counts.
 */
const PLACE_HOURS = new RegExp(
  String.raw`(?<!\p{L})(?:mở(?:\s+cửa)?|mo(?:\s+cua)?|đóng(?:\s+cửa)?|dong\s+cua|hoạt động|hoat dong|bán|phục vụ|phuc vu|opens?|opened|clos(?:e|es|ed|ing)|serv(?:e|es|ed|ing)|operat(?:e|es|ing))(?:\s+(?:muộn|muon|late|xuyên đêm|xuyen dem|suốt đêm|suot dem|all night))?\s+(?:(?:tới|đến|toi|den|until|till|to)\s+)?${UNTIL_FILLER}$`,
  'iu',
)
/** Whether the hour (or its "tới") at `at` in the lowercased `t` is a place's opening hours. */
const placeHours = (t: string, at = 0) => PLACE_HOURS.test(t.slice(Math.max(0, at - 48), at))

/**
 * Whether `text` says that the day's end `end` (minutes, the clock the model read: 180 for 03:00) is in the small hours of the next day: the
 * end's hour is written with a word for the night or the next morning ("tới 3h sáng hôm sau", "chơi tới 2h khuya", "tới khuya 2h", "until 3am",
 * "tới nửa đêm"). The word goes with that hour, so "từ 9h sáng tới 3h" (the morning is the start's) and "đi chợ đêm, về 3h" are not.
 */
export function endsNextDay(text: string, end: number): boolean {
  const t = text.normalize('NFC').toLowerCase()
  const hour = Math.floor(end / 60) % 12
  // "12h đêm" is midnight, as 0 is
  const named = [...t.matchAll(AFTER_SMALL_HOUR), ...t.matchAll(BEFORE_SMALL_HOUR)].some((found) => Number(found.groups?.h) % 12 === hour && !placeHours(t, found.index))
  return named || (end % DAY_MINUTES === 0 && [...t.matchAll(MIDNIGHT)].some((found) => !placeHours(t, found.index)))
}

/**
 * The end a text names in the small hours of the next day ("chơi tới 2h khuya" is 02:00), as its clock; null when it names none. For when the
 * model read no end from such words: only an hour said as the time to stay out until, with a word for the night or the next morning, counts,
 * so "ăn khuya lúc 1h" (a late meal at 1:00), "quán mở tới 2h sáng" (the bar's hours) and "a midnight snack" are not an end.
 */
export function nextDayEndIn(text: string): string | null {
  const t = text.normalize('NFC').toLowerCase()
  for (const found of t.matchAll(UNTIL_HOUR)) {
    const hour = Number(found.groups?.h) % 12
    const minute = found.groups?.half ? 30 : Number(found.groups?.m ?? found.groups?.mm ?? 0)
    if (hour <= 5 && minute < 60 && !placeHours(t, found.index) && endsNextDay(text, hour * 60)) return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  return [...t.matchAll(UNTIL_MIDNIGHT)].some((found) => !placeHours(t, found.index)) ? '00:00' : null
}

/**
 * `city` is the one the traveler picked, planned when the request names no destination. With `nextDay`, hours whose end is at or before
 * their start end the next day (the traveler said so, `endsNextDay`, or picked them so in the form), within a day's limits. `later` is the
 * days of a journey's legs after this one, which keep its hours: the limits count the whole journey.
 */
export function intentFromExtraction(response: Pick<ExtractionResponse, 'extraction'>, city: CityId = 'sai-gon', nextDay = false, later = 0): Intent {
  const e = splitOther(response.extraction)
  const intent: Intent = {
    budgetHard: false,
    interests: {},
    keywords: [],
    avoidTags: [],
    mustInclude: [],
    chips: [],
    extraction: e,
    startDate: e.start_date ?? undefined,
    conflicts: e.possible_conflicts,
    needsClarification: e.needs_clarification,
  }
  const seen = new Set<string>()
  const chip = (c: IntentChip) => {
    const key = `${c.field}|${c.vi}`
    if (!seen.has(key)) {
      seen.add(key)
      intent.chips.push(c)
    }
  }
  const keyword = (word: string) => {
    if (!intent.keywords.includes(word)) intent.keywords.push(word)
  }
  const avoidTag = (tag: string) => {
    if (!intent.avoidTags.includes(tag)) intent.avoidTags.push(tag)
  }
  /** Leaves out places whose name has this word ("phở" leaves out "Phở Minh"). Too short a word would match half the names. */
  const nameTerm = (phrase: string, prefix = NAME_TERM) => {
    const term = wordsOf(phrase)
    if (term.length >= 3) avoidTag(`${prefix}${term}`)
  }

  // Destination: one of our cities, else the picked city when none is named; a place we do not cover waits for the traveler
  const destination = e.destination?.trim()
  const named = cityFromDestination(destination ?? null)
  if (named) {
    intent.city = named
    chip({ kind: 'hard', field: 'city', vi: cityById[named].name, en: cityById[named].nameEn })
  } else if (destination) {
    intent.unsupportedDestination = destination
    chip({ kind: 'hard', field: 'city', vi: `${destination} (chưa có dữ liệu)`, en: `${destination} (no data yet)` })
  } else {
    intent.city = city
  }

  // Duration
  intent.days = daysFromExtraction(e)
  if (intent.days) chip({ kind: 'hard', field: 'days', vi: `${intent.days} ngày`, en: `${intent.days} day${intent.days > 1 ? 's' : ''}` })

  // Budget
  if (e.budget_vnd && e.budget_vnd >= MIN_BUDGET_VND) {
    intent.budget = e.budget_vnd
    intent.budgetHard = kindOf(e, 'budget_vnd', String(e.budget_vnd), 'soft') === 'hard'
    chip({
      kind: intent.budgetHard ? 'hard' : 'soft',
      field: 'budget',
      vi: `${intent.budgetHard ? 'Tối đa' : 'Khoảng'} ${new Intl.NumberFormat('vi-VN').format(e.budget_vnd)} VND`,
      en: `${intent.budgetHard ? 'Max' : 'About'} ${new Intl.NumberFormat('en-US').format(e.budget_vnd)} VND`,
    })
  }

  // Exclusions first: what the traveler does not want must never also count as an interest
  const avoided = avoidedItems(e)
  // An interest is dropped when it is what was refused, or the same thing as a refused tag (the model lists "shopping" as an interest and "mua sắm" as avoided)
  const isAvoidedText = (t: string) => {
    const tag = tagNamed(coreOf(t))
    return avoided.some((a) => related(coreOf(a.t), t) || related(coreOf(a.t), spoken(t))) || (tag !== undefined && intent.avoidTags.includes(tag))
  }
  const refuse = (refusal: Refusal) => {
    if (refusal.kind === 'nightlife') {
      avoidTag('nightlife')
      chip({ kind: 'hard', field: 'avoid', vi: `Tránh: ${categories.nightlife.vi}`, en: `Avoid: ${categories.nightlife.en}` })
    } else if (refusal.kind === 'rule') {
      const [, tags, vi, en] = refusal.rule
      ;[...tags, ...nameTermsFor(tags)].forEach(avoidTag)
      chip({ kind: 'hard', field: 'avoid', vi, en })
    } else if (refusal.kind === 'category') {
      avoidTag(refusal.cat)
      chip({ kind: 'hard', field: 'avoid', vi: `Tránh: ${categories[refusal.cat].vi}`, en: `Avoid: ${categories[refusal.cat].en}` })
    } else {
      const { tag, word } = refusal
      avoidTag(tag)
      if (TAG_CATEGORY[tag]) avoidTag(TAG_CATEGORY[tag])
      // The tag's own word is also looked for in names ("chợ" leaves out "Chợ cá Gỗ"); for a sight, only in the names of other sights
      if (!TAG_WORDS[word]) nameTerm(word, SIGHT_TAGS.has(tag) ? SIGHT_TERM : NAME_TERM)
      chip({ kind: 'hard', field: 'avoid', vi: `Tránh: ${tagLabel(tag, 'vi')}`, en: `Avoid: ${tagLabel(tag, 'en')}` })
    }
  }
  for (const { raw, t: full } of avoided) {
    const t = coreOf(full)
    const whole = refusalOf(t, full, writtenCore(raw, full, t))
    // "temples or pagodas", "chùa, bảo tàng": a list is read item by item when each item is something the app has a rule for
    const items = whole ? [] : t.split(LIST).map((part) => coreOf(part.trim())).filter(Boolean)
    const each = items.length > 1 ? items.map((item) => refusalOf(item)).filter((item): item is Refusal => item !== undefined) : []
    if (whole) refuse(whole)
    else if (items.length > 1 && each.length === items.length) each.forEach(refuse)
    else {
      // A dish or other word the data has no field for: places whose name carries it are left out, the rest cannot be told, so it stays a preference
      nameTerm(t)
      chip({ kind: 'soft', field: 'avoid', vi: `Tránh: ${raw}`, en: `Avoid: ${raw}` })
    }
  }

  const wishes: string[] = []
  // Requirements the model could not fit a field ("other"): an allergy or diet is enforced, anything else is shown in its own words
  for (const atom of [...e.hard_constraints, ...e.soft_constraints].filter((c) => c.field === 'other' && !isExclusion(c))) {
    const t = normalize(atom.value).trim()
    const rule = AVOID_RULES.find(([pattern]) => pattern.test(t))
    const pace = PACE_RULES.find(([, pattern]) => affirmed(t, pattern))?.[0]
    const ride = TRANSPORT_RULES.find(([, pattern]) => affirmed(t, pattern))
    if (rule) {
      [...rule[1], ...nameTermsFor(rule[1])].forEach(avoidTag)
      chip({ kind: 'hard', field: 'avoid', vi: rule[2], en: rule[3] })
    } else {
      // The model has no pace or transport field, so it notes them as "other"; its own note is read here, not the original text
      if (pace) {
        intent.pace = pace
        chip({ kind: 'soft', field: 'pace', vi: PACE_LABEL[pace][0], en: PACE_LABEL[pace][1] })
      }
      if (ride) {
        intent.transport = ride[0]
        chip({ kind: 'soft', field: 'transport', vi: ride[2][0], en: ride[2][1] })
      }
      // A wish the model had no field for ("ăn phở"): it is read as an interest below, so the planner and the places both follow it.
      // Each part is decided on its own: "quán chill uống cocktail, nghe nhạc sống" stays a wish beside its pace word, while a part
      // that only sets the pace or the transport, or only says when ("tối nay"), is not one
      const parts = wishParts(atom.value)
      const kept = parts.filter(isWishPart)
      wishes.push(...(kept.length === parts.length ? [atom.value] : kept.map((part) => part.written)))
    }
  }

  // Interests: canonical values map straight to planner categories, other wording is matched by the keyword table
  for (const raw of [...e.interests, ...wishes]) {
    const t = normalize(raw).trim()
    if (isAvoidedText(t)) continue
    const canonical = CANONICAL_INTEREST[t]
    let mapped = false
    if (canonical) {
      intent.interests[canonical.cat] = INTEREST_WEIGHT
      chip({ kind: kindOf(e, 'interests', raw, 'soft'), field: 'interest', vi: categories[canonical.cat].vi, en: categories[canonical.cat].en })
      mapped = true
    } else {
      for (const [cat, pattern, words] of INTEREST_RULES) {
        if (!ruleMatches(pattern, raw) || intent.avoidTags.includes(cat)) continue
        // "bar hopping 3 quán", "đi 2 quán bar mỗi tối": the count the traveler asks for lifts the one-evening-venue-a-day limit (up to 3)
        const count = cat === 'nightlife' ? t.match(NIGHT_COUNT) : null
        if (count) intent.nightsPerDay = Math.min(3, Math.max(1, Number(count[1] ?? count[2] ?? count[3])))
        intent.interests[cat] = INTEREST_WEIGHT
        words.forEach(keyword)
        chip({ kind: kindOf(e, 'interests', raw, 'soft'), field: 'interest', vi: categories[cat].vi, en: categories[cat].en })
        mapped = true
      }
    }
    for (const [pattern, word] of KEYWORD_RULES) {
      if (pattern.test(t)) {
        keyword(word)
        mapped = true
      }
    }
    const slug = t.replace(/\s+/g, '-')
    if (KNOWN_TAGS.has(slug)) {
      keyword(slug)
      mapped = true
    }
    if (!mapped) chip({ kind: kindOf(e, 'interests', raw, 'soft'), field: 'interest', vi: raw, en: raw })
  }

  // Hours of the day
  const from = e.available_start ? hm(e.available_start) : undefined
  const to = e.available_end ? hm(e.available_end) : undefined
  // Contradictory hours (end before start) are reported as a conflict rather than planned around, even if the model only left a review note.
  // One named end is completed with the default day, so a start after its end (or an end before its start) contradicts it the same way.
  const inverted = (to ?? DEFAULT_DAY_END) <= (from ?? DEFAULT_DAY_START)
  // Unless the end is said to be the next day: then it is past midnight (03:00 is 1620)
  const end = inverted && nextDay && to !== undefined ? to + DAY_MINUTES : to
  // Hours past a day's limits (past 05:00 the next morning, longer than 20 h, or 18 h on a longer trip) are a conflict too; the note says which
  const clash = dayWindowProblem(from ?? DEFAULT_DAY_START, end ?? DEFAULT_DAY_END, (intent.days ?? 2) + later) !== null
  if (clash && !intent.conflicts?.includes('time_order')) intent.conflicts = [...(intent.conflicts ?? []), 'time_order']
  // The model flags an end before the start, which here is the next day as said
  if (!clash && end !== to) intent.conflicts = intent.conflicts?.filter((conflict) => conflict !== 'time_order')
  if (e.start_date && e.end_date && e.end_date < e.start_date && !intent.conflicts?.includes('date_order')) intent.conflicts = [...(intent.conflicts ?? []), 'date_order']
  if (!clash) {
    intent.dayStart = from
    intent.dayEnd = end
    const label = `${e.available_start ?? '…'} – ${e.available_end ?? '…'}`
    const tag = end !== to ? [' (hôm sau)', ' (next day)'] : ['', '']
    if (from !== undefined || to !== undefined) chip({ kind: 'hard', field: 'time', vi: `${label}${tag[0]}`, en: `${label}${tag[1]}` })
  }

  // Named places: matched ones become mandatory stops, the rest are still shown
  const scope = pois.filter((poi) => poi.city === (intent.city ?? city))
  for (const raw of e.must_visit) {
    const poi = poiByName(raw, scope)
    if (poi) {
      if (!intent.mustInclude.includes(poi.id)) intent.mustInclude.push(poi.id)
      chip({ kind: 'hard', field: 'must', vi: `Phải có: ${poi.name}`, en: `Must include: ${poi.name}` })
    } else {
      chip({ kind: 'hard', field: 'must', vi: `Phải có: ${raw} (chưa có trong dữ liệu)`, en: `Must include: ${raw} (not in our data)` })
    }
  }
  // Places the traveler would like but does not insist on lift their category instead of forcing a stop
  for (const raw of e.preferred_places) {
    const poi = poiByName(raw, scope)
    if (poi) intent.interests[poi.cat] = Math.max(intent.interests[poi.cat] ?? 0, INTEREST_WEIGHT)
    chip({ kind: 'soft', field: 'interest', vi: poi ? `Ưu tiên: ${poi.name}` : `Ưu tiên: ${raw}`, en: poi ? `Prefer: ${poi.name}` : `Prefer: ${raw}` })
  }

  return intent
}

/** A note about pace or getting around ("đi xe máy cho nhanh"): the app reads it as a setting, and it names no place to look for. */
const isSetting = (t: string) => PACE_RULES.some(([, pattern]) => affirmed(t, pattern)) || TRANSPORT_RULES.some(([, pattern]) => affirmed(t, pattern))

/** Words that name a place to go, on folded text; "nhiều chỗ" (many places) is a pace, and the accents written are checked (VENUE_FORMS). */
const VENUE = /(?<!\bnhieu )\b(?:quan|cho|noi|nha hang)\b/
/** Folded, "quan" is also quận (a district) and tham quan, "cho" also chợ and cho (for), "noi" also Hà Nội and nổi tiếng. */
const VENUE_FORMS: Record<string, string[]> = { quan: ['quán'], cho: ['chỗ'], noi: ['nơi'] }
/**
 * A part that names a place to look for: a venue word ("quán chill", "chỗ ngồi"), or what an interest or keyword rule reads
 * ("uống cocktail", "ngắm hoàng hôn"). It decides against a pace or transport word, so an ambiguous folded word counts only with
 * its accents written: "di tham quan nhieu cho cho nhanh" is a pace note, not a market or a café.
 */
const namesPlace = (part: WishPart) =>
  ruleMatches(VENUE, part.written, VENUE_FORMS, true) ||
  INTEREST_RULES.some(([, pattern]) => ruleMatches(pattern, part.written, SAME_FOLDED, true)) ||
  KEYWORD_RULES.some(([pattern]) => pattern.test(part.text))
/** A part that only says when ("tối nay", "ngày mai", "đi chơi cuối tuần"), on folded text: it names nothing to look for. */
const TIME_ONLY =
  /^(?:(?:minh|toi|muon|di|choi|vao|luc|trong|buoi)\s+)*(?:(?:sang|trua|chieu|toi)(?:\s+(?:nay|mai|mot))?|(?:dem|hom|ngay|tuan|cuoi tuan)\s+(?:nay|mai|mot|kia|toi|sau)|cuoi tuan|nay|mai|today|tonight|tomorrow|this (?:morning|afternoon|evening|weekend)|(?:in the )?(?:morning|afternoon|evening))$/
/**
 * Whether a part of an `other` wish is one: not a part that only sets the pace or the transport ("đi xe máy cho nhanh") nor one
 * that only says when. A part that names a place stays a wish beside a pace word ("quán chill uống cocktail").
 */
const isWishPart = (part: WishPart) => !TIME_ONLY.test(part.text) && (namesPlace(part) || !isSetting(part.text))

/** The interest values the backend knows (journie-be `interest_map.v2.yaml`) for the planner categories the app reads wishes into. */
const BACKEND_INTEREST: Partial<Record<CategoryId, string>> = { food: 'food', cafe: 'cafe', culture: 'culture', nature: 'nature', market: 'shopping', nightlife: 'nightlife' }
/** Those values, which `forRetrieval` adds beside a wish ("muốn đi thêm chùa" also asks for `culture`) so the backend finds its places. */
export const COMPANION_INTERESTS = new Set(Object.values(BACKEND_INTEREST))

/** Where one wish holds several ("thích chợ, ăn uống", "phở và bánh mì"), on its folded form. */
const WISH_PARTS = /[,;]| va | and | & /g

type WishPart = { text: string; core: string; written: string; writtenCore: string }

/**
 * The parts of a wish, folded (`text`, `core`: to match the rules) and as the traveler wrote them (`written`, `writtenCore`: to send).
 * The backend searches free-text wishes by meaning, and the accents carry it: "chỗ ngắm hoàng hôn" finds rooftop bars where
 * "cho ngam hoang hon" also brings back shopping malls.
 */
export function wishParts(value: string): WishPart[] {
  const nfc = value.normalize('NFC')
  const folded = normalize(nfc)
  // Folding keeps one character per character for Vietnamese, so a cut on the folded text cuts the written one at the same place;
  // shortcut: text where it does not (rare symbols) is sent folded, as before
  const source = folded.length === nfc.length ? nfc : folded
  const parts: WishPart[] = []
  let start = 0
  for (const cut of [...folded.matchAll(WISH_PARTS), null]) {
    const end = cut?.index ?? folded.length
    const raw = folded.slice(start, end)
    const from = start + raw.length - raw.trimStart().length
    const text = raw.trim()
    if (text) {
      const written = source.slice(from, from + text.length)
      const core = coreOf(text, written)
      // coreOf drops whole words before and after the thing wished for, so the core starts where its leading words end
      const lead = core === text ? 0 : leadLength(text, written)
      parts.push({ text, core, written, writtenCore: source.slice(from + lead, from + lead + core.length) })
    }
    if (cut) start = cut.index + cut[0].length
  }
  return parts
}

/**
 * What to ask the backend for places with. The model sometimes leaves wishes in `other` worded as actions or lumped together
 * ("ăn phở", "ăn sáng bánh mì", "thích chợ, ăn uống"), which the backend cannot look up. Each wish is split out, the interest
 * the app reads it as ("food") and the thing wished for ("phở", "bánh mì") are added as interests so the backend can find places.
 * The requirement itself is sent worded the same way, part by part: the backend makes one section per distinct wording, so
 * "thích quán yên tĩnh" next to the interest "quán yên tĩnh" would show the same places split over two sections.
 */
export function forRetrieval(e: Extraction): Extraction {
  const known = new Set(e.interests.map((interest) => normalize(interest).trim()))
  const added = new Map<string, string>()
  // The parts of a wish to look for; none for anything that is not a wish (a refusal, a field other than `other`)
  const wishOf = (atom: Constraint) => (atom.field === 'other' && !isExclusion(atom) ? wishParts(atom.value).filter(isWishPart) : undefined)
  // A core that is only filler words ("uống" left of "ăn uống") names nothing to look for on its own: the part is sent as written
  const useful = (part: WishPart) => part.core !== part.text && part.core.length >= 3 && !LEAD_WORD.test(`${part.core} `)
  const sent = (part: WishPart) => (useful(part) ? part.writtenCore : part.written)
  for (const atom of [...e.hard_constraints, ...e.soft_constraints]) {
    for (const part of wishOf(atom) ?? []) {
      const standard = INTEREST_RULES.find(([, pattern]) => ruleMatches(pattern, part.written))?.[0]
      const backend = standard && BACKEND_INTEREST[standard]
      if (backend && !known.has(backend)) added.set(backend, backend)
      if (useful(part) && !known.has(part.core)) added.set(part.core, part.writtenCore)
    }
  }
  // Each wish is sent part by part. Pace and transport notes and bare times name no place, and the backend would search for their
  // words among the places, so those parts are left out (a wish made only of them is not sent at all)
  const reword = (list: Constraint[]) => list.flatMap((atom) => wishOf(atom)?.map((part) => ({ ...atom, value: sent(part) })) ?? [atom])
  // A refusal the model filed under another operator ("không ăn phở" as `eq`) is sent as the exclusion it is, so the backend never looks for it
  const refuse = (list: Constraint[]) => list.map((atom) => (isExclusion(atom) && atom.operator !== 'exclude' ? { ...atom, operator: 'exclude' as const } : atom))
  // The model sometimes lists what was refused among the interests too; the backend would go and find it
  const refused = avoidedItems(e)
  const wanted = e.interests.filter((interest) => !refused.some((item) => related(coreOf(item.t), normalize(interest).trim()) || related(coreOf(item.t), normalize(spoken(interest)).trim())))
  const send = (list: Constraint[]) => refuse(reword(list))
  return { ...e, interests: [...wanted, ...added.values()], hard_constraints: send(e.hard_constraints), soft_constraints: send(e.soft_constraints) }
}

/** "gần chợ Bến Thành", "near the Opera House": the place a wish asks to be near, up to the end of its clause. Accented only: without
 * accents "gan" is liver and "canh" a soup ("bánh canh cua"). */
const NEAR = /(?:^|\s)(?:gần|cạnh|quanh|xung quanh|near|around|close to)\s+([^,.;!?]+)/i
export const nearPlace = (text: string) => NEAR.exec(text.normalize('NFC'))?.[1].trim() || undefined

/** A clause that refuses something ("không hải sản", "no seafood"): never searched for. */
const REFUSAL = /(?:^|\s)(?:không|ko|đừng|tránh|kiêng|chẳng|no|not|without|avoid)\s/i

/**
 * What the place recommendations search for (UC 1.1): `forRetrieval`, plus two things a short search needs that a trip request does not.
 * A place the text asks to be near is sent as a preferred place, so the backend ranks what is close to it first, and the
 * "gần …" clause is cut from the wishes so it is not searched as words. The text itself is sent as a wish too (its clauses that
 * refuse something left out): the model often keeps only "ăn uống" from "Phở ngon" or nothing from "Bia hơi", and the backend's own
 * keywords and search find the dish or the kind of place from the words.
 */
export function forRecommendation(e: Extraction, text: string): Extraction {
  const base = forRetrieval(e)
  const near = nearPlace(text)
  const cut = (value: string) => (near ? value.normalize('NFC').split(NEAR)[0].trim() : value)
  const keep = (atom: Constraint) => atom.field !== 'other' || cut(atom.value).length >= 2
  const trim = (list: Constraint[]) => list.filter(keep).map((atom) => (atom.field === 'other' ? { ...atom, value: cut(atom.value) } : atom))
  const nearFolded = near ? normalize(near).trim() : ''
  const out: Extraction = {
    ...base,
    interests: near ? base.interests.filter((interest) => !normalize(interest).includes(nearFolded)).map(cut).filter((interest) => interest.length >= 2) : base.interests,
    hard_constraints: trim(base.hard_constraints),
    soft_constraints: trim(base.soft_constraints),
    preferred_places: near && !base.preferred_places.some((place) => related(place, near)) ? [...base.preferred_places, near] : base.preferred_places,
  }
  const wish = cut(text.trim())
    .split(/[,;]|\s+(?:nhưng|but)\s+/i)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 2 && !REFUSAL.test(` ${clause} `))
    .join(', ')
  const said = [...out.hard_constraints, ...out.soft_constraints].some((atom) => atom.field === 'other' && atom.operator !== 'exclude' && related(atom.value, wish))
  return said || wish.length < 2 ? out : { ...out, soft_constraints: [...out.soft_constraints, { field: 'other', operator: 'prefer', value: wish }] }
}
