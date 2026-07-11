// Shared fake-Stripe harness for webhook + billing-manage tests.
//
// Signature verification is REAL: the fake client delegates constructEvent
// to the actual Stripe SDK, and requests are signed with
// stripe.webhooks.generateTestHeaderString (spec §10 testing note) — so the
// tests exercise genuine verify-the-raw-body behavior.

import Stripe from 'stripe'
import { Hono } from 'hono'
import type { BillingStripeClient } from '../../lib/stripe.js'
import { createStripeWebhooksRouter } from '../../routes/stripe-webhooks.js'

export const TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_vitest'

// Key never used for network calls — webhooks utilities are offline.
const stripeSdk = new Stripe('sk_test_dummy_key_never_used', {
  apiVersion: '2026-06-24.dahlia',
})

export interface FakeWebhookStripe {
  client: BillingStripeClient
  /** Mutable id → subscription payload map served by subscriptions.retrieve. */
  subscriptionsById: Map<string, Record<string, unknown>>
  cancelledSubscriptionIds: string[]
  portalSessionsCreated: { customer: string; return_url: string }[]
}

export const createFakeWebhookStripe = (): FakeWebhookStripe => {
  const subscriptionsById = new Map<string, Record<string, unknown>>()
  const cancelledSubscriptionIds: string[] = []
  const portalSessionsCreated: { customer: string; return_url: string }[] = []

  const client: BillingStripeClient = {
    customers: {
      create: async () => {
        throw new Error('fake stripe: customers.create not used in this test')
      },
    },
    prices: {
      list: async () => {
        throw new Error('fake stripe: prices.list not used in this test')
      },
    },
    subscriptions: {
      create: async () => {
        throw new Error(
          'fake stripe: subscriptions.create not used in this test',
        )
      },
      retrieve: async (subscriptionId: string) => {
        const subscription = subscriptionsById.get(subscriptionId)
        if (!subscription) {
          throw new Error(`fake stripe: no such subscription ${subscriptionId}`)
        }
        return subscription
      },
      cancel: async (subscriptionId: string) => {
        const subscription = subscriptionsById.get(subscriptionId)
        if (!subscription) {
          throw new Error(`fake stripe: no such subscription ${subscriptionId}`)
        }
        cancelledSubscriptionIds.push(subscriptionId)
        subscriptionsById.set(subscriptionId, {
          ...subscription,
          status: 'canceled',
        })
        return subscriptionsById.get(subscriptionId)
      },
    },
    billingPortal: {
      sessions: {
        create: async (params) => {
          portalSessionsCreated.push(params)
          return { url: 'https://billing.stripe.com/p/session/test_123' }
        },
      },
    },
    webhooks: {
      constructEvent: (rawBody, signatureHeader, webhookSecret) =>
        stripeSdk.webhooks.constructEvent(
          rawBody,
          signatureHeader,
          webhookSecret,
        ),
    },
  }

  return {
    client,
    subscriptionsById,
    cancelledSubscriptionIds,
    portalSessionsCreated,
  }
}

export const buildWebhookApp = (
  fake: FakeWebhookStripe,
  webhookSecret: string | null = TEST_WEBHOOK_SECRET,
): Hono => {
  const app = new Hono()
  app.route(
    '/v1/webhooks/stripe',
    createStripeWebhooksRouter(
      () => fake.client,
      () => webhookSecret,
    ),
  )
  return app
}

let eventSequence = 0

export interface TestStripeEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

export const makeEvent = (
  type: string,
  object: Record<string, unknown>,
  eventId?: string,
): TestStripeEvent => {
  eventSequence += 1
  return {
    id: eventId ?? `evt_test_${eventSequence}`,
    type,
    data: { object },
  }
}

export const postSignedEvent = async (
  app: Hono,
  event: TestStripeEvent,
  options: { secret?: string; omitSignature?: boolean } = {},
): Promise<Response> => {
  const payload = JSON.stringify(event)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (!options.omitSignature) {
    headers['stripe-signature'] = stripeSdk.webhooks.generateTestHeaderString({
      payload,
      secret: options.secret ?? TEST_WEBHOOK_SECRET,
    })
  }
  return app.request('/v1/webhooks/stripe', {
    method: 'POST',
    headers,
    body: payload,
  })
}

const EPOCH_SECONDS_NOW = Math.floor(Date.now() / 1000)
export const PERIOD_START_SECONDS = EPOCH_SECONDS_NOW - 1000
export const PERIOD_END_SECONDS = EPOCH_SECONDS_NOW + 30 * 24 * 60 * 60

/** A Stripe subscription payload in the dahlia shape (periods on the item). */
export const makeSubscriptionObject = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: 'sub_wh_1',
  status: 'active',
  customer: 'cus_wh_1',
  cancel_at_period_end: false,
  metadata: { userId: 'user_wh_1' },
  items: {
    data: [
      {
        price: { id: 'price_premium', lookup_key: 'premium_monthly' },
        current_period_start: PERIOD_START_SECONDS,
        current_period_end: PERIOD_END_SECONDS,
      },
    ],
  },
  ...overrides,
})

export const makeInvoiceObject = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: 'in_wh_1',
  customer: 'cus_wh_1',
  billing_reason: 'subscription_create',
  attempt_count: 1,
  parent: { subscription_details: { subscription: 'sub_wh_1' } },
  ...overrides,
})
