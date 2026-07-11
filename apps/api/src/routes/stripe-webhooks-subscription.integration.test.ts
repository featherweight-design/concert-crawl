// Integration tests for POST /v1/webhooks/stripe — the
// customer.subscription.updated/deleted and payment_intent.payment_failed
// handlers (sibling to stripe-webhooks.integration.test.ts, split to stay
// under the file-size ceiling).

import { describe, it, expect, beforeEach } from 'vitest'
import { asc, eq, sql } from 'drizzle-orm'
import {
  founderWindow,
  subscriptions,
  subscriptionEvents,
  userBilling,
} from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import {
  buildWebhookApp,
  createFakeWebhookStripe,
  makeEvent,
  makeSubscriptionObject,
  postSignedEvent,
} from '../test/helpers/stripe-webhooks.js'

async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE subscriptions, subscription_events, user_billing, processed_stripe_events`,
  )
}

async function setFounderWindow(seatsRemaining: number): Promise<void> {
  const values = {
    opensAt: new Date(),
    seatsTotal: 100,
    seatsRemaining,
    seatsRemainingTest: 100,
    windowDays: 30,
  }
  await testDb
    .insert(founderWindow)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: founderWindow.id, set: values })
}

async function readSeatsRemaining(): Promise<number> {
  const [row] = await testDb
    .select({ seatsRemaining: founderWindow.seatsRemaining })
    .from(founderWindow)
    .where(eq(founderWindow.id, 1))
  if (!row) throw new Error('founder_window singleton row missing')
  return row.seatsRemaining
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

describe('customer.subscription.updated', () => {
  beforeEach(async () => {
    await clearTables()
    await setFounderWindow(50)
  })

  it('mirrors status/period fields onto the existing row', async () => {
    await seedSubscription({ status: 'incomplete' })
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent('customer.subscription.updated', makeSubscriptionObject()),
    )
    expect(res.status).toBe(200)
    const row = await readSubscription('user_wh_1')
    expect(row?.status).toBe('active')
    expect(row?.stripePriceId).toBe('price_premium')
  })

  it('writes cancel_scheduled when cancel_at_period_end flips on', async () => {
    await seedSubscription({ cancelAtPeriodEnd: false })
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.updated',
        makeSubscriptionObject({ cancel_at_period_end: true }),
      ),
    )
    expect(res.status).toBe(200)
    const row = await readSubscription('user_wh_1')
    expect(row?.cancelAtPeriodEnd).toBe(true)
    const events = await listEvents('user_wh_1')
    expect(events.map((event) => event.type)).toEqual(['cancel_scheduled'])
  })

  it('writes resubscribed when cancel_at_period_end flips off', async () => {
    await seedSubscription({ cancelAtPeriodEnd: true })
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.updated',
        makeSubscriptionObject({ cancel_at_period_end: false }),
      ),
    )
    expect(res.status).toBe(200)
    const events = await listEvents('user_wh_1')
    expect(events.map((event) => event.type)).toEqual(['resubscribed'])
  })

  it('writes no flip event when cancel_at_period_end is unchanged', async () => {
    await seedSubscription({ cancelAtPeriodEnd: false })
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent('customer.subscription.updated', makeSubscriptionObject()),
    )
    expect(res.status).toBe(200)
    expect(await listEvents('user_wh_1')).toHaveLength(0)
  })

  it("maps Stripe 'canceled' to our 'cancelled'", async () => {
    await seedSubscription()
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.updated',
        makeSubscriptionObject({ status: 'canceled' }),
      ),
    )
    expect(res.status).toBe(200)
    expect((await readSubscription('user_wh_1'))?.status).toBe('cancelled')
  })

  it.each(['unpaid', 'paused'])(
    "maps unexpected Stripe status '%s' to past_due",
    async (stripeStatus) => {
      await seedSubscription()
      const app = buildWebhookApp(createFakeWebhookStripe())

      const res = await postSignedEvent(
        app,
        makeEvent(
          'customer.subscription.updated',
          makeSubscriptionObject({ status: stripeStatus }),
        ),
      )
      expect(res.status).toBe(200)
      expect((await readSubscription('user_wh_1'))?.status).toBe('past_due')
    },
  )

  it('restores the founder seat on incomplete_expired (idempotently)', async () => {
    await seedSubscription({ tier: 'founder', status: 'incomplete' })
    const app = buildWebhookApp(createFakeWebhookStripe())
    const expiredObject = makeSubscriptionObject({
      status: 'incomplete_expired',
      metadata: { userId: 'user_wh_1', founderSeatNumber: '51' },
    })

    const first = await postSignedEvent(
      app,
      makeEvent('customer.subscription.updated', expiredObject),
    )
    expect(first.status).toBe(200)
    expect(await readSeatsRemaining()).toBe(51)

    // A replayed update (new event id, same subscription) must not restore
    // the same claim twice.
    const second = await postSignedEvent(
      app,
      makeEvent('customer.subscription.updated', expiredObject),
    )
    expect(second.status).toBe(200)
    expect(await readSeatsRemaining()).toBe(51)

    const restores = (await listEvents('user_wh_1')).filter(
      (event) => event.type === 'founder_seat_restored',
    )
    expect(restores).toHaveLength(1)
    expect(restores[0]?.metadata).toMatchObject({
      subscriptionId: 'sub_wh_1',
      seatNumber: 51,
      reason: 'incomplete_expired',
    })
  })

  it('skips (200) an unmatchable subscription', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.updated',
        makeSubscriptionObject({ metadata: {} }),
      ),
    )
    expect(res.status).toBe(200)
    const rows = await testDb.select().from(subscriptions)
    expect(rows).toHaveLength(0)
  })
})

describe('customer.subscription.deleted', () => {
  beforeEach(async () => {
    await clearTables()
    await setFounderWindow(50)
  })

  const deletedObject = (overrides: Record<string, unknown> = {}) =>
    makeSubscriptionObject({ status: 'canceled', ...overrides })

  const seedPaidHistory = async (): Promise<void> => {
    await testDb.insert(subscriptionEvents).values({
      userId: 'user_wh_1',
      type: 'subscription_created',
      metadata: { subscriptionId: 'sub_wh_1' },
    })
  }

  it('marks the mirror cancelled and writes cancel_completed', async () => {
    await seedSubscription()
    await seedPaidHistory()
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent('customer.subscription.deleted', deletedObject()),
    )
    expect(res.status).toBe(200)
    expect((await readSubscription('user_wh_1'))?.status).toBe('cancelled')
    const events = await listEvents('user_wh_1')
    expect(events.map((event) => event.type)).toEqual([
      'subscription_created',
      'cancel_completed',
    ])
  })

  it.each(['premium', 'founder'] as const)(
    'starts the 90-day purge clock for a paid %s subscription',
    async (tier) => {
      await seedSubscription({ tier })
      await seedPaidHistory()
      const app = buildWebhookApp(createFakeWebhookStripe())

      const before = Date.now()
      const res = await postSignedEvent(
        app,
        makeEvent('customer.subscription.deleted', deletedObject()),
      )
      expect(res.status).toBe(200)

      const [billingRow] = await testDb
        .select()
        .from(userBilling)
        .where(eq(userBilling.userId, 'user_wh_1'))
      const expiresAt = billingRow?.premiumDataExpiresAt?.getTime() ?? 0
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
      expect(expiresAt).toBeGreaterThanOrEqual(before + ninetyDaysMs - 5000)
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + ninetyDaysMs + 5000)
    },
  )

  it('does NOT start a purge clock for supporter (no premium data held)', async () => {
    await seedSubscription({ tier: 'supporter' })
    await seedPaidHistory()
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent('customer.subscription.deleted', deletedObject()),
    )
    expect(res.status).toBe(200)
    const billingRows = await testDb.select().from(userBilling)
    expect(billingRows).toHaveLength(0)
  })

  it('restores the seat for a never-paid founder claim', async () => {
    await seedSubscription({ tier: 'founder', status: 'incomplete' })
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.deleted',
        deletedObject({
          metadata: { userId: 'user_wh_1', founderSeatNumber: '51' },
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(await readSeatsRemaining()).toBe(51)
    const events = await listEvents('user_wh_1')
    expect(events.map((event) => event.type)).toEqual([
      'cancel_completed',
      'founder_seat_restored',
    ])
    // Never-paid deletion also skips the purge clock.
    const billingRows = await testDb.select().from(userBilling)
    expect(billingRows).toHaveLength(0)
  })

  it('does NOT restore the seat for a paid-then-cancelled founder', async () => {
    await seedSubscription({ tier: 'founder' })
    await seedPaidHistory()
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent(
        'customer.subscription.deleted',
        deletedObject({
          metadata: { userId: 'user_wh_1', founderSeatNumber: '51' },
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(await readSeatsRemaining()).toBe(50)
    const events = await listEvents('user_wh_1')
    expect(events.some((event) => event.type === 'founder_seat_restored')).toBe(
      false,
    )
  })
})

describe('payment_intent.payment_failed', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('writes a payment_failed analytics event with the decline category', async () => {
    await seedSubscription()
    const app = buildWebhookApp(createFakeWebhookStripe())

    const res = await postSignedEvent(
      app,
      makeEvent('payment_intent.payment_failed', {
        id: 'pi_wh_1',
        customer: 'cus_wh_1',
        last_payment_error: {
          type: 'card_error',
          code: 'card_declined',
          decline_code: 'insufficient_funds',
        },
      }),
    )
    expect(res.status).toBe(200)

    const events = await listEvents('user_wh_1')
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('payment_failed')
    expect(events[0]?.metadata).toMatchObject({
      paymentIntentId: 'pi_wh_1',
      declineCategory: 'insufficient_funds',
      declineCode: 'insufficient_funds',
    })
    // No state change — analytics only.
    expect((await readSubscription('user_wh_1'))?.status).toBe('active')
  })

  it('skips (200) an unmatchable customer', async () => {
    const app = buildWebhookApp(createFakeWebhookStripe())
    const res = await postSignedEvent(
      app,
      makeEvent('payment_intent.payment_failed', {
        id: 'pi_wh_2',
        customer: 'cus_unknown',
        last_payment_error: { type: 'card_error', code: 'expired_card' },
      }),
    )
    expect(res.status).toBe(200)
    const rows = await testDb.select().from(subscriptionEvents)
    expect(rows).toHaveLength(0)
  })
})
