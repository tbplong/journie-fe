import type { ExtractionResponse } from '../domain/extraction'
import { API_URL, postJson } from './http'

/** True when a backend is configured; without it the planner reads requests with the on-device rules only. */
export const llmEnabled = Boolean(API_URL)

/**
 * `POST /chat`: the backend's Gemini pipeline turns a free-text request into validated constraints.
 * The backend resolves relative dates ("next Friday") against today in Vietnam when no reference date is sent.
 */
export function extractConstraints(text: string): Promise<ExtractionResponse> {
  return postJson<ExtractionResponse>('/chat', { text })
}
