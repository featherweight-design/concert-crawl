import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { asc, eq, sql } from 'drizzle-orm'
import {
  founderWindow,
  giftedComps,
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
  // Header override lets concurrent requests act as distinct users (the
  // module-level authState is shared across in-flight requests).
  getAuth: (ctx: { req: { header: (name: string) => string | undefined } }) => {
    const headerUser = ctx.req.header('x-test-user')
    if (headerUser) {
      return {
        userId: headerUser,
        sessionClaims: { metadata: { role: 'user' } },
      }
    }
    return authState.current
  },
}))

import { createBillingRouter } from './billing.js'
import type {
  BillingStripeClient,
  StripeSubscriptionCreateParams,
} from '../lib/stripe.js'
import { testDb } from '../test/helpers/db.js'

function setAuth(userId = 'user_billing_test'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

interface FakeStripeOptions {
  failSubscriptionCreate?: boolean
  emptyPriceList?: boolean
  duplicatePriceList?: boolean
  missingClientSecret?: boolean
}

interface FakeStripe {
  client: BillingStripeClient
  customersCreated: { metadata: { userId: string } }[]
  subscriptionsCreated: StripeSubscriptionCreateParams[]
}

function createFakeStripe(options: FakeStripeOptions = {}): FakeStripe {
  const customersCreated: { metadata: { userId: string } }[] = []
  const subscriptionsCreated: StripeSubscriptionCreateParams[] = []

  const client: BillingStripeClient = {
    customers: {
      create: async (params) => {
        customersCreated.push(params)
        return { id: `cus_fake_${customersCreated.length}` }
      },
    },
    prices: {
      list: async (params) => {
        if (options.emptyPriceList) return { data: [] }
        if (options.duplicatePriceList) {
          return {
            data: [
              { id: `price_fake_${params.lookup_keys[0]}_a` },
              { id: `price_fake_${params.lookup_keys[0]}_b` },
            ],
          }
        }
        return { data: [{ id: `price_fake_${params.lookup_keys[0]}` }] }
      },
    },
    subscriptions: {
      create: async (params) => {
        if (options.failSubscriptionCreate) {
          throw new Error('fake stripe: subscription create failed')
        }
        subscriptionsCreated.push(params)
        const seq = subscriptionsCreated.length
        if (options.missingClientSecret) {
          return { id: `sub_fake_${seq}`, latest_invoice: 'in_unexpanded' }
        }
        return {
          id: `sub_fake_${seq}`,
          latest_invoice: {
            confirmation_secret: { client_secret: `pi_secret_${seq}` },
          },
        }
      },
    },
  }

  return { client, customersCreated, subscriptionsCreated }
}

function buildApp(stripe: BillingStripeClient): Hono {
  const app = new Hono()
  app.route(
    '/v1/billing',
    createBillingRouter(() => stripe),
  )
  return app
}

function postCheckout(
  app: Hono,
  body: unknown,
  asUser?: string,
): Promise<Response> {
  return app.request('/v1/billing/checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(asUser ? { 'x-test-user': asUser } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function clearCommerceTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE subscriptions, subscription_events, gifted_comps`,
  )
}

const FOUNDER_WINDOW_DEFAULTS = {
  opensAt: null as Date | null,
  seatsTotal: 100,
  seatsRemaining: 100,
  seatsRemainingTest: 100,
  windowDays: 30,
}

async function setFounderWindow(
  overrides: Partial<typeof FOUNDER_WINDOW_DEFAULTS> = {},
): Promise<void> {
  const values = { ...FOUNDER_WINDOW_DEFAULTS, ...overrides }
  await testDb
    .insert(founderWindow)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: founderWindow.id, set: values })
}

async function readFounderWindow(): Promise<typeof founderWindow.$inferSelect> {
  const [row] = await testDb
    .select()
    .from(founderWindow)
    .where(eq(founderWindow.id, 1))
    .limit(1)
  if (!row) throw new Error('founder_window singleton row missing')
  return row
}

async function seedSubscription(
  userId: string,
  overrides: Partial<typeof subscriptions.$inferInsert> = {},
): Promise<void> {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: 'cus_existing',
    stripeSubscriptionId: `sub_existing_${userId}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date('2099-01-01T00:00:00Z'),
    ...overrides,
  })
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

interface ErrorBody {
  success: boolean
  code?: string
  error: string
}

interface SuccessBody {
  success: boolean
  data: {
    clientSecret: string
    subscriptionId: string
    founderSeatNumber: number | null
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

describe('POST /v1/billing/checkout-session', () => {
  beforeEach(async () => {
    clearAuth()
    await clearCommerceTables()
    await setFounderWindow()
  })

  it('returns 401 when unauthenticated', async () => {
    const app = buildApp(createFakeStripe().client)
    const res = await postCheckout(app, { tier: 'supporter' })
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid tier', async () => {
    setAuth()
    const app = buildApp(createFakeStripe().client)
    const res = await postCheckout(app, { tier: 'platinum' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for a missing/unparseable body', async () => {
    setAuth()
    const app = buildApp(createFakeStripe().client)
    const res = await app.request('/v1/billing/checkout-session', {
      method: 'POST',
    })
    expect(res.status).toBe(400)
  })

  it.each(['active', 'trialing', 'past_due'] as const)(
    'returns 409 subscription_exists when the user has a %s subscription',
    async (status) => {
      const userId = `user_sub_${status}`
      setAuth(userId)
      await seedSubscription(userId, { status })
      const app = buildApp(createFakeStripe().client)

      const res = await postCheckout(app, { tier: 'supporter' })
      expect(res.status).toBe(409)
      const body: ErrorBody = await res.json()
      expect(body.code).toBe('subscription_exists')
    },
  )

  it('returns 409 gifted_user when the user has an active lifetime gift', async () => {
    setAuth('user_gifted')
    await testDb.insert(giftedComps).values({
      userId: 'user_gifted',
      grantedBy: 'backfill',
      expiresAt: null,
    })
    const app = buildApp(createFakeStripe().client)

    const res = await postCheckout(app, { tier: 'premium' })
    expect(res.status).toBe(409)
    const body: ErrorBody = await res.json()
    expect(body.code).toBe('gifted_user')
  })

  it('allows checkout when the gift is revoked or expired', async () => {
    setAuth('user_gift_stale')
    await testDb.insert(giftedComps).values({
      userId: 'user_gift_stale',
      grantedBy: 'backfill',
      expiresAt: new Date(Date.now() - DAY_MS),
    })
    const app = buildApp(createFakeStripe().client)

    const res = await postCheckout(app, { tier: 'supporter' })
    expect(res.status).toBe(200)
  })

  it('returns 403 founder_window_not_open for founder pre-launch (opensAt NULL)', async () => {
    setAuth('user_founder_prelaunch')
    await setFounderWindow({ opensAt: null })
    const fake = createFakeStripe()
    const app = buildApp(fake.client)

    const res = await postCheckout(app, { tier: 'founder' })
    expect(res.status).toBe(403)
    const body: ErrorBody = await res.json()
    expect(body.code).toBe('founder_window_not_open')
    // Gate rejected before any Stripe call.
    expect(fake.customersCreated).toHaveLength(0)
    expect(fake.subscriptionsCreated).toHaveLength(0)
  })

  it('returns 410 founder_window_closed after the window has closed', async () => {
    setAuth('user_founder_late')
    // windowDays = 30, opened 40 days ago → closesAt 10 days ago.
    await setFounderWindow({ opensAt: new Date(Date.now() - 40 * DAY_MS) })
    const app = buildApp(createFakeStripe().client)

    const res = await postCheckout(app, { tier: 'founder' })
    expect(res.status).toBe(410)
    const body: ErrorBody = await res.json()
    expect(body.code).toBe('founder_window_closed')
  })

  it('returns 410 founder_seats_exhausted when no seats remain', async () => {
    setAuth('user_founder_zero')
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsRemaining: 0,
    })
    const app = buildApp(createFakeStripe().client)

    const res = await postCheckout(app, { tier: 'founder' })
    expect(res.status).toBe(410)
    const body: ErrorBody = await res.json()
    expect(body.code).toBe('founder_seats_exhausted')
  })

  it('creates a checkout for supporter and writes checkout_started', async () => {
    setAuth('user_supporter_ok')
    const fake = createFakeStripe()
    const app = buildApp(fake.client)

    const res = await postCheckout(app, { tier: 'supporter' })
    expect(res.status).toBe(200)
    const body: SuccessBody = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.clientSecret).toBe('pi_secret_1')
    expect(body.data.subscriptionId).toBe('sub_fake_1')
    expect(body.data.founderSeatNumber).toBeNull()

    // Stripe customer created with the Clerk userId in metadata.
    expect(fake.customersCreated).toHaveLength(1)
    expect(fake.customersCreated[0]?.metadata.userId).toBe('user_supporter_ok')

    // Subscription created with the spec'd parameters.
    const subParams = fake.subscriptionsCreated[0]
    expect(subParams?.customer).toBe('cus_fake_1')
    expect(subParams?.items[0]?.price).toBe('price_fake_supporter_monthly')
    expect(subParams?.payment_behavior).toBe('default_incomplete')
    expect(subParams?.payment_settings.save_default_payment_method).toBe(
      'on_subscription',
    )
    expect(subParams?.expand).toContain('latest_invoice.confirmation_secret')
    expect(subParams?.metadata['userId']).toBe('user_supporter_ok')
    expect(subParams?.metadata['founderSeatNumber']).toBeUndefined()

    // checkout_started audit event with { tier, subscriptionId }.
    const events = await listEvents('user_supporter_ok')
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('checkout_started')
    expect(events[0]?.metadata).toEqual({
      tier: 'supporter',
      subscriptionId: 'sub_fake_1',
    })

    // No subscriptions DB row — webhooks (PR 2.3) drive DB state.
    const rows = await testDb
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, 'user_supporter_ok'))
    expect(rows).toHaveLength(0)
  })

  it('reuses the stripeCustomerId from a prior (cancelled) subscription row', async () => {
    setAuth('user_returning')
    await seedSubscription('user_returning', {
      status: 'cancelled',
      stripeCustomerId: 'cus_prior',
    })
    const fake = createFakeStripe()
    const app = buildApp(fake.client)

    const res = await postCheckout(app, { tier: 'premium' })
    expect(res.status).toBe(200)
    expect(fake.customersCreated).toHaveLength(0)
    expect(fake.subscriptionsCreated[0]?.customer).toBe('cus_prior')
  })

  it('returns 500 when no active price matches the lookup key', async () => {
    setAuth('user_no_price')
    const app = buildApp(createFakeStripe({ emptyPriceList: true }).client)

    const res = await postCheckout(app, { tier: 'supporter' })
    expect(res.status).toBe(500)
  })

  it('returns 500 when multiple active prices share the lookup key (no charge)', async () => {
    setAuth('user_dup_price')
    const fake = createFakeStripe({ duplicatePriceList: true })
    const app = buildApp(fake.client)

    const res = await postCheckout(app, { tier: 'supporter' })
    expect(res.status).toBe(500)
    expect(fake.subscriptionsCreated).toHaveLength(0)
  })

  it('returns 409 founder_claim_pending on a repeat checkout while a claim is held', async () => {
    setAuth('user_founder_repeat')
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsTotal: 100,
      seatsRemaining: 100,
    })
    const app = buildApp(createFakeStripe().client)

    const first = await postCheckout(app, { tier: 'founder' })
    expect(first.status).toBe(200)

    const second = await postCheckout(app, { tier: 'founder' })
    expect(second.status).toBe(409)
    const body: ErrorBody = await second.json()
    expect(body.code).toBe('founder_claim_pending')

    // Exactly one seat held — the repeat call never reached the decrement.
    const windowRow = await readFounderWindow()
    expect(windowRow.seatsRemaining).toBe(99)
  })

  it('allows a fresh founder checkout after the held seat was restored', async () => {
    setAuth('user_founder_after_restore')
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsTotal: 100,
      seatsRemaining: 100,
    })
    // First attempt fails at Stripe → seat restored; retry must not 409.
    const failApp = buildApp(
      createFakeStripe({ failSubscriptionCreate: true }).client,
    )
    expect((await postCheckout(failApp, { tier: 'founder' })).status).toBe(500)

    const okApp = buildApp(createFakeStripe().client)
    const retry = await postCheckout(okApp, { tier: 'founder' })
    expect(retry.status).toBe(200)
  })

  it('does NOT restore the seat when failure happens after subscription creation', async () => {
    setAuth('user_founder_post_create')
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsTotal: 100,
      seatsRemaining: 10,
    })
    const fake = createFakeStripe({ missingClientSecret: true })
    const app = buildApp(fake.client)

    const res = await postCheckout(app, { tier: 'founder' })
    expect(res.status).toBe(500)
    expect(fake.subscriptionsCreated).toHaveLength(1)

    // The incomplete subscription holds the seat — restoring here would
    // oversell (§3.2 restoration paths reconcile it instead).
    const windowRow = await readFounderWindow()
    expect(windowRow.seatsRemaining).toBe(9)
    const events = await listEvents('user_founder_post_create')
    expect(events.map((event) => event.type)).toEqual(['founder_claimed'])
  })

  it('claims a founder seat atomically and stamps the seat number', async () => {
    setAuth('user_founder_ok')
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsTotal: 100,
      seatsRemaining: 100,
    })
    const fake = createFakeStripe()
    const app = buildApp(fake.client)

    const res = await postCheckout(app, { tier: 'founder' })
    expect(res.status).toBe(200)
    const body: SuccessBody = await res.json()
    expect(body.data.founderSeatNumber).toBe(1)

    const windowRow = await readFounderWindow()
    expect(windowRow.seatsRemaining).toBe(99)

    // Seat number = seatsTotal − seatsRemaining = 100 − 99 = 1.
    expect(fake.subscriptionsCreated[0]?.metadata['founderSeatNumber']).toBe(
      '1',
    )

    const events = await listEvents('user_founder_ok')
    expect(events.map((event) => event.type)).toEqual([
      'founder_claimed',
      'checkout_started',
    ])
    expect(events[0]?.metadata).toEqual({ seatNumber: 1 })
    expect(events[1]?.metadata).toEqual({
      tier: 'founder',
      subscriptionId: 'sub_fake_1',
    })
  })

  it('restores the founder seat when Stripe subscription creation fails', async () => {
    setAuth('user_founder_fail')
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsTotal: 100,
      seatsRemaining: 5,
    })
    const app = buildApp(
      createFakeStripe({ failSubscriptionCreate: true }).client,
    )

    const res = await postCheckout(app, { tier: 'founder' })
    expect(res.status).toBe(500)

    const windowRow = await readFounderWindow()
    expect(windowRow.seatsRemaining).toBe(5)

    const events = await listEvents('user_founder_fail')
    expect(events.map((event) => event.type)).toEqual([
      'founder_claimed',
      'founder_seat_restored',
    ])
  })

  it('does not double-restore past seatsTotal on non-founder Stripe failure', async () => {
    setAuth('user_supporter_fail')
    const app = buildApp(
      createFakeStripe({ failSubscriptionCreate: true }).client,
    )

    const res = await postCheckout(app, { tier: 'supporter' })
    expect(res.status).toBe(500)

    // No claim happened, so no restore event and seats untouched.
    const windowRow = await readFounderWindow()
    expect(windowRow.seatsRemaining).toBe(100)
    const events = await listEvents('user_supporter_fail')
    expect(events).toHaveLength(0)
  })

  it('grants exactly N seats under concurrent claim pressure (atomic race)', async () => {
    // Distinct users per request — the per-user pending-claim 409 guard is
    // covered separately; this test isolates the atomic decrement.
    await setFounderWindow({
      opensAt: new Date(Date.now() - DAY_MS),
      seatsTotal: 100,
      seatsRemaining: 3,
    })
    const fake = createFakeStripe()
    const app = buildApp(fake.client)

    const raceUsers = Array.from(
      { length: 10 },
      (_unused, idx) => `user_founder_race_${idx}`,
    )
    const responses = await Promise.all(
      raceUsers.map((raceUser) =>
        postCheckout(app, { tier: 'founder' }, raceUser),
      ),
    )

    const successes = responses.filter((res) => res.status === 200)
    const exhausted = responses.filter((res) => res.status === 410)
    expect(successes).toHaveLength(3)
    expect(exhausted).toHaveLength(7)
    for (const res of exhausted) {
      const body: ErrorBody = await res.json()
      expect(body.code).toBe('founder_seats_exhausted')
    }

    const windowRow = await readFounderWindow()
    expect(windowRow.seatsRemaining).toBe(0)

    const allEvents = (
      await Promise.all(raceUsers.map((raceUser) => listEvents(raceUser)))
    ).flat()
    const claimed = allEvents.filter(
      (event) => event.type === 'founder_claimed',
    )
    expect(claimed).toHaveLength(3)
    const seatNumbers = claimed
      .map((event) =>
        typeof event.metadata === 'object' &&
        event.metadata !== null &&
        'seatNumber' in event.metadata
          ? event.metadata.seatNumber
          : null,
      )
      .sort((left, right) => Number(left) - Number(right))
    expect(seatNumbers).toEqual([98, 99, 100])
  })
})
