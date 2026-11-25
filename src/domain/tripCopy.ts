import { DEFAULT_DAY_END, DEFAULT_DAY_START } from './intentFromExtraction'
import { newUid } from './solver'
import type { CityId, Pace, TransportPref, Trip } from './types'

const tripId = () => `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export type BlankTripInput = {
  userId: string
  title: string
  city: CityId
  startDate: string
  days: number
  budget: number
  dayStart?: number
  dayEnd?: number
  pace: Pace
  transport: TransportPref
}

/** UC 2.6 "Blank create": a draft with empty days that the traveler fills by hand in the editor. */
export function blankTrip(input: BlankTripInput): Trip {
  const days = Math.max(1, Math.min(7, input.days))
  return {
    id: tripId(),
    userId: input.userId,
    title: input.title.trim(),
    autoTitle: false,
    city: input.city,
    startDate: input.startDate,
    days: Array.from({ length: days }, (_, index) => ({ index, stops: [] })),
    budget: input.budget,
    dayStart: input.dayStart ?? DEFAULT_DAY_START,
    dayEnd: input.dayEnd ?? DEFAULT_DAY_END,
    pace: input.pace,
    transport: input.transport,
    status: 'draft',
    solver: { status: 'FEASIBLE', objective: 0, nodes: 0, ms: 0, model: 'manual' },
    request: '',
    rainy: false,
    createdAt: new Date().toISOString(),
    version: 1,
    mustInclude: [],
    avoidTags: [],
    interests: {},
    keywords: [],
    // No times until the traveler adds places and asks for the schedule
    scheduled: false,
  }
}

/**
 * UC 2.7 "Clone create": a new draft with the same places on the same days, starting on `startDate`. Live progress, the share and the
 * backend's timing notes stay with the original; every stop gets a new id so editing the copy never touches the original.
 */
export function cloneTrip(source: Trip, input: { userId: string; startDate: string; title: string }): Trip {
  const moved = source.startDate !== input.startDate
  return {
    ...source,
    id: tripId(),
    userId: input.userId,
    title: input.title.trim(),
    autoTitle: false,
    startDate: input.startDate,
    days: source.days.map((day) => ({ ...day, stops: day.stops.map((stop) => ({ ...stop, uid: newUid() })) })),
    status: 'draft',
    createdAt: new Date().toISOString(),
    version: 1,
    cancelledAt: undefined,
    cancelReason: undefined,
    clonedFrom: source.id,
    // A copied leg is a trip of its own, not another leg of the journey it came from
    journeyId: undefined,
    journeyOrder: undefined,
    // Opening hours depend on the weekday, so a copy on other dates is checked again before it gets times
    scheduled: moved ? false : source.scheduled,
    routing: moved ? undefined : source.routing,
  }
}
