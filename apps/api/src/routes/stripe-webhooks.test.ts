// Unit pin for the handled webhook event set. The provisioning script's
// WEBHOOK_ENABLED_EVENTS (scripts/stripe-provision-helpers.ts) pins the same
// literals in its own suite — drift on either side fails a test.

import { describe, it, expect } from 'vitest'
import { HANDLED_STRIPE_EVENTS } from './stripe-webhooks.js'

describe('HANDLED_STRIPE_EVENTS', () => {
  it('registers exactly the spec §1.5 event set', () => {
    expect([...HANDLED_STRIPE_EVENTS]).toEqual([
      'checkout.session.completed',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'payment_intent.payment_failed',
      'customer.updated',
      'payment_method.attached',
    ])
  })
})
