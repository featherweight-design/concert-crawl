// Integration tests for POST /v1/billing/cancel, POST /v1/billing/resubscribe,
// POST /v1/billing/change-tier and GET /v1/billing/proration-preview
// (eng infra spec Part 2 §1.4; execution plan PR 4.5).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { subscriptions, subscriptionEvents } from '@concert-crawl/db'

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

import { createBillingLifecycleRouter } from './billing-lifecycle.js'
import { testDb } from '../test/helpers/db.js'
import {
  createFakeWebhookStripe,
  makeSubscriptionObject,
  makePreviewInvoiceObject,
  type FakeWebhookStripe,
} from '../test/helpers/stripe-webhooks.js'

const USER_ID = 'user_lifecycle_test'

function setAuth(userId = USER_ID): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function buildApp(fake: FakeWebhookStripe): Hono {
  const app = new Hono()
  app.route(
    '/v1/billing',
    createBillingLifecycleRouter(() => fake.client),
  )
  return app
}

function post(app: Hono, path: string, body?: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

async function clearTables(): Promise<void> {
  await testDb.execute(sql`TRUNCATE subscriptions, subscription_events`)
}

interface SeedOverrides {
  tier?: 'free' | 'premium' | 'supporter' | 'founder'
  status?:
    | 'active'
    | 'cancelled'
    | 'past_due'
    | 'trialing'
    | 'incomplete'
    | 'incomplete_expired'
  cancelAtPeriodEnd?: boolean
}

const PERIOD_END = new Date('2099-01-01T00:00:00Z')

async function seedSubscription(overrides: SeedOverrides = {}): Promise<void> {
  await testDb.insert(subscriptions).values({
    userId: USER_ID,
    stripeCustomerId: 'cus_lc_1',
    stripeSubscriptionId: 'sub_lc_1',
    tier: overrides.tier ?? 'premium',
    status: overrides.status ?? 'active',
    cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
    stripePriceId: 'price_premium',
    currentPeriodEnd: PERIOD_END,
  })
}

/** A fake whose retrieve/update know the seeded subscription. */
function makeLifecycleFake(
  subscriptionOverrides: Record<string, unknown> = {},
): FakeWebhookStripe {
  const fake = createFakeWebhookStripe()
  fake.subscriptionsById.set(
    'sub_lc_1',
    makeSubscriptionObject({
      id: 'sub_lc_1',
      customer: 'cus_lc_1',
      metadata: { userId: USER_ID },
      items: {
        data: [
          {
            id: 'si_lc_1',
            price: { id: 'price_premium', lookup_key: 'premium_monthly' },
          },
        ],
      },
      ...subscriptionOverrides,
    }),
  )
  fake.pricesByLookupKey.set('supporter_monthly', [{ id: 'price_supporter' }])
  fake.pricesByLookupKey.set('premium_monthly', [{ id: 'price_premium' }])
  return fake
}

async function readEvents(type: string) {
  return testDb
    .select()
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.userId, USER_ID))
    .then((rows) => rows.filter((row) => row.type === type))
}

async function readMirrorRow() {
  const [row] = await testDb
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, USER_ID))
    .limit(1)
  if (!row) throw new Error('mirror row missing')
  return row
}

beforeEach(async () => {
  authState.current = null
  await clearTables()
})

describe('POST /v1/billing/cancel', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await post(buildApp(makeLifecycleFake()), '/v1/billing/cancel')
    expect(res.status).toBe(401)
  })

  it('returns 404 no_live_subscription when the user has no subscription', async () => {
    setAuth()
    const res = await post(buildApp(makeLifecycleFake()), '/v1/billing/cancel')
    expect(res.status).toBe(404)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('no_live_subscription')
  })

  it('returns 404 no_live_subscription when the subscription is not live', async () => {
    setAuth()
    await seedSubscription({ status: 'cancelled' })
    const res = await post(buildApp(makeLifecycleFake()), '/v1/billing/cancel')
    expect(res.status).toBe(404)
  })

  it('returns 409 cancel_already_scheduled when cancel is already pending', async () => {
    setAuth()
    await seedSubscription({ cancelAtPeriodEnd: true })
    const fake = makeLifecycleFake()
    const res = await post(buildApp(fake), '/v1/billing/cancel')
    expect(res.status).toBe(409)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('cancel_already_scheduled')
    expect(fake.subscriptionUpdateCalls).toHaveLength(0)
  })

  it('schedules the cancel at Stripe, mirrors the DB and writes cancel_scheduled', async () => {
    setAuth()
    await seedSubscription()
    const fake = makeLifecycleFake()

    const res = await post(buildApp(fake), '/v1/billing/cancel')
    expect(res.status).toBe(200)
    const body: {
      success: boolean
      data: { cancelAtPeriodEnd: boolean; currentPeriodEnd: string }
    } = await res.json()
    expect(body.data.cancelAtPeriodEnd).toBe(true)
    expect(body.data.currentPeriodEnd).toBe(PERIOD_END.toISOString())

    expect(fake.subscriptionUpdateCalls).toEqual([
      { subscriptionId: 'sub_lc_1', params: { cancel_at_period_end: true } },
    ])
    expect((await readMirrorRow()).cancelAtPeriodEnd).toBe(true)

    const events = await readEvents('cancel_scheduled')
    expect(events).toHaveLength(1)
    expect(events[0]?.metadata).toMatchObject({
      subscriptionId: 'sub_lc_1',
      source: 'in_app',
    })
  })
})

describe('POST /v1/billing/resubscribe', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await post(
      buildApp(makeLifecycleFake()),
      '/v1/billing/resubscribe',
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 no_live_subscription without a live subscription', async () => {
    setAuth()
    const res = await post(
      buildApp(makeLifecycleFake()),
      '/v1/billing/resubscribe',
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 not_in_cancel_grace when no cancel is scheduled', async () => {
    setAuth()
    await seedSubscription({ cancelAtPeriodEnd: false })
    const fake = makeLifecycleFake()
    const res = await post(buildApp(fake), '/v1/billing/resubscribe')
    expect(res.status).toBe(409)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('not_in_cancel_grace')
    expect(fake.subscriptionUpdateCalls).toHaveLength(0)
  })

  it('flips cancel_at_period_end off, mirrors the DB and writes resubscribed', async () => {
    setAuth()
    await seedSubscription({ cancelAtPeriodEnd: true })
    const fake = makeLifecycleFake({ cancel_at_period_end: true })

    const res = await post(buildApp(fake), '/v1/billing/resubscribe')
    expect(res.status).toBe(200)
    const body: { data: { cancelAtPeriodEnd: boolean } } = await res.json()
    expect(body.data.cancelAtPeriodEnd).toBe(false)

    expect(fake.subscriptionUpdateCalls).toEqual([
      { subscriptionId: 'sub_lc_1', params: { cancel_at_period_end: false } },
    ])
    expect((await readMirrorRow()).cancelAtPeriodEnd).toBe(false)

    const events = await readEvents('resubscribed')
    expect(events).toHaveLength(1)
    expect(events[0]?.metadata).toMatchObject({ subscriptionId: 'sub_lc_1' })
  })
})

describe('POST /v1/billing/change-tier', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await post(
      buildApp(makeLifecycleFake()),
      '/v1/billing/change-tier',
      { tier: 'supporter' },
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for a missing/invalid body', async () => {
    setAuth()
    await seedSubscription()
    const app = buildApp(makeLifecycleFake())
    expect((await post(app, '/v1/billing/change-tier')).status).toBe(400)
    expect(
      (await post(app, '/v1/billing/change-tier', { tier: 'platinum' })).status,
    ).toBe(400)
  })

  it('returns 404 no_live_subscription without a live subscription', async () => {
    setAuth()
    const res = await post(
      buildApp(makeLifecycleFake()),
      '/v1/billing/change-tier',
      { tier: 'supporter' },
    )
    expect(res.status).toBe(404)
  })

  it('returns 409 founder_not_switchable for a founder target', async () => {
    setAuth()
    await seedSubscription()
    const fake = makeLifecycleFake()
    const res = await post(buildApp(fake), '/v1/billing/change-tier', {
      tier: 'founder',
    })
    expect(res.status).toBe(409)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('founder_not_switchable')
    expect(fake.subscriptionUpdateCalls).toHaveLength(0)
  })

  it('downgrades founder → supporter with create_prorations (#780 decision 6)', async () => {
    setAuth()
    await seedSubscription({ tier: 'founder' })
    const fake = makeLifecycleFake()
    fake.previewInvoice.current = makePreviewInvoiceObject({
      amount_due: 0,
      lines: { data: [{ amount: -110 }, { amount: 200 }] },
    })

    const res = await post(buildApp(fake), '/v1/billing/change-tier', {
      tier: 'supporter',
    })
    expect(res.status).toBe(200)
    const body: {
      data: { direction: string; creditCents: number }
    } = await res.json()
    expect(body.data.direction).toBe('downgrade')
    expect(body.data.creditCents).toBe(110)

    expect(fake.subscriptionUpdateCalls).toEqual([
      {
        subscriptionId: 'sub_lc_1',
        params: {
          items: [{ id: 'si_lc_1', price: 'price_supporter' }],
          proration_behavior: 'create_prorations',
        },
      },
    ])

    const mirrorRow = await readMirrorRow()
    expect(mirrorRow.tier).toBe('supporter')

    const events = await readEvents('downgraded')
    expect(events).toHaveLength(1)
    expect(events[0]?.metadata).toMatchObject({
      fromTier: 'founder',
      toTier: 'supporter',
      prorationBehavior: 'create_prorations',
    })
  })

  it('returns 409 tier_unchanged for a same-tier no-op', async () => {
    setAuth()
    await seedSubscription({ tier: 'premium' })
    const fake = makeLifecycleFake()
    const res = await post(buildApp(fake), '/v1/billing/change-tier', {
      tier: 'premium',
    })
    expect(res.status).toBe(409)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('tier_unchanged')
    expect(fake.subscriptionUpdateCalls).toHaveLength(0)
  })

  it('upgrades supporter → premium with always_invoice and writes upgraded', async () => {
    setAuth()
    await seedSubscription({ tier: 'supporter' })
    const fake = makeLifecycleFake({
      items: {
        data: [
          {
            id: 'si_lc_1',
            price: { id: 'price_supporter', lookup_key: 'supporter_monthly' },
          },
        ],
      },
    })
    fake.previewInvoice.current = makePreviewInvoiceObject({
      amount_due: 210,
      lines: { data: [{ amount: -140 }, { amount: 350 }] },
    })

    const res = await post(buildApp(fake), '/v1/billing/change-tier', {
      tier: 'premium',
    })
    expect(res.status).toBe(200)
    const body: {
      data: {
        tier: string
        direction: string
        amountDueCents: number
        creditCents: number
        currency: string
      }
    } = await res.json()
    expect(body.data).toEqual({
      tier: 'premium',
      direction: 'upgrade',
      amountDueCents: 210,
      creditCents: 140,
      currency: 'usd',
    })

    // Upgrade → immediate prorated invoice (Decision 8).
    expect(fake.subscriptionUpdateCalls).toEqual([
      {
        subscriptionId: 'sub_lc_1',
        params: {
          items: [{ id: 'si_lc_1', price: 'price_premium' }],
          proration_behavior: 'always_invoice',
        },
      },
    ])
    expect(fake.invoicePreviewCalls).toHaveLength(1)
    expect(fake.invoicePreviewCalls[0]?.subscription_details).toEqual({
      items: [{ id: 'si_lc_1', price: 'price_premium' }],
      proration_behavior: 'always_invoice',
    })

    const mirrorRow = await readMirrorRow()
    expect(mirrorRow.tier).toBe('premium')
    expect(mirrorRow.stripePriceId).toBe('price_premium')

    const events = await readEvents('upgraded')
    expect(events).toHaveLength(1)
    expect(events[0]?.metadata).toMatchObject({
      subscriptionId: 'sub_lc_1',
      fromTier: 'supporter',
      toTier: 'premium',
      prorationBehavior: 'always_invoice',
      amountDueCents: 210,
      creditCents: 140,
    })
  })

  it('downgrades premium → supporter with create_prorations and writes downgraded', async () => {
    setAuth()
    await seedSubscription({ tier: 'premium' })
    const fake = makeLifecycleFake()
    fake.previewInvoice.current = makePreviewInvoiceObject({
      amount_due: 0,
      lines: { data: [{ amount: -320 }, { amount: 200 }] },
    })

    const res = await post(buildApp(fake), '/v1/billing/change-tier', {
      tier: 'supporter',
    })
    expect(res.status).toBe(200)
    const body: {
      data: { direction: string; amountDueCents: number; creditCents: number }
    } = await res.json()
    expect(body.data.direction).toBe('downgrade')
    expect(body.data.amountDueCents).toBe(0)
    expect(body.data.creditCents).toBe(320)

    // Downgrade → credit to customer balance (Decision 8).
    expect(fake.subscriptionUpdateCalls).toEqual([
      {
        subscriptionId: 'sub_lc_1',
        params: {
          items: [{ id: 'si_lc_1', price: 'price_supporter' }],
          proration_behavior: 'create_prorations',
        },
      },
    ])

    const mirrorRow = await readMirrorRow()
    expect(mirrorRow.tier).toBe('supporter')
    expect(mirrorRow.stripePriceId).toBe('price_supporter')

    const events = await readEvents('downgraded')
    expect(events).toHaveLength(1)
    expect(events[0]?.metadata).toMatchObject({
      fromTier: 'premium',
      toTier: 'supporter',
      prorationBehavior: 'create_prorations',
      creditCents: 320,
    })
  })

  it('returns 500 and mutates nothing when the preview payload is invalid', async () => {
    setAuth()
    await seedSubscription({ tier: 'premium' })
    const fake = makeLifecycleFake()
    fake.previewInvoice.current = { unexpected: 'shape' }

    const res = await post(buildApp(fake), '/v1/billing/change-tier', {
      tier: 'supporter',
    })
    expect(res.status).toBe(500)
    expect(fake.subscriptionUpdateCalls).toHaveLength(0)
    expect((await readMirrorRow()).tier).toBe('premium')
    expect(await readEvents('downgraded')).toHaveLength(0)
  })
})

describe('GET /v1/billing/proration-preview', () => {
  function getPreview(app: Hono, tier?: string): Promise<Response> {
    const query = tier !== undefined ? `?tier=${tier}` : ''
    return app.request(`/v1/billing/proration-preview${query}`)
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await getPreview(buildApp(makeLifecycleFake()), 'supporter')
    expect(res.status).toBe(401)
  })

  it('returns 400 for a missing or invalid tier', async () => {
    setAuth()
    await seedSubscription()
    const app = buildApp(makeLifecycleFake())
    expect((await getPreview(app)).status).toBe(400)
    expect((await getPreview(app, 'platinum')).status).toBe(400)
  })

  it('returns 404 no_live_subscription without a live subscription', async () => {
    setAuth()
    const res = await getPreview(buildApp(makeLifecycleFake()), 'supporter')
    expect(res.status).toBe(404)
  })

  it('returns 409 founder_not_switchable for a founder target', async () => {
    setAuth()
    await seedSubscription()
    const res = await getPreview(buildApp(makeLifecycleFake()), 'founder')
    expect(res.status).toBe(409)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('founder_not_switchable')
  })

  it('returns 409 tier_unchanged for the current tier', async () => {
    setAuth()
    await seedSubscription({ tier: 'premium' })
    const res = await getPreview(buildApp(makeLifecycleFake()), 'premium')
    expect(res.status).toBe(409)
    const body: { code?: string } = await res.json()
    expect(body.code).toBe('tier_unchanged')
  })

  it('previews a downgrade read-only — no update call, no DB writes', async () => {
    setAuth()
    await seedSubscription({ tier: 'premium' })
    const fake = makeLifecycleFake()
    fake.previewInvoice.current = makePreviewInvoiceObject({
      amount_due: 0,
      period_end: 1_780_000_000,
      lines: { data: [{ amount: -320 }, { amount: 200 }] },
    })

    const res = await getPreview(buildApp(fake), 'supporter')
    expect(res.status).toBe(200)
    const body: {
      data: {
        amountDueCents: number
        creditCents: number
        currency: string
        periodEnd: string | null
      }
    } = await res.json()
    expect(body.data).toEqual({
      amountDueCents: 0,
      creditCents: 320,
      currency: 'usd',
      periodEnd: new Date(1_780_000_000 * 1000).toISOString(),
    })

    expect(fake.invoicePreviewCalls).toHaveLength(1)
    expect(
      fake.invoicePreviewCalls[0]?.subscription_details.proration_behavior,
    ).toBe('create_prorations')
    // Read-only: nothing mutated.
    expect(fake.subscriptionUpdateCalls).toHaveLength(0)
    expect((await readMirrorRow()).tier).toBe('premium')
  })

  it('previews an upgrade with always_invoice', async () => {
    setAuth()
    await seedSubscription({ tier: 'supporter' })
    const fake = makeLifecycleFake({
      items: {
        data: [
          {
            id: 'si_lc_1',
            price: { id: 'price_supporter', lookup_key: 'supporter_monthly' },
          },
        ],
      },
    })

    const res = await getPreview(buildApp(fake), 'premium')
    expect(res.status).toBe(200)
    expect(
      fake.invoicePreviewCalls[0]?.subscription_details.proration_behavior,
    ).toBe('always_invoice')
  })
})
