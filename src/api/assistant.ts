import type { Language } from '../types/i18n'
import { postJson } from './http'

/**
 * The contract of the backend's `POST /assistant`: Journie answering a traveler's question in a short chat, grounded on the places
 * retrieval finds. There is no on-device fallback: when the backend is away the panel says so and offers a retry.
 */
export type AssistantDestination = 'Ho Chi Minh City' | 'Hanoi' | 'Da Nang' | 'Hue'
const DESTINATIONS: readonly unknown[] = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hue'] satisfies AssistantDestination[]
const isDestination = (value: unknown): value is AssistantDestination => DESTINATIONS.includes(value)

export type AssistantTurn = { role: 'user' | 'assistant'; text: string }

export type AssistantTrip = {
  title?: string
  city?: string
  days?: { date: string; stops: string[] }[]
}

export type AssistantRequest = {
  messages: AssistantTurn[]
  destination: AssistantDestination | null
  trip: AssistantTrip | null
  language: Language
}

export type AssistantPlace = { id: string; name: string; category: string; area: string | null }
export type AssistantGuide = { id: string; title: string }

export type AssistantResponse = {
  reply: string
  places: AssistantPlace[]
  guides: AssistantGuide[]
  meta: { model: string | null; retrieved: number; semantic: boolean }
  /** The city the reply answered for and its places belong to; null from a server that does not send it yet. */
  destination: AssistantDestination | null
}

/** What the backend accepts: at most 12 turns of 1..1200 characters, the last one the traveler's, and a trip of at most 3000 characters. */
export const ASSISTANT_MAX_TURNS = 12
export const ASSISTANT_MAX_TEXT = 1200
const MAX_TRIP_CHARS = 3000

/** The trip, shortened from the end until it fits the backend's size cap; null when even its title does not. */
export function fitTrip(trip: AssistantTrip | null): AssistantTrip | null {
  if (!trip) return null
  const days = (trip.days ?? []).map((day) => ({ ...day, stops: [...day.stops] }))
  const fits = (candidate: AssistantTrip) => JSON.stringify(candidate).length <= MAX_TRIP_CHARS
  let candidate: AssistantTrip = { ...trip, days }
  while (!fits(candidate) && days.length) {
    const last = days[days.length - 1]
    if (last.stops.length > 1) last.stops.pop()
    else days.pop()
    candidate = { ...trip, days: days.length ? days : undefined }
  }
  return fits(candidate) ? candidate : null
}

/** The turns as the backend takes them: the last 12, each cut to 1200 characters, empty ones dropped. */
export function turnsFor(messages: AssistantTurn[]): AssistantTurn[] {
  return messages
    .map((turn) => ({ role: turn.role, text: turn.text.trim().slice(0, ASSISTANT_MAX_TEXT) }))
    .filter((turn) => turn.text.length > 0)
    .slice(-ASSISTANT_MAX_TURNS)
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

/** A reply's places, only the well-formed ones: from the server, or from the history this tab saved (which may be older or damaged). */
export function cleanPlaces(value: unknown): AssistantPlace[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[]).flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') return []
    return [{ id: item.id, name: item.name, category: typeof item.category === 'string' ? item.category : '', area: typeof item.area === 'string' ? item.area : null }]
  })
}

/** A reply's guides, only the well-formed ones (see `cleanPlaces`). */
export function cleanGuides(value: unknown): AssistantGuide[] {
  if (!Array.isArray(value)) return []
  return (value as unknown[]).flatMap((item) => (isRecord(item) && typeof item.id === 'string' && typeof item.title === 'string' ? [{ id: item.id, title: item.title }] : []))
}

/** `POST /assistant`. Every failure is an `ApiError` (a problem slug such as `llm-rate-limited`, `timeout` or `network`). */
export async function askAssistant(request: AssistantRequest): Promise<AssistantResponse> {
  const body: AssistantRequest = { ...request, messages: turnsFor(request.messages), trip: fitTrip(request.trip) }
  const response = await postJson<Partial<AssistantResponse> | undefined>('/assistant', body)
  return {
    reply: typeof response?.reply === 'string' ? response.reply : '',
    places: cleanPlaces(response?.places),
    guides: cleanGuides(response?.guides),
    meta: { model: response?.meta?.model ?? null, retrieved: response?.meta?.retrieved ?? 0, semantic: response?.meta?.semantic ?? false },
    destination: isDestination(response?.destination) ? response.destination : null,
  }
}
