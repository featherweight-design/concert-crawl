// Unit pin for the handled webhook event set. The provisioning script's
// WEBHOOK_ENABLED_EVENTS (scripts/stripe-provision-helpers.ts) pins the same
// literals in its own suite — drift on either side fails a test.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { Hono } from 'hono'
import {
  HANDLED_STRIPE_EVENTS,
  createStripeWebhooksRouter,
} from './stripe-webhooks.js'

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

describe('webhook secret configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('treats an empty STRIPE_WEBHOOK_SECRET as unconfigured (500, not 400)', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    const app = new Hono()
    app.route(
      '/v1/webhooks/stripe',
      createStripeWebhooksRouter(() => {
        throw new Error('stripe client must not be constructed on config 500')
      }),
    )

    const res = await app.request('/v1/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=abc' },
      body: '{}',
    })
    expect(res.status).toBe(500)
  })
})
