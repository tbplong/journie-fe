import { MAX_TRIP_DAYS } from '../domain/nlp'
import { maxDayLength } from '../domain/time'
import { ApiError } from './http'

/** The topics the backend model recognises in a request: [Vietnamese, English]. */
export const KNOWN_TOPICS: [vi: string, en: string] = ['bảo tàng, cà phê, ẩm thực, công viên, mua sắm, biển, văn hoá, thiên nhiên', 'museums, cafés, food, parks, shopping, beaches, culture, nature']

const DAY_WINDOW: [string, string] = [
  'Giờ kết thúc trong ngày phải sau giờ bắt đầu. Muốn đi qua đêm thì ghi rõ “hôm sau”, ví dụ “tới 3h sáng hôm sau”.',
  'The day has to end after it starts. To go past midnight, say so, e.g. “until 3am the next day”.',
]
const DAY_TOO_LATE: [string, string] = ['Ngày đi kết thúc muộn nhất lúc 05:00 sáng hôm sau.', 'A day can end at 05:00 the next morning at the latest.']
/** The longest day as `maxDayLength` has it; with the trip's length unknown, both limits. */
const dayTooLong = (days?: number): [string, string] =>
  days === undefined
    ? ['Một ngày đi dài tối đa 20 tiếng, hoặc 18 tiếng nếu chuyến có nhiều ngày (để còn 6 tiếng nghỉ trước ngày sau).', 'A day can last up to 20 h, or 18 h on a trip of several days (leaving 6 h of rest before the next one).']
    : days > 1
      ? ['Chuyến nhiều ngày thì mỗi ngày đi tối đa 18 tiếng, để còn 6 tiếng nghỉ trước ngày sau.', 'On a trip of several days each day lasts up to 18 h, leaving 6 h of rest before the next one.']
      : ['Một ngày đi dài tối đa 20 tiếng.', 'A day can last up to 20 h.']

const DAY_REFUSED: [string, string] = [
  'Máy chủ chưa nhận khung giờ này. Ngày đi kết thúc muộn nhất 05:00 hôm sau và dài tối đa 20 tiếng (18 tiếng nếu chuyến có nhiều ngày).',
  'The server did not accept these hours. A day ends by 05:00 the next morning and lasts up to 20 h (18 h on a trip of several days).',
]

/** Why a day window cannot be planned (`dayWindowProblem`), for the hour inputs and for a refused edit: [Vietnamese, English]. */
export function dayWindowText(problem: 'day-window' | 'day-too-late' | 'day-too-long', days?: number): [vi: string, en: string] {
  return problem === 'day-too-late' ? DAY_TOO_LATE : problem === 'day-too-long' ? dayTooLong(days) : DAY_WINDOW
}

/** The error a day window that cannot be planned is refused with, before anything is sent; its message names the limit `apiErrorText` reads. */
export const dayWindowError = (problem: 'day-window' | 'day-too-late' | 'day-too-long', days: number) =>
  new ApiError(problem, problem === 'day-too-long' ? `The day is longer than ${maxDayLength(days) / 60} h` : problem === 'day-too-late' ? 'The day ends after 05:00 the next morning' : 'The day would end before it starts')

/** True when a load failed because the thing is gone or not this user's (404, 403, a `*-not-found` slug), not because the server or network failed. */
export const isNotFound = (error: unknown) => !(error instanceof ApiError) || error.status === 404 || error.status === 403 || /not.found/.test(error.code)

/** What to tell the traveler when a request to the backend failed: [Vietnamese, English]. */
export function apiErrorText(error: unknown): [vi: string, en: string] {
  const code = error instanceof ApiError ? error.code : ''
  const status = error instanceof ApiError ? error.status : 0
  const message = error instanceof Error ? error.message : ''
  if (code === 'not-configured' || code === 'retrieval-not-configured' || code === 'retrieval-db-unavailable') return ['Chưa tải được địa điểm, lát nữa thử lại nha.', 'Could not load the places, try again in a bit.']
  if (code === 'no-places') return ['Chưa có chỗ nào để xếp lịch.', 'No places to plan with yet.']
  if (code === 'nothing-fits') return ['Không có nơi nào khớp yêu cầu này. Thử nới ngân sách, giờ đi hoặc bỏ bớt điều kiện nhé.', 'Nothing fits this request. Try a larger budget, longer hours or fewer conditions.']
  if (code === 'day-limit-min') return ['Chuyến chỉ còn 1 ngày nên không bớt được nữa.', 'The trip is one day long, so there is no day to take off.']
  if (code === 'day-limit-max') return [`Chuyến đi dài tối đa ${MAX_TRIP_DAYS} ngày nên không thêm được nữa.`, `Trips are at most ${MAX_TRIP_DAYS} days long, so no day can be added.`]
  if (code === 'locked-no-fit') return ['Thay đổi này không giữ được nơi bạn đã khoá. Bỏ khoá nơi đó hoặc đổi yêu cầu nhé.', 'This change cannot keep a place you locked. Unlock it or change the request.']
  if (code === 'no-city-places') return ['Chưa có địa điểm ở thành phố này, dữ liệu đang được bổ sung.', 'No places in this city yet, the data is on its way.']
  if (code === 'too-many-places') return ['Chuyến này hơn 50 điểm, máy chủ chưa xếp được. Bỏ bớt rồi thử lại nhé.', 'Over 50 places is more than the server plans at once. Remove some and try again.']
  if (code === 'invalid-trip') return ['Có điểm bị trùng hoặc không còn trong dữ liệu. Xoá điểm đó rồi thử lại nhé.', 'A place is listed twice or is no longer in the data. Remove it and try again.']
  // A day too long says its limit in the message ("longer than 18 h"), which is the trip's length kind
  if (code === 'day-window' || code === 'day-too-late' || code === 'day-too-long') return dayWindowText(code, /\b18 h\b/.test(message) ? 2 : /\b20 h\b/.test(message) ? 1 : undefined)
  // The request itself was refused, so sending it again changes nothing
  if (status === 422) return /day_(?:end|start)/.test(message) ? DAY_REFUSED : [`Chuyến này chưa gửi được (${message}).`, `This trip cannot be sent (${message}).`]
  if (code === 'needs-clarification') return [`Câu này mình chưa hiểu. Thử nói theo chủ đề mình nhận ra: ${KNOWN_TOPICS[0]}. Hoặc chỉnh số điểm mỗi ngày ở ô bên dưới nha.`, `I did not get that one. Try a topic I recognise: ${KNOWN_TOPICS[1]}. Or change the stops per day below.`]
  if (code === 'unsupported-destination') return ['Chuyến này không đổi sang thành phố khác được. Muốn đi nơi đó thì lên một chuyến mới nhé.', 'This trip cannot move to another city. Plan a new trip for that place.']
  if (code === 'llm-rate-limited') {
    const wait = error instanceof ApiError && error.retryAfter ? ` ${error.retryAfter}s` : ''
    return [`Đang đông quá, thử lại sau${wait || ' ít phút'} nhé.`, `Too busy right now, try again in${wait || ' a few minutes'}.`]
  }
  if (code === 'llm-upstream-error') return ['Máy chủ AI đang bận, thử lại sau ít phút nha.', 'The AI server is busy, try again in a few minutes.']
  if (code === 'invalid-llm-output') return ['Có gì đó trục trặc, thử lại nhé.', 'Something went wrong, try again.']
  if (code === 'llm-timeout' || code === 'timeout') return ['Chờ lâu quá, thử lại nhé.', 'Taking too long, try again.']
  if (status > 0 && (status < 502 || status > 504)) return ['Máy chủ báo lỗi, thử lại sau nhé.', 'The server reported an error, try again later.']
  return ['Chưa kết nối được, thử lại sau nhé.', 'Could not connect, try again shortly.']
}
