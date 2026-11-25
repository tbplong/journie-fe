import type { Violation } from './types'

export const violationText = (violation: Violation | undefined, vi: boolean) =>
  violation ? (vi ? violation.detail : violation.detailEn) : undefined
