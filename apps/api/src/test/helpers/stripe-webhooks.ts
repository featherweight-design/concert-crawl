// Shared fake-Stripe harness for webhook + billing-manage tests.
//
// Signature verification is REAL: the fake client delegates constructEvent
// to the actual Stripe SDK, and requests are signed with
// stripe.webhooks.generateTestHeaderString (spec §10 testing note) — so the
// tests exercise genuine verify-the-raw-body behavior.

import Stripe from 'stripe'
import { Hono } from 'hono'
import {
  STRIPE_API_VERSION,
  type BillingStripeClient,
  type StripeInvoicePreviewParams,
  type StripeSubscriptionUpdateParams,
} from '../../lib/stripe.js'
import { createStripeWebhooksRouter } from '../../routes/stripe-webhooks.js'

export const TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_vitest'

// Key never used for network calls — webhooks utilities are offline.
const stripeSdk = new Stripe('sk_test_dummy_key_never_used', {
  apiVersion: STRIPE_API_VERSION,
})

export interface FakeWebhookStripe {
  client: BillingStripeClient
  /** Mutable id → subscription payload map served by subscriptions.retrieve. */
  subscriptionsById: Map<string, Record<string, unknown>>
  cancelledSubscriptionIds: string[]
  portalSessionsCreated: { customer: string; return_url: string }[]
  /** Recorded subscriptions.update calls (lifecycle routes, PR 4.5). */
  subscriptionUpdateCalls: {
    subscriptionId: string
    params: StripeSubscriptionUpdateParams
  }[]
  /** Recorded invoices.createPreview calls (proration preview, PR 4.5). */
  invoicePreviewCalls: StripeInvoicePreviewParams[]
  /** Payload returned by invoices.createPreview — mutate per test. */
  previewInvoice: { current: Record<string, unknown> }
  /** Registered active price per lookup_key served by prices.list. */
  pricesByLookupKey: Map<string, { id: string }[]>
}

/** A plausible dahlia-shape preview invoice (upgrade default). */
export const makePreviewInvoiceObject = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  amount_due: 250,
  currency: 'usd',
  period_end: PERIOD_END_SECONDS,
  lines: {
    data: [{ amount: -150 }, { amount: 400 }],
  },
  ...overrides,
})

export const createFakeWebhookStripe = (): FakeWebhookStripe => {
  const subscriptionsById = new Map<string, Record<string, unknown>>()
  const cancelledSubscriptionIds: string[] = []
  const portalSessionsCreated: { customer: string; return_url: string }[] = []
  const subscriptionUpdateCalls: {
    subscriptionId: string
    params: StripeSubscriptionUpdateParams
  }[] = []
  const invoicePreviewCalls: StripeInvoicePreviewParams[] = []
  const previewInvoice: { current: Record<string, unknown> } = {
    current: makePreviewInvoiceObject(),
  }
  const pricesByLookupKey = new Map<string, { id: string }[]>()

  const client: BillingStripeClient = {
    customers: {
      create: async () => {
        throw new Error('fake stripe: customers.create not used in this test')
      },
    },
    prices: {
      list: async (params) => {
        const lookupKey = params.lookup_keys[0]
        const registered =
          lookupKey !== undefined ? pricesByLookupKey.get(lookupKey) : undefined
        if (!registered) {
          throw new Error(
            `fake stripe: no registered price for lookup_key ${String(lookupKey)}`,
          )
        }
        return { data: registered }
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
      update: async (subscriptionId, params) => {
        const subscription = subscriptionsById.get(subscriptionId)
        if (!subscription) {
          throw new Error(`fake stripe: no such subscription ${subscriptionId}`)
        }
        subscriptionUpdateCalls.push({ subscriptionId, params })
        const patched: Record<string, unknown> = { ...subscription }
        if (params.cancel_at_period_end !== undefined) {
          patched['cancel_at_period_end'] = params.cancel_at_period_end
        }
        subscriptionsById.set(subscriptionId, patched)
        return patched
      },
    },
    invoices: {
      createPreview: async (params) => {
        invoicePreviewCalls.push(params)
        return previewInvoice.current
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
    subscriptionUpdateCalls,
    invoicePreviewCalls,
    previewInvoice,
    pricesByLookupKey,
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
        id: 'si_wh_1',
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
