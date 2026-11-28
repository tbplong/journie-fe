/**
 * The planner talks to a FastAPI backend in production (see report §5.3). Intent extraction already
 * calls it (`POST /chat`, see `extraction.ts`) whenever `VITE_API_URL` is set; every other endpoint in
 * `src/api` still runs against an in-browser mock with the same shapes, so replacing a function body
 * with a `postJson`/`fetch` call is the only change needed.
 */
export const API_URL: string | undefined = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  code: string
  /** HTTP status, or 0 when no response arrived (offline, timeout). */
  status: number
  /** Seconds the server asked us to wait (`Retry-After`), when it said so. */
  retryAfter?: number

  constructor(code: string, message: string, status = 0, retryAfter?: number) {
    super(message)
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

/**
 * How long the browser waits for the backend. The backend gives the model 60 s, so waiting a little
 * longer lets its own `llm-timeout` answer arrive instead of a bare abort.
 */
export const REQUEST_TIMEOUT_MS = 70_000

/** The backend reports errors as RFC 9457 `application/problem+json`; its `type` ends in a stable slug such as `llm-rate-limited`. */
async function problemFrom(response: Response): Promise<ApiError> {
  const retry = Number(response.headers.get('Retry-After'))
  const retryAfter = Number.isFinite(retry) && retry > 0 ? retry : undefined
  try {
    const body = (await response.json()) as { type?: unknown; detail?: unknown }
    const slug = typeof body.type === 'string' ? body.type.split('/').pop() : ''
    // FastAPI's own validation errors (422) are not problems: `detail` is a list of `{ msg }`, and the first says what was wrong
    const first = Array.isArray(body.detail) ? (body.detail[0] as { msg?: unknown } | undefined)?.msg : undefined
    const detail = typeof body.detail === 'string' ? body.detail : typeof first === 'string' ? first.replace(/^Value error, /, '') : response.statusText
    return new ApiError(slug || `http-${response.status}`, detail, response.status, retryAfter)
  } catch {
    return new ApiError(`http-${response.status}`, response.statusText, response.status, retryAfter)
  }
}

/** Bearer token from the backend's login; sent with every request once there is one. */
let authToken: string | null = null
export const setAuthToken = (token: string | null) => {
  authToken = token
}

let unauthorized: (() => void) | null = null
/** What to do when the backend refuses the session (401): the session store signs out, token or not. */
export const onUnauthorized = (handler: () => void) => {
  unauthorized = handler
}

/** Whether the backend itself has answered any request in this session; until it has, no answer means no backend (demo mode). */
let backendAnswered = false

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Sends a request to the backend. Every failure is an `ApiError`: a problem slug, `timeout`, or `network`. */
export async function requestJson<T>(method: Method, path: string, body?: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  if (!API_URL) throw new ApiError('not-configured', 'VITE_API_URL is not set')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const form = body instanceof FormData
  const headers: Record<string, string> = {}
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
      signal: controller.signal,
    })
    // A gateway's 502-504 or a host's own HTML page is not the backend speaking
    if (response.status === 204 || response.headers.get('content-type')?.includes('json')) backendAnswered = true
    // Token or not: a session made on the device has none, and a backend with real sign-in refuses it. The `/auth/*` routes answer
    // 401 for a wrong password or while signing out, which says nothing about the session.
    if (response.status === 401 && !path.startsWith('/auth/')) unauthorized?.()
    if (!response.ok) throw await problemFrom(response)
    if (response.status === 204) return undefined as T
    // A 200 or 202 with no body is an answer too, not a lost connection
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'network', error instanceof Error ? error.message : 'request failed')
  } finally {
    window.clearTimeout(timer)
  }
}

/** POSTs JSON to the backend. Every failure is an `ApiError`: a problem slug, `timeout`, or `network`. */
export const postJson = <T>(path: string, body: unknown, timeoutMs = REQUEST_TIMEOUT_MS) => requestJson<T>('POST', path, body, timeoutMs)

/** Waits for account and data calls; the planner's own calls keep the longer `REQUEST_TIMEOUT_MS`. */
export const CRUD_TIMEOUT_MS = 12_000

/** The backend has no such route yet: FastAPI's bare 404/405 (no problem `type`), or no backend configured at all. */
export const endpointMissing = (error: unknown) => error instanceof ApiError && (error.code === 'not-configured' || ((error.status === 404 || error.status === 405) && error.code.startsWith('http-')))

const deviceOnly = new Set<string>()

/**
 * Calls the backend for `feature` and runs `local` (this browser's storage) while the backend has no such route, or while no backend
 * has answered at all in this session (demo mode). One miss keeps the feature on the device for the rest of the session, so a
 * missing route is asked once, not per call. Once the backend has answered, an outage is an error: falling back then would keep
 * the traveler's edits (and a new account's password) in this browser without a word.
 */
export async function remoteOr<T>(feature: string, remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  if (!API_URL || deviceOnly.has(feature)) return local()
  try {
    return await remote()
  } catch (error) {
    const demo = noServerAnswer(error) && !backendAnswered
    if (!endpointMissing(error) && !demo) throw error
    deviceOnly.add(feature)
    return local()
  }
}

/** True while `feature` is kept in this browser only (no backend route yet), so the UI can say its data stays on this device. */
export const isDeviceOnly = (feature: string) => !API_URL || deviceOnly.has(feature)

/**
 * True when the server gave no answer to act on: nothing was sent or nothing came back (status 0: offline, timeout, a request the
 * app could not send), or it is down for now (502-504). Any other status is the server's answer.
 */
export const noServerAnswer = (error: unknown) => error instanceof ApiError && (error.status === 0 || (error.status >= 502 && error.status <= 504))

export function latency<T>(value: T | (() => T), min = 280, max = 640): Promise<T> {
  const wait = min + Math.random() * (max - min)
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve(typeof value === 'function' ? (value as () => T)() : value)
      } catch (error) {
        reject(error)
      }
    }, wait)
  })
}

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStore<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: the in-memory session keeps working */
  }
}
