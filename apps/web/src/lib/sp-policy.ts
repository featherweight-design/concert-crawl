import { SP_POLICY } from '@concert-crawl/types'

export interface ValidationResult {
  errors: Partial<
    Record<'floor' | 'ceiling' | 'tier' | 'vendor' | 'howFound', string>
  >
  warnings: Partial<Record<'floor', string>>
  valid: boolean
}

export interface SubmissionInput {
  floor: string
  ceiling: string
  tier: string | null
  vendor: string | null
  howFound: string | null
}

export function validateSubmission(
  input: SubmissionInput,
  peerAvg?: number,
): ValidationResult {
  const errors: ValidationResult['errors'] = {}
  const warnings: ValidationResult['warnings'] = {}

  const floorNum = Number(input.floor)
  if (!input.floor) {
    errors.floor = 'Enter a floor price.'
  } else if (isNaN(floorNum) || floorNum < SP_POLICY.floorMin) {
    errors.floor = 'Has to be at least $1.'
  } else if (floorNum > SP_POLICY.floorMax) {
    errors.floor = 'Cap is $2000 — pick a number that exists.'
  }

  if (input.ceiling) {
    const ceilingNum = Number(input.ceiling)
    if (isNaN(ceilingNum) || ceilingNum > SP_POLICY.ceilingMax) {
      errors.ceiling = 'Cap is $2000.'
    } else if (!errors.floor && ceilingNum < floorNum) {
      errors.ceiling = "Ceiling can't be below floor."
    }
  }

  if (!input.tier) errors.tier = 'Pick a tier.'
  if (!input.vendor) errors.vendor = "Pick where it's listed."
  if (!input.howFound) errors.howFound = 'Pick how you found out.'

  if (!errors.floor && peerAvg != null && peerAvg > 0 && input.floor) {
    if (floorNum < SP_POLICY.outlierLowFactor * peerAvg) {
      warnings.floor = `Other fans reported around $${Math.round(peerAvg)}. Sure about this one?`
    } else if (floorNum > SP_POLICY.outlierHighFactor * peerAvg) {
      warnings.floor = `Other fans reported around $${Math.round(peerAvg)}. Sure about this one?`
    }
  }

  return {
    errors,
    warnings,
    valid: Object.keys(errors).length === 0,
  }
}
