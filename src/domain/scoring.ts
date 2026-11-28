import { cityById } from './pois'
import { haversineKm } from './geo'
import type { Interests, Poi } from './types'

export type { Interests }

export type ScoreContext = {
  interests: Interests
  /** Extra tags the user asked for in free text (e.g. "rooftop", "viewpoint"). */
  keywords: string[]
  /** Budget per stop that still feels comfortable (VND). */
  perStopBudget: number
  rainy: boolean
  /** How well the backend found each place to fit this request (0..1, from retrieval); places it did not rank fall back to `interests`. */
  fit?: ReadonlyMap<string, number>
}

/** Weights of Eq. (3): S_i = αC_i + βR_i + γP_i + δB_i + εG_i. Empirical, to be validated. */
export const WEIGHTS = { alpha: 0.38, beta: 0.2, gamma: 0.1, delta: 0.12, epsilon: 0.2 } as const

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const NO_POPULARITY_DATA = 0.5

export type ScoreParts = { c: number; r: number; p: number; b: number; g: number; score: number }

export function scorePoi(poi: Poi, ctx: ScoreContext): ScoreParts {
  const interest = ctx.interests[poi.cat] ?? 0.5
  const keywordHits = ctx.keywords.filter((word) => poi.tags.includes(word)).length
  // The backend ranked this place against the actual request ("bánh mì" lifts bánh mì shops, "hải sản" seafood ones); a fixed per-category weight cannot tell them apart.
  const fit = ctx.fit?.get(poi.id)
  const c = fit !== undefined ? clamp01(fit) : clamp01(interest + keywordHits * 0.18)
  const r = clamp01(poi.quality)
  // No popularity data exists for these places, so every place gets the same neutral value and the ranking is unaffected.
  const p = NO_POPULARITY_DATA
  const b = poi.cost <= ctx.perStopBudget ? 1 : clamp01(1 - (poi.cost - ctx.perStopBudget) / Math.max(1, ctx.perStopBudget))
  const city = cityById[poi.city]
  const g = clamp01(1 - haversineKm(poi, city) / city.radiusKm)

  let score = WEIGHTS.alpha * c + WEIGHTS.beta * r + WEIGHTS.gamma * p + WEIGHTS.delta * b + WEIGHTS.epsilon * g
  if (ctx.rainy) score *= poi.indoor ? 1.08 : 0.78
  return { c, r, p, b, g, score: clamp01(score) }
}
