/**
 * Reads opening hours written in OSM syntax (the form the places data uses): `Mo-Su 07:30-12:00,13:30-17:00`,
 * `Mo-Sa 10:00-14:00; Su 04:00-21:00`, `Tu-Sa 18:00-22:00`, `24/7`, `Mo off`.
 * A place keeps every interval of each weekday (`weekWindows`), which the planner checks a visit against on its
 * date, and a summary window open on every day the place opens (`dailyWindow`) for showing and filtering. The
 * summary never reports a time the place is closed.
 */

/** Weekday index → opening intervals in minutes after midnight (a close past 1440 means after midnight). */
export type WeekHours = Map<number, [number, number][]>

const DAY_INDEX: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_MINUTES = 1440

function daysOf(spec: string): number[] | null {
  const days: number[] = []
  for (const part of spec.split(',')) {
    const [from, to] = part.trim().split('-')
    const a = DAY_INDEX[from]
    const b = to === undefined ? a : DAY_INDEX[to]
    if (a === undefined || b === undefined) return null
    for (let i = WEEK_ORDER.indexOf(a); ; i = (i + 1) % 7) {
      days.push(WEEK_ORDER[i])
      if (WEEK_ORDER[i] === b) break
    }
  }
  return days
}

function intervalsOf(spec: string): [number, number][] | null {
  const out: [number, number][] = []
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const open = Number(m[1]) * 60 + Number(m[2])
    let close = Number(m[3]) * 60 + Number(m[4])
    if (close <= open) close += DAY_MINUTES
    out.push([open, close])
  }
  return out
}

/** The week as written, or null when the text is empty or uses syntax this reader does not know (hours are then treated as unknown). */
export function parseOpeningHours(raw: string | null | undefined): WeekHours | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  const week: WeekHours = new Map(WEEK_ORDER.map((day) => [day, []]))
  if (text === '24/7') {
    WEEK_ORDER.forEach((day) => week.set(day, [[0, DAY_MINUTES]]))
    return week
  }
  for (const rule of text.split(';')) {
    const m = rule.trim().match(/^(?:([A-Za-z]{2}(?:\s*[-,]\s*[A-Za-z]{2})*)\s+)?(.+)$/)
    if (!m) return null
    const days = m[1] ? daysOf(m[1].replace(/\s+/g, '')) : WEEK_ORDER
    if (!days) return null
    const times = m[2].trim()
    const intervals = times.toLowerCase() === 'off' ? [] : intervalsOf(times)
    if (!intervals) return null
    days.forEach((day) => week.set(day, intervals))
  }
  return week
}

/**
 * Each weekday's intervals (index 0 = Sunday), sorted, with touching ones joined and ending by midnight; a time past midnight
 * opens the next morning instead. Null when the hours are unknown or never open, like `dailyWindow` (the place counts as open all day).
 */
export function weekWindows(week: WeekHours | null): [number, number][][] | null {
  if (!week || ![...week.values()].some((intervals) => intervals.length)) return null
  const days: [number, number][][] = Array.from({ length: 7 }, () => [])
  for (const [day, intervals] of week) {
    for (const [open, close] of intervals) {
      days[day].push([open, Math.min(close, DAY_MINUTES)])
      if (close > DAY_MINUTES) days[(day + 1) % 7].push([0, close - DAY_MINUTES])
    }
  }
  return days.map((intervals) =>
    intervals
      .sort((a, b) => a[0] - b[0])
      .reduce<[number, number][]>((out, [open, close]) => {
        const last = out[out.length - 1]
        if (last && open <= last[1]) last[1] = Math.max(last[1], close)
        else out.push([open, close])
        return out
      }, []),
  )
}

export type DailyWindow = { open: number; close: number; closedDays: number[] }

/**
 * One window valid on every open day: each day's longest interval (a lunch break splits a day, and the longer
 * half is kept), intersected across the open days. When the days share no common time the window covering the
 * most days is used and the other days count as closed. Null when the hours are unknown or never open.
 */
export function dailyWindow(week: WeekHours | null): DailyWindow | null {
  if (!week) return null
  const longest = new Map<number, [number, number]>()
  for (const [day, intervals] of week) {
    if (!intervals.length) continue
    longest.set(day, intervals.reduce((best, cur) => (cur[1] - cur[0] > best[1] - best[0] ? cur : best)))
  }
  if (longest.size === 0) return null
  const windows = [...longest.values()].map(([open, close]) => [open, Math.min(close, DAY_MINUTES)] as [number, number])
  const open = Math.max(...windows.map((w) => w[0]))
  const close = Math.min(...windows.map((w) => w[1]))
  const closedDays = (day: number) => !longest.has(day)
  if (open < close) return { open, close, closedDays: WEEK_ORDER.filter(closedDays) }
  // No common time: keep the candidate that covers the most days, the rest count as closed
  let best: { window: [number, number]; covered: number[] } | null = null
  for (const candidate of windows) {
    const covered = [...longest].filter(([, [o, c]]) => o <= candidate[0] && Math.min(c, DAY_MINUTES) >= candidate[1]).map(([day]) => day)
    if (!best || covered.length > best.covered.length) best = { window: candidate, covered }
  }
  return best && { open: best.window[0], close: best.window[1], closedDays: WEEK_ORDER.filter((day) => !best.covered.includes(day)) }
}
