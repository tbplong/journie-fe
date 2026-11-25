import type { Constraint, ConstraintField, Extraction } from './extraction'
import { coreOf, isExclusion, related, splitOther, spoken } from './intentFromExtraction'
import { cityById, normalize } from './pois'
import { addDays } from './time'
import type { CityId } from './types'

/**
 * Lays an edit ("không ăn phở", "thêm bảo tàng") over what the backend model understood of the original request.
 * The model reads the edit alone, so this keeps the earlier wishes and lets the edit win where the two meet:
 * a thing the edit rejects leaves the old wishes, a thing the edit asks for again leaves the old avoid list.
 */

const SCALAR_FIELDS: ConstraintField[] = ['destination', 'start_date', 'end_date', 'duration_days', 'budget_vnd', 'available_start', 'available_end']

const core = (value: string) => coreOf(normalize(value).trim())
const touches = (a: string, b: string) => related(core(spoken(a)), core(spoken(b)))
const touchesAny = (list: string[], value: string) => list.some((item) => touches(item, value))

const sameText = (a: string, b: string) => normalize(a).trim() === normalize(b).trim()
const union = (first: string[], second: string[]) => [...new Map([...first, ...second].map((item) => [normalize(item).trim(), item])).values()]

const asked = (c: Constraint) => !isExclusion(c)
const atomKey = (c: Constraint) => `${c.field}|${c.operator}|${normalize(c.value).trim()}`

function mergeAtoms(before: Constraint[], edit: Constraint[], rejected: string[], wanted: string[], editFields: Set<ConstraintField>): Constraint[] {
  const kept = before.filter((atom) => {
    if (SCALAR_FIELDS.includes(atom.field) && editFields.has(atom.field)) return false
    return asked(atom) ? !touchesAny(rejected, atom.value) : !touchesAny(wanted, atom.value)
  })
  return [...new Map([...kept, ...edit].map((atom) => [atomKey(atom), atom])).values()]
}

export function mergeExtraction(first: Extraction, second: Extraction): Extraction {
  const base = splitOther(first)
  const edit = splitOther(second)
  const atoms = [...edit.hard_constraints, ...edit.soft_constraints]
  const rejected = [...edit.avoid, ...atoms.filter((atom) => !asked(atom)).map((atom) => atom.value)]
  const wanted = [...edit.interests, ...edit.must_visit, ...edit.preferred_places, ...atoms.filter((atom) => asked(atom) && !SCALAR_FIELDS.includes(atom.field)).map((atom) => atom.value)]
  const editFields = new Set(atoms.map((atom) => atom.field))
  const keep = (list: string[]) => list.filter((item) => !touchesAny(rejected, item))

  const merged: Extraction = {
    destination: edit.destination ?? base.destination,
    start_date: edit.start_date ?? base.start_date,
    end_date: edit.end_date ?? base.end_date,
    duration_days: edit.duration_days ?? base.duration_days,
    budget_vnd: edit.budget_vnd ?? base.budget_vnd,
    budget_scope: edit.budget_vnd ? edit.budget_scope : base.budget_scope,
    available_start: edit.available_start ?? base.available_start,
    available_end: edit.available_end ?? base.available_end,
    interests: union(keep(base.interests), edit.interests),
    must_visit: union(keep(base.must_visit), edit.must_visit),
    avoid: union(base.avoid.filter((item) => !touchesAny(wanted, item)), edit.avoid),
    preferred_places: union(keep(base.preferred_places), edit.preferred_places),
    hard_constraints: mergeAtoms(base.hard_constraints, edit.hard_constraints, rejected, wanted, editFields),
    soft_constraints: mergeAtoms(base.soft_constraints, edit.soft_constraints, rejected, wanted, editFields),
    missing_fields: [],
    possible_conflicts: edit.possible_conflicts,
    needs_clarification: edit.needs_clarification,
  }
  // Interests the edit rejects must not survive as an interest under another spelling either
  merged.interests = merged.interests.filter((item) => !merged.avoid.some((avoid) => sameText(avoid, item)))
  merged.missing_fields = base.missing_fields.filter((field) => {
    if (field === 'destination') return !merged.destination
    if (field === 'travel_dates_or_duration') return !merged.duration_days && !merged.start_date
    if (field === 'budget') return !merged.budget_vnd
    return !merged.available_start && !merged.available_end
  })
  return merged
}

/**
 * What the traveler picked in the form before writing anything: the first day and the length (the last day is `startDate` + `days` - 1).
 * `dayStart`/`dayEnd` ('HH:MM') only when the traveler picked them: without them the text, then the default day, decides. An end at or
 * before the start is the next day.
 */
export type FormValues = { startDate: string; days: number; budget: number; dayStart?: string; dayEnd?: string }

const FORM_FIELDS: ConstraintField[] = ['destination', 'start_date', 'end_date', 'duration_days', 'budget_vnd']

/**
 * Puts the form over what the model read from the free text: the dates, length, budget and hours the traveler picked win, so a
 * number typed in the text never fights a number picked above. The picked `city` is the destination unless the text names
 * one: then that one is kept, to plan there or report it as a place we have no data for.
 */
export function applyForm(read: Extraction, form: FormValues, city: CityId = 'sai-gon'): Extraction {
  const destination = read.destination ?? cityById[city].destination
  const endDate = addDays(form.startDate, form.days - 1)
  const fixed: Constraint[] = [
    { field: 'destination', operator: 'eq', value: destination },
    { field: 'start_date', operator: 'eq', value: form.startDate },
    { field: 'end_date', operator: 'eq', value: endDate },
    { field: 'duration_days', operator: 'eq', value: String(form.days) },
    { field: 'budget_vnd', operator: 'max', value: String(form.budget) },
    ...(form.dayStart ? [{ field: 'available_start', operator: 'eq', value: form.dayStart } as const] : []),
    ...(form.dayEnd ? [{ field: 'available_end', operator: 'eq', value: form.dayEnd } as const] : []),
  ]
  const picked: ConstraintField[] = [...FORM_FIELDS, ...(form.dayStart ? (['available_start'] as const) : []), ...(form.dayEnd ? (['available_end'] as const) : [])]
  const rest = (list: Constraint[]) => list.filter((atom) => !picked.includes(atom.field))
  return {
    ...read,
    destination,
    start_date: form.startDate,
    end_date: endDate,
    duration_days: form.days,
    budget_vnd: form.budget,
    budget_scope: 'total',
    available_start: form.dayStart ?? read.available_start,
    available_end: form.dayEnd ?? read.available_end,
    hard_constraints: [...fixed, ...rest(read.hard_constraints)],
    soft_constraints: rest(read.soft_constraints),
    missing_fields: read.missing_fields.filter((field) => field === 'available_time' && !(form.dayStart && form.dayEnd)),
    possible_conflicts: read.possible_conflicts.filter((conflict) => conflict === 'time_order' || conflict === 'must_visit_avoid'),
    needs_clarification: false,
  }
}
