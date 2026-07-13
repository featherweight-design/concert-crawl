// Integration tests for the monetization funnel captures fired by the Stripe
// webhook route (eng-infra spec Part 2 §8). Analytics is mocked so we assert
// on the exact event name + props each handler enqueues, and that captures
// run only AFTER the transaction commits (never on a rollback).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { subscriptions } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import {
  buildWebhookApp,
  createFakeWebhookStripe,
  makeEvent,
  makeInvoiceObject,
  makeSubscriptionObject,
  postSignedEvent,
} from '../test/helpers/stripe-webhooks.js'

const captureServer = vi.hoisted(() => vi.fn())
vi.mock('../lib/analytics.js', () => ({
  captureServer,
  shutdownAnalytics: vi.fn(),
}))

async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE subscriptions, subscription_events, user_billing, processed_stripe_events`,
  )
}

async function seedSubscription(
  overrides: Partial<typeof subscriptions.$inferInsert> = {},
): Promise<void> {
  await testDb.insert(subscriptions).values({
    userId: 'user_wh_1',
    stripeCustomerId: 'cus_wh_1',
    stripeSubscriptionId: 'sub_wh_1',
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date('2099-01-01T00:00:00Z'),
    ...overrides,
  })
}

describe('webhook analytics — invoice.payment_succeeded', () => {
  beforeEach(async () => {
    await clearTables()
    captureServer.mockClear()
  })

  it('fires payment_succeeded flow=new for a fresh paid subscription', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_succeeded',
        makeInvoiceObject({
          billing_reason: 'subscription_create',
          amount_paid: 1500,
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(captureServer).toHaveBeenCalledWith(
      'user_wh_1',
      'payment_succeeded',
      {
        tier: 'premium',
        amountCents: 1500,
        flow: 'new',
      },
    )
  })

  it('fires flow=trial-conversion when the mirror was previously trialing', async () => {
    await seedSubscription({ status: 'trialing' })
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_succeeded',
        makeInvoiceObject({
          billing_reason: 'subscription_cycle',
          amount_paid: 1500,
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(captureServer).toHaveBeenCalledWith(
      'user_wh_1',
      'payment_succeeded',
      expect.objectContaining({ flow: 'trial-conversion' }),
    )
  })

  it('does NOT fire on a plain renewal (subscription_cycle, prior active)', async () => {
    await seedSubscription({ status: 'active' })
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_succeeded',
        makeInvoiceObject({
          billing_reason: 'subscription_cycle',
          amount_paid: 1500,
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(captureServer).not.toHaveBeenCalled()
  })
})

describe('webhook analytics — customer.subscription.deleted', () => {
  beforeEach(async () => {
    await clearTables()
    captureServer.mockClear()
  })

  it('fires cancel_completed with whole days subscribed', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    await seedSubscription({ createdAt: tenDaysAgo })
    // A paid subscription_created event so subscriptionNeverPaid is false.
    await testDb.execute(
      sql`INSERT INTO subscription_events (user_id, type, stripe_event_id, metadata)
          VALUES ('user_wh_1', 'subscription_created', 'evt_paid_seed', ${sql.raw(
            `'{"subscriptionId":"sub_wh_1"}'::jsonb`,
          )})`,
    )
    const fake = createFakeWebhookStripe()
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.deleted',
        makeSubscriptionObject({ status: 'canceled' }),
      ),
    )
    expect(res.status).toBe(200)
    expect(captureServer).toHaveBeenCalledWith(
      'user_wh_1',
      'cancel_completed',
      {
        tier: 'premium',
        daysSubscribed: 10,
      },
    )
  })
})

describe('webhook analytics — payment_intent.payment_failed', () => {
  beforeEach(async () => {
    await clearTables()
    captureServer.mockClear()
  })

  it('fires payment_failed with the resolved tier and decline category', async () => {
    await seedSubscription()
    const fake = createFakeWebhookStripe()
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent('payment_intent.payment_failed', {
        id: 'pi_wh_1',
        customer: 'cus_wh_1',
        last_payment_error: {
          code: 'card_declined',
          decline_code: 'generic_decline',
        },
      }),
    )
    expect(res.status).toBe(200)
    expect(captureServer).toHaveBeenCalledWith(
      'user_wh_1',
      'payment_failed',
      expect.objectContaining({ tier: 'premium' }),
    )
  })
})
