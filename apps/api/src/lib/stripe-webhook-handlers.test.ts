// Unit tests for the pure mapping helpers in stripe-webhook-handlers.ts
// (DB-touching handler behavior is covered by the integration suites).

import { describe, it, expect } from 'vitest'
import {
  dunningStageForAttempt,
  emailForCancelScheduled,
  emailForInvoicePaymentFailed,
  emailForInvoicePaymentSucceeded,
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

// Trigger map coverage (spec §4.4): every queued email carries the locked
// templateKey + dedupe key shape for its webhook trigger.

const succeededBase = {
  userId: 'user_1',
  subscriptionId: 'sub_1',
  invoiceId: 'in_1',
  billingReason: 'subscription_cycle',
  tier: 'premium' as const,
  seatNumber: null,
  customerId: 'cus_1',
  amountPaidCents: 500,
  chargedAt: new Date('2026-07-11T12:00:00Z'),
  periodEnd: new Date('2026-08-11T12:00:00Z'),
  hostedInvoiceUrl: 'https://stripe.example/receipt',
}

describe('emailForInvoicePaymentSucceeded', () => {
  it('queues welcome_paid with sub:{subscriptionId} dedupe on first invoices', () => {
    const params = emailForInvoicePaymentSucceeded({
      ...succeededBase,
      billingReason: 'subscription_create',
    })
    expect(params).toMatchObject({
      templateKey: 'welcome_paid',
      userId: 'user_1',
      dedupeKey: 'sub:sub_1',
      vars: { tier: 'premium' },
    })
  })

  it('carries the founder seat number on founder welcomes', () => {
    const params = emailForInvoicePaymentSucceeded({
      ...succeededBase,
      billingReason: 'subscription_create',
      tier: 'founder',
      seatNumber: 38,
    })
    expect(params?.vars).toMatchObject({
      tier: 'founder',
      founderSeatNumber: 38,
    })
  })

  it('queues no welcome when the tier is not a paid tier', () => {
    expect(
      emailForInvoicePaymentSucceeded({
        ...succeededBase,
        billingReason: 'subscription_create',
        tier: null,
      }),
    ).toBeNull()
  })

  it('queues renewal_receipt_monthly with invoice:{invoiceId} dedupe on renewals', () => {
    const params = emailForInvoicePaymentSucceeded(succeededBase)
    expect(params).toMatchObject({
      templateKey: 'renewal_receipt_monthly',
      dedupeKey: 'invoice:in_1',
      vars: {
        amount: '$5.00',
        tierName: 'Premium',
        customerId: 'cus_1',
        stripeReceiptUrl: 'https://stripe.example/receipt',
        chargeDate: '2026-07-11T12:00:00.000Z',
        periodEnd: '2026-08-11T12:00:00.000Z',
        periodLabel: 'July 2026',
      },
    })
  })

  it('queues no renewal receipt when the invoice has no id', () => {
    expect(
      emailForInvoicePaymentSucceeded({ ...succeededBase, invoiceId: null }),
    ).toBeNull()
  })

  it('queues no renewal receipt when the invoice created timestamp is missing', () => {
    expect(
      emailForInvoicePaymentSucceeded({ ...succeededBase, chargedAt: null }),
    ).toBeNull()
  })
})

describe('emailForInvoicePaymentFailed', () => {
  it.each([
    [1, 'dunning_1_card_declined'],
    [2, 'dunning_2_still_declined'],
    [3, 'dunning_3_final_warning'],
    [5, 'dunning_3_final_warning'],
  ] as const)(
    'attempt_count %i → %s with invoice:{id}:attempt:{n} dedupe',
    (attemptCount, templateKey) => {
      const params = emailForInvoicePaymentFailed({
        userId: 'user_1',
        invoiceId: 'in_9',
        attemptCount,
        tier: 'supporter',
      })
      expect(params).toMatchObject({
        templateKey,
        dedupeKey: `invoice:in_9:attempt:${attemptCount}`,
        vars: { tierName: 'Supporter' },
      })
    },
  )

  it('queues nothing when the invoice has no id', () => {
    expect(
      emailForInvoicePaymentFailed({
        userId: 'user_1',
        invoiceId: null,
        attemptCount: 1,
        tier: 'premium',
      }),
    ).toBeNull()
  })
})

describe('emailForCancelScheduled', () => {
  const cancelBase = {
    userId: 'user_1',
    subscriptionId: 'sub_1',
    tier: 'premium' as const,
    currentPeriodEndSeconds: 1_760_000_000,
    accountDeletion: false,
  }

  it('queues cancellation_ack with sub:{id}:{periodEnd} dedupe', () => {
    const params = emailForCancelScheduled(cancelBase)
    expect(params).toMatchObject({
      templateKey: 'cancellation_ack',
      dedupeKey: 'sub:sub_1:1760000000',
      vars: {
        tierName: 'Premium',
        accessEndsAt: new Date(1_760_000_000 * 1000).toISOString(),
      },
    })
  })

  it('falls back to an unknown-period dedupe when the period end is missing', () => {
    const params = emailForCancelScheduled({
      ...cancelBase,
      currentPeriodEndSeconds: null,
    })
    expect(params).toMatchObject({
      dedupeKey: 'sub:sub_1:unknown',
      vars: { accessEndsAt: null },
    })
  })

  it('queues nothing for account-deletion cancels', () => {
    expect(
      emailForCancelScheduled({ ...cancelBase, accountDeletion: true }),
    ).toBeNull()
  })
})
