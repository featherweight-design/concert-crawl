// Integration tests for POST /v1/webhooks/stripe — router mechanics
// (signature, idempotency, no-ops) + the invoice.* handlers.
//
// Signature verification is REAL (Stripe SDK constructEvent against a body
// signed with generateTestHeaderString) — see test/helpers/stripe-webhooks.

import { describe, it, expect, beforeEach } from 'vitest'
import { asc, eq, sql } from 'drizzle-orm'
import {
  processedStripeEvents,
  subscriptions,
  subscriptionEvents,
  userBilling,
} from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import {
  buildWebhookApp,
  createFakeWebhookStripe,
  makeEvent,
  makeInvoiceObject,
  makeSubscriptionObject,
  postSignedEvent,
  PERIOD_END_SECONDS,
} from '../test/helpers/stripe-webhooks.js'

async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE subscriptions, subscription_events, user_billing, processed_stripe_events`,
  )
}

async function listEvents(
  userId: string,
): Promise<(typeof subscriptionEvents.$inferSelect)[]> {
  return testDb
    .select()
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.userId, userId))
    .orderBy(asc(subscriptionEvents.createdAt))
}

async function readSubscription(
  userId: string,
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const [row] = await testDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  return row
}

describe('POST /v1/webhooks/stripe — router mechanics', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns 400 when the stripe-signature header is missing', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const event = makeEvent('customer.updated', { id: 'cus_x' })
    const res = await postSignedEvent(app, event, { omitSignature: true })
    expect(res.status).toBe(400)
  })

  it('returns 400 when the signature does not match the body', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const event = makeEvent('customer.updated', { id: 'cus_x' })
    const res = await postSignedEvent(app, event, {
      secret: 'whsec_wrong_secret',
    })
    expect(res.status).toBe(400)
    // A rejected signature must never consume the idempotency key.
    const rows = await testDb.select().from(processedStripeEvents)
    expect(rows).toHaveLength(0)
  })

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe(), null)
    const event = makeEvent('customer.updated', { id: 'cus_x' })
    const res = await postSignedEvent(app, event)
    expect(res.status).toBe(500)
  })

  it('acknowledges duplicates with 200 without re-processing', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)
    const event = makeEvent(
      'invoice.payment_succeeded',
      makeInvoiceObject(),
      'evt_dup_1',
    )

    const first = await postSignedEvent(app, event)
    expect(first.status).toBe(200)

    const second = await postSignedEvent(app, event)
    expect(second.status).toBe(200)
    const body: { success: boolean; duplicate?: boolean } = await second.json()
    expect(body.duplicate).toBe(true)

    // The handler ran exactly once — one subscription_created event.
    const events = await listEvents('user_wh_1')
    expect(events.map((row) => row.type)).toEqual(['subscription_created'])
  })

  it('acknowledges checkout.session.completed as a logged no-op', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const res = await postSignedEvent(
      app,
      makeEvent('checkout.session.completed', { id: 'cs_x' }),
    )
    expect(res.status).toBe(200)
  })

  it.each(['customer.updated', 'payment_method.attached'])(
    'acknowledges %s as a logged no-op (card cache not built yet)',
    async (type) => {
      const app = buildWebhookApp(createFakeWebhookStripe())
      const res = await postSignedEvent(app, makeEvent(type, { id: 'obj_x' }))
      expect(res.status).toBe(200)
    },
  )

  it('acknowledges unregistered event types with 200', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const res = await postSignedEvent(
      app,
      makeEvent('charge.refunded', { id: 'ch_x' }),
    )
    expect(res.status).toBe(200)
  })

  it('releases the idempotency row on handler failure so a retry re-processes', async () => {
    const fake = createFakeWebhookStripe()
    // sub_wh_1 NOT registered → subscriptions.retrieve throws → handler 500s.
    const app = buildWebhookApp(fake)
    const event = makeEvent(
      'invoice.payment_succeeded',
      makeInvoiceObject(),
      'evt_retry_1',
    )

    const failed = await postSignedEvent(app, event)
    expect(failed.status).toBe(500)
    const rowsAfterFailure = await testDb.select().from(processedStripeEvents)
    expect(rowsAfterFailure).toHaveLength(0)

    // Stripe retries the SAME event id — now the subscription resolves.
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const retried = await postSignedEvent(app, event)
    expect(retried.status).toBe(200)
    const events = await listEvents('user_wh_1')
    expect(events.map((row) => row.type)).toEqual(['subscription_created'])
  })
})

describe('invoice.payment_succeeded', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('creates the mirror row + subscription_created on the first invoice', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent('invoice.payment_succeeded', makeInvoiceObject()),
    )
    expect(res.status).toBe(200)

    const row = await readSubscription('user_wh_1')
    expect(row?.status).toBe('active')
    expect(row?.tier).toBe('premium')
    expect(row?.stripeSubscriptionId).toBe('sub_wh_1')
    expect(row?.stripeCustomerId).toBe('cus_wh_1')
    expect(row?.stripePriceId).toBe('price_premium')
    expect(row?.currentPeriodEnd?.getTime()).toBe(PERIOD_END_SECONDS * 1000)

    const events = await listEvents('user_wh_1')
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('subscription_created')
    expect(events[0]?.metadata).toMatchObject({
      subscriptionId: 'sub_wh_1',
      invoiceId: 'in_wh_1',
      tier: 'premium',
    })
  })

  it('stamps the founder seat number into subscription_created metadata', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({
        metadata: { userId: 'user_wh_1', founderSeatNumber: '7' },
        items: {
          data: [
            {
              price: { id: 'price_founder', lookup_key: 'founder_monthly' },
              current_period_end: PERIOD_END_SECONDS,
            },
          ],
        },
      }),
    )
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent('invoice.payment_succeeded', makeInvoiceObject()),
    )
    expect(res.status).toBe(200)
    const events = await listEvents('user_wh_1')
    expect(events[0]?.metadata).toMatchObject({
      tier: 'founder',
      seatNumber: 7,
    })
  })

  it('writes renewal_succeeded for a renewal invoice and clears the purge clock', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)
    await testDb.insert(userBilling).values({
      userId: 'user_wh_1',
      premiumDataExpiresAt: new Date('2099-01-01T00:00:00Z'),
    })

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_succeeded',
        makeInvoiceObject({ billing_reason: 'subscription_cycle' }),
      ),
    )
    expect(res.status).toBe(200)

    const events = await listEvents('user_wh_1')
    expect(events.map((row) => row.type)).toEqual(['renewal_succeeded'])

    const [billingRow] = await testDb
      .select()
      .from(userBilling)
      .where(eq(userBilling.userId, 'user_wh_1'))
    expect(billingRow?.premiumDataExpiresAt).toBeNull()
  })

  it('skips (200) an invoice with no subscription pointer', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_succeeded',
        makeInvoiceObject({ parent: null }),
      ),
    )
    expect(res.status).toBe(200)
    const rows = await testDb.select().from(subscriptionEvents)
    expect(rows).toHaveLength(0)
  })

  it('resolves the subscription id from the legacy top-level field', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set('sub_wh_1', makeSubscriptionObject())
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_succeeded',
        makeInvoiceObject({ parent: null, subscription: 'sub_wh_1' }),
      ),
    )
    expect(res.status).toBe(200)
    const events = await listEvents('user_wh_1')
    expect(events).toHaveLength(1)
  })

  it('skips (200) an unmatchable subscription (no metadata userId, no mirror row)', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ metadata: {} }),
    )
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent('invoice.payment_succeeded', makeInvoiceObject()),
    )
    expect(res.status).toBe(200)
    const rows = await testDb.select().from(subscriptionEvents)
    expect(rows).toHaveLength(0)
  })
})

describe('invoice.payment_failed', () => {
  beforeEach(async () => {
    await clearTables()
  })

  const seedActiveSubscription = async (): Promise<void> => {
    await testDb.insert(subscriptions).values({
      userId: 'user_wh_1',
      stripeCustomerId: 'cus_wh_1',
      stripeSubscriptionId: 'sub_wh_1',
      tier: 'premium',
      status: 'active',
      currentPeriodEnd: new Date('2099-01-01T00:00:00Z'),
    })
  }

  it('moves the mirror to past_due and writes payment_failed + past_due_entered', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ status: 'past_due' }),
    )
    const app = buildWebhookApp(fake)
    await seedActiveSubscription()

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_failed',
        makeInvoiceObject({
          billing_reason: 'subscription_cycle',
          attempt_count: 1,
        }),
      ),
    )
    expect(res.status).toBe(200)

    const row = await readSubscription('user_wh_1')
    expect(row?.status).toBe('past_due')

    const events = await listEvents('user_wh_1')
    expect(events.map((event) => event.type)).toEqual([
      'payment_failed',
      'past_due_entered',
    ])
    expect(events[0]?.metadata).toMatchObject({
      attemptCount: 1,
      dunningStage: 1,
    })
  })

  it('escalates the dunning stage without duplicating past_due_entered', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ status: 'past_due' }),
    )
    const app = buildWebhookApp(fake)
    await seedActiveSubscription()

    for (const attemptCount of [1, 2, 4]) {
      const res = await postSignedEvent(
        app,
        makeEvent(
          'invoice.payment_failed',
          makeInvoiceObject({
            billing_reason: 'subscription_cycle',
            attempt_count: attemptCount,
          }),
        ),
      )
      expect(res.status).toBe(200)
    }

    const events = await listEvents('user_wh_1')
    const failures = events.filter((event) => event.type === 'payment_failed')
    const pastDueEntries = events.filter(
      (event) => event.type === 'past_due_entered',
    )
    expect(failures).toHaveLength(3)
    expect(pastDueEntries).toHaveLength(1)
    expect(
      failures.map((event) =>
        typeof event.metadata === 'object' &&
        event.metadata !== null &&
        'dunningStage' in event.metadata
          ? event.metadata.dunningStage
          : null,
      ),
    ).toEqual([1, 2, 3])
  })

  it('is a no-op for a failed FIRST invoice (subscription_create)', async () => {
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ status: 'incomplete' }),
    )
    const app = buildWebhookApp(fake)

    const res = await postSignedEvent(
      app,
      makeEvent(
        'invoice.payment_failed',
        makeInvoiceObject({ billing_reason: 'subscription_create' }),
      ),
    )
    expect(res.status).toBe(200)
    const rows = await testDb.select().from(subscriptionEvents)
    expect(rows).toHaveLength(0)
    const subscriptionRows = await testDb.select().from(subscriptions)
    expect(subscriptionRows).toHaveLength(0)
  })
})
