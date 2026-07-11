// Unit tests for the pure mapping helpers in stripe-webhook-handlers.ts
// (DB-touching handler behavior is covered by the integration suites).

import { describe, it, expect } from 'vitest'
import {
  dunningStageForAttempt,
  mapStripeStatus,
} from './stripe-webhook-handlers.js'

describe('mapStripeStatus', () => {
  it.each([
    ['active', 'active'],
    ['past_due', 'past_due'],
    ['trialing', 'trialing'],
    ['incomplete', 'incomplete'],
    ['incomplete_expired', 'incomplete_expired'],
  ] as const)('maps %s directly to %s', (stripeStatus, dbStatus) => {
    expect(mapStripeStatus(stripeStatus)).toEqual({
      status: dbStatus,
      unexpected: false,
    })
  })

  it("maps Stripe 'canceled' to our 'cancelled' spelling", () => {
    expect(mapStripeStatus('canceled')).toEqual({
      status: 'cancelled',
      unexpected: false,
    })
  })

  it.each(['unpaid', 'paused', 'some_future_status'])(
    "maps unexpected status '%s' to past_due and flags it",
    (stripeStatus) => {
      expect(mapStripeStatus(stripeStatus)).toEqual({
        status: 'past_due',
        unexpected: true,
      })
    },
  )
})

describe('dunningStageForAttempt', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 3],
    [10, 3],
  ])('attempt_count %i → stage %i', (attemptCount, stage) => {
    expect(dunningStageForAttempt(attemptCount)).toBe(stage)
  })
})
