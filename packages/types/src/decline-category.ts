// packages/types/src/decline-category.ts
//
// decline_code → 5-category mapping (eng infra spec Part 2 §1.6, #782 §2).
//
// Pure function shared by the API webhook handler (funnel analytics) and the
// web tier-picker (failure-surface routing). The raw decline_code is never
// rendered to users — it flows into subscription_events.metadata (and later
// PostHog) only.

export type DeclineCategory =
  | 'insufficient_funds'
  | 'expired_or_incorrect_card'
  | 'issuer_declined'
  | 'fraud_block'
  | 'network_timeout'

const EXPIRED_OR_INCORRECT_CODES = new Set([
  'expired_card',
  'incorrect_cvc',
  'incorrect_number',
  'invalid_expiry_month',
  'invalid_expiry_year',
])

const FRAUD_BLOCK_CODES = new Set([
  'fraudulent',
  'stolen_card',
  'lost_card',
  'pickup_card',
  'restricted_card',
])

// Stripe error types that mean "the request never got a card decision" —
// only relevant when no decline_code exists (spec §1.6 network_timeout row).
const NETWORK_ERROR_TYPES = new Set(['api_error', 'api_connection_error'])

export interface DeclineSignal {
  /** Stripe `last_payment_error.decline_code` (card-issuer verdict). */
  declineCode?: string | null
  /** Stripe error `code` — validation errors reuse the card-code names. */
  errorCode?: string | null
  /** Stripe error `type` (e.g. card_error, api_error). */
  errorType?: string | null
}

export const mapDeclineCategory = (signal: DeclineSignal): DeclineCategory => {
  const declineCode = signal.declineCode ?? null
  if (declineCode !== null) {
    if (declineCode === 'insufficient_funds') return 'insufficient_funds'
    if (EXPIRED_OR_INCORRECT_CODES.has(declineCode)) {
      return 'expired_or_incorrect_card'
    }
    if (FRAUD_BLOCK_CODES.has(declineCode)) return 'fraud_block'
    // Default for every other decline_code (do_not_honor, generic_decline,
    // card_velocity_exceeded, …) — catch-all per #782.
    return 'issuer_declined'
  }

  // No issuer verdict: validation-error codes reuse the card-code names.
  const errorCode = signal.errorCode ?? null
  if (errorCode !== null && EXPIRED_OR_INCORRECT_CODES.has(errorCode)) {
    return 'expired_or_incorrect_card'
  }

  // No decline_code + transport/API failure ⇒ the card was never decided.
  const errorType = signal.errorType ?? null
  if (errorType !== null && NETWORK_ERROR_TYPES.has(errorType)) {
    return 'network_timeout'
  }

  return 'issuer_declined'
}
