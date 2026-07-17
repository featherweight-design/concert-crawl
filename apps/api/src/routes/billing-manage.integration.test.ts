// Integration tests for POST /v1/billing/checkout-abandon and
// POST /v1/billing/portal-session (eng infra spec Part 2 §1.4, §3.2).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { asc, eq, sql } from 'drizzle-orm'
import {
  founderWindow,
  subscriptions,
  subscriptionEvents,
} from '@concert-crawl/db'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createBillingManageRouter } from './billing-manage.js'
import { testDb } from '../test/helpers/db.js'
import {
  createFakeWebhookStripe,
  makeSubscriptionObject,
  type FakeWebhookStripe,
} from '../test/helpers/stripe-webhooks.js'

function setAuth(userId = 'user_manage_test'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function buildApp(fake: FakeWebhookStripe): Hono {
  const app = new Hono()
  app.route(
    '/v1/billing',
    createBillingManageRouter(() => fake.client),
  )
  return app
}

function postJson(app: Hono, path: string, body?: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE subscriptions, subscription_events, processed_stripe_events`,
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

describe('POST /v1/billing/checkout-abandon', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
    await setFounderWindow(50)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = buildApp(createFakeWebhookStripe())
    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_x',
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 for a missing/invalid body', async () => {
    setAuth()
    const app = buildApp(createFakeWebhookStripe())
    expect((await postJson(app, '/v1/billing/checkout-abandon')).status).toBe(
      400,
    )
    expect(
      (await postJson(app, '/v1/billing/checkout-abandon', {})).status,
    ).toBe(400)
  })

  it('returns 404 when the subscription does not exist at Stripe', async () => {
    setAuth()
    const app = buildApp(createFakeWebhookStripe())
    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_missing',
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 (not 403) when the subscription belongs to someone else', async () => {
    setAuth('user_intruder')
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ status: 'incomplete' }),
    )
    const app = buildApp(fake)

    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(res.status).toBe(404)
    expect(fake.cancelledSubscriptionIds).toHaveLength(0)
  })

  it('is a 200 no-op when the subscription is no longer incomplete', async () => {
    setAuth('user_wh_1')
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ status: 'active' }),
    )
    const app = buildApp(fake)

    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(res.status).toBe(200)
    const body: { success: boolean; data: { cancelled: boolean } } =
      await res.json()
    expect(body.data.cancelled).toBe(false)
    expect(fake.cancelledSubscriptionIds).toHaveLength(0)
  })

  it('cancels an incomplete subscription and restores the founder seat once', async () => {
    setAuth('user_wh_1')
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({
        status: 'incomplete',
        metadata: { userId: 'user_wh_1', founderSeatNumber: '51' },
      }),
    )
    const app = buildApp(fake)

    const first = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(first.status).toBe(200)
    const firstBody: { data: { cancelled: boolean } } = await first.json()
    expect(firstBody.data.cancelled).toBe(true)
    expect(fake.cancelledSubscriptionIds).toEqual(['sub_wh_1'])
    expect(await readSeatsRemaining()).toBe(51)

    // Repeat call: the fake now reports 'canceled', so the route no-ops and
    // the seat is not restored a second time.
    const second = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(second.status).toBe(200)
    const secondBody: { data: { cancelled: boolean } } = await second.json()
    expect(secondBody.data.cancelled).toBe(false)
    expect(await readSeatsRemaining()).toBe(51)

    const restores = await testDb
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.type, 'founder_seat_restored'))
      .orderBy(asc(subscriptionEvents.createdAt))
    expect(restores).toHaveLength(1)
    expect(restores[0]?.metadata).toMatchObject({
      subscriptionId: 'sub_wh_1',
      seatNumber: 51,
      reason: 'checkout_abandoned',
    })
  })

  it('re-attempts the seat restore on retry after a partial failure (canceled + never paid)', async () => {
    // Simulates: a prior abandon call cancelled at Stripe but crashed before
    // restoring the seat. The retry sees status 'canceled' and must still
    // restore the never-paid founder claim.
    setAuth('user_wh_1')
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({
        status: 'canceled',
        metadata: { userId: 'user_wh_1', founderSeatNumber: '51' },
      }),
    )
    const app = buildApp(fake)

    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(res.status).toBe(200)
    const body: { data: { cancelled: boolean } } = await res.json()
    expect(body.data.cancelled).toBe(false)
    // No second cancel call — Stripe already has it canceled.
    expect(fake.cancelledSubscriptionIds).toHaveLength(0)
    expect(await readSeatsRemaining()).toBe(51)

    const restores = await testDb
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.type, 'founder_seat_restored'))
    expect(restores).toHaveLength(1)
    expect(restores[0]?.metadata).toMatchObject({
      subscriptionId: 'sub_wh_1',
      seatNumber: 51,
      reason: 'checkout_abandoned',
    })
  })

  it('does NOT restore the seat for a paid-then-cancelled founder subscription', async () => {
    setAuth('user_wh_1')
    // A subscription_created event means payment landed at least once —
    // the founder seat stays consumed even after cancellation.
    await testDb.insert(subscriptionEvents).values({
      userId: 'user_wh_1',
      type: 'subscription_created',
      metadata: { subscriptionId: 'sub_wh_1' },
    })
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({
        status: 'canceled',
        metadata: { userId: 'user_wh_1', founderSeatNumber: '51' },
      }),
    )
    const app = buildApp(fake)

    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(res.status).toBe(200)
    const body: { data: { cancelled: boolean } } = await res.json()
    expect(body.data.cancelled).toBe(false)
    expect(await readSeatsRemaining()).toBe(50)

    const restores = await testDb
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.type, 'founder_seat_restored'))
    expect(restores).toHaveLength(0)
  })

  it('cancels a non-founder incomplete subscription without touching seats', async () => {
    setAuth('user_wh_1')
    const fake = createFakeWebhookStripe()
    fake.subscriptionsById.set(
      'sub_wh_1',
      makeSubscriptionObject({ status: 'incomplete' }),
    )
    const app = buildApp(fake)

    const res = await postJson(app, '/v1/billing/checkout-abandon', {
      subscriptionId: 'sub_wh_1',
    })
    expect(res.status).toBe(200)
    expect(fake.cancelledSubscriptionIds).toEqual(['sub_wh_1'])
    expect(await readSeatsRemaining()).toBe(50)
  })
})

describe('POST /v1/billing/portal-session', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const app = buildApp(createFakeWebhookStripe())
    const res = await postJson(app, '/v1/billing/portal-session')
    expect(res.status).toBe(401)
  })

  it('returns 404 no_customer when the user has no billing profile', async () => {
    setAuth('user_no_profile')
    const app = buildApp(createFakeWebhookStripe())
    const res = await postJson(app, '/v1/billing/portal-session')
    expect(res.status).toBe(404)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('no_customer')
  })

  it('creates a portal session for the stored Stripe customer', async () => {
    setAuth('user_portal')
    await testDb.insert(subscriptions).values({
      userId: 'user_portal',
      stripeCustomerId: 'cus_portal_1',
      stripeSubscriptionId: 'sub_portal_1',
      tier: 'premium',
      status: 'active',
      currentPeriodEnd: new Date('2099-01-01T00:00:00Z'),
    })
    const fake = createFakeWebhookStripe()
    const app = buildApp(fake)

    const res = await postJson(app, '/v1/billing/portal-session')
    expect(res.status).toBe(200)
    const body: { success: boolean; data: { url: string } } = await res.json()
    expect(body.data.url).toBe('https://billing.stripe.com/p/session/test_123')

    expect(fake.portalSessionsCreated).toHaveLength(1)
    expect(fake.portalSessionsCreated[0]?.customer).toBe('cus_portal_1')
    expect(fake.portalSessionsCreated[0]?.return_url).toMatch(
      /\/me\?section=plan$/,
    )
  })
})
