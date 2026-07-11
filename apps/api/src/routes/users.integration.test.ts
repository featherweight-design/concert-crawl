import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState, clerkState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
  clerkState: { role: 'user' as string, plan: undefined as string | undefined },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

// Mock Clerk client — getUser and deleteUser
vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          publicMetadata: { role: clerkState.role, plan: clerkState.plan },
          createdAt: new Date('2026-04-01').getTime(),
        }),
      ),
      deleteUser: vi.fn().mockResolvedValue({}),
    },
  }),
}))

import { sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  founderWindow,
  giftedComps,
  subscriptions,
  userBilling,
} from '@concert-crawl/db'
import { createApp } from '../app.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
} from '../test/helpers/seed.js'
import { testDb } from '../test/helpers/db.js'

const app = createApp()

async function clearBillingTables(): Promise<void> {
  await testDb.execute(sql`TRUNCATE subscriptions, gifted_comps, user_billing`)
}

async function seedSubscription(
  userId: string,
  overrides: Partial<typeof subscriptions.$inferInsert> = {},
): Promise<void> {
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${userId}`,
    stripeSubscriptionId: `sub_${userId}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    ...overrides,
  })
}

const planStateBodySchema = z.object({
  success: z.boolean(),
  data: z.object({
    planState: z.object({
      plan: z.string(),
      onTrial: z.boolean(),
      trialEndsAt: z.string().nullable(),
      status: z.string().nullable(),
      cancelAtPeriodEnd: z.boolean(),
      currentPeriodEnd: z.string().nullable(),
      roleComped: z.boolean(),
    }),
    roleBadge: z.string().nullable(),
    showTrialEndedTakeover: z.boolean(),
    showDayThirteenBanner: z.boolean(),
    showPastDueBanner: z.boolean(),
    founderWindow: z.object({
      state: z.enum(['pre-launch', 'open', 'closed']),
      seatsTotal: z.number(),
      seatsRemaining: z.number().optional(),
      closesAt: z.string().nullable(),
    }),
  }),
})

async function fetchMe(
  query = '',
): Promise<z.infer<typeof planStateBodySchema>> {
  const res = await app.request(`/v1/users/me${query}`, {
    headers: { Authorization: 'Bearer test' },
  })
  expect(res.status).toBe(200)
  return planStateBodySchema.parse(await res.json())
}

// closesAt is a generated column (opensAt + windowDays) — never written.
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

function setAuth(userId = 'user_test123'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

describe('GET /v1/users/me', () => {
  beforeEach(async () => {
    clearAuth()
    clerkState.role = 'user'
    clerkState.plan = undefined
    await clearTables()
    await clearBillingTables()
  })

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/users/me')
    expect(res.status).toBe(401)
  })

  it('returns profile with defaults when no profile row exists', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { handle: null; theme: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.handle).toBeNull()
    expect(body.data.theme).toBe('electric')
  })

  it('derives free with no billing rows (no more implicit founder)', async () => {
    setAuth()
    const body = await fetchMe()
    expect(body.data.planState).toEqual({
      plan: 'free',
      onTrial: false,
      trialEndsAt: null,
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      roleComped: false,
    })
  })

  it('derives gifted from a live gifted_comps row, before any subscription', async () => {
    setAuth()
    clerkState.plan = 'premium_gifted'
    await testDb.insert(giftedComps).values({
      userId: 'user_test123',
      grantedBy: 'user_admin',
    })
    await seedSubscription('user_test123', { tier: 'supporter' })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('gifted')
  })

  it('treats a revoked gift as absent', async () => {
    setAuth()
    await testDb.insert(giftedComps).values({
      userId: 'user_test123',
      grantedBy: 'user_admin',
      revokedAt: new Date(),
    })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('free')
  })

  it('derives premium from an active premium subscription', async () => {
    setAuth()
    await seedSubscription('user_test123')
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('premium')
    expect(body.data.planState.status).toBe('active')
    expect(body.data.planState.onTrial).toBe(false)
  })

  it('keeps the founder plan while past_due (dunning window)', async () => {
    setAuth()
    await seedSubscription('user_test123', {
      tier: 'founder',
      status: 'past_due',
    })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('founder')
    expect(body.data.planState.status).toBe('past_due')
  })

  it('falls through to free on a cancelled subscription', async () => {
    setAuth()
    await seedSubscription('user_test123', { status: 'cancelled' })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('free')
    expect(body.data.planState.status).toBe('cancelled')
  })

  it('derives premium with onTrial from a live user_billing trial', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      trialEndsAt: new Date(Date.now() + 7 * 86400000),
    })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('premium')
    expect(body.data.planState.onTrial).toBe(true)
    expect(body.data.planState.trialEndsAt).not.toBeNull()
  })

  it('derives free from an expired trial', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      trialEndsAt: new Date(Date.now() - 86400000),
    })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('free')
    expect(body.data.planState.onTrial).toBe(false)
  })

  it('reports cancel-grace via cancelAtPeriodEnd with active status', async () => {
    setAuth()
    await seedSubscription('user_test123', { cancelAtPeriodEnd: true })
    const body = await fetchMe()
    expect(body.data.planState.plan).toBe('premium')
    expect(body.data.planState.cancelAtPeriodEnd).toBe(true)
    expect(body.data.planState.status).toBe('active')
  })

  it('returns saved handle when profile exists', async () => {
    setAuth()
    await seedUserProfile('user_test123', { handle: 'testuser' })
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: { handle: string }
    }
    expect(body.data.handle).toBe('testuser')
  })

  it('beta role sets roleComped (not the founder plan) and beta roleBadge', async () => {
    clerkState.role = 'beta'
    setAuth()
    const body = await fetchMe()
    expect(body.data.planState.roleComped).toBe(true)
    expect(body.data.planState.plan).toBe('free')
    expect(body.data.roleBadge).toBe('beta')
  })

  it('promoter role sets roleComped and promoter roleBadge', async () => {
    clerkState.role = 'promoter'
    setAuth()
    const body = await fetchMe()
    expect(body.data.planState.roleComped).toBe(true)
    expect(body.data.planState.plan).toBe('free')
    expect(body.data.roleBadge).toBe('promoter')
  })

  it('admin role sets roleComped and admin roleBadge', async () => {
    clerkState.role = 'admin'
    setAuth()
    const body = await fetchMe()
    expect(body.data.planState.roleComped).toBe(true)
    expect(body.data.planState.plan).toBe('free')
    expect(body.data.roleBadge).toBe('admin')
  })

  it('sub_admin role sets roleComped and admin roleBadge', async () => {
    clerkState.role = 'sub_admin'
    setAuth()
    const body = await fetchMe()
    expect(body.data.planState.roleComped).toBe(true)
    expect(body.data.planState.plan).toBe('free')
    expect(body.data.roleBadge).toBe('admin')
  })

  it('role-holder with a live subscription keeps roleComped and the paid tier', async () => {
    clerkState.role = 'beta'
    setAuth()
    await seedSubscription('user_test123', { tier: 'founder' })
    const body = await fetchMe()
    expect(body.data.planState.roleComped).toBe(true)
    expect(body.data.planState.plan).toBe('founder')
  })

  it('user role produces null roleBadge', async () => {
    clerkState.role = 'user'
    setAuth()
    const res = await app.request('/v1/users/me', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: { roleBadge: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.roleBadge).toBeNull()
  })
})

describe('GET /v1/users/me — lifecycle nudge flags + founder window', () => {
  const DAY_MS = 86400000
  const HOUR_MS = 3600000

  beforeEach(async () => {
    clearAuth()
    clerkState.role = 'user'
    clerkState.plan = undefined
    await clearTables()
    await clearBillingTables()
    await setFounderWindow()
  })

  it('shows the trial-ended takeover when the trial expired and was never shown', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      trialEndsAt: new Date(Date.now() - DAY_MS),
    })
    const body = await fetchMe()
    expect(body.data.showTrialEndedTakeover).toBe(true)
    expect(body.data.showDayThirteenBanner).toBe(false)
  })

  it('does not re-show the takeover once shown after expiry', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      trialEndsAt: new Date(Date.now() - DAY_MS),
      lastTrialEndedShownAt: new Date(Date.now() - HOUR_MS),
    })
    const body = await fetchMe()
    expect(body.data.showTrialEndedTakeover).toBe(false)
  })

  it('shows the day-13 banner inside the 48h→24h window', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      trialEndsAt: new Date(Date.now() + 36 * HOUR_MS),
    })
    const body = await fetchMe()
    expect(body.data.showDayThirteenBanner).toBe(true)
    expect(body.data.showTrialEndedTakeover).toBe(false)
  })

  it('hides the day-13 banner when dismissed during this trial window', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      trialEndsAt: new Date(Date.now() + 36 * HOUR_MS),
      dayThirteenBannerDismissedAt: new Date(Date.now() - HOUR_MS),
    })
    const body = await fetchMe()
    expect(body.data.showDayThirteenBanner).toBe(false)
  })

  it('shows the past-due banner for past_due with no dismissal', async () => {
    setAuth()
    await seedSubscription('user_test123', { status: 'past_due' })
    const body = await fetchMe()
    expect(body.data.showPastDueBanner).toBe(true)
  })

  it('hides the past-due banner when dismissed after the supplied sessionStartedAt', async () => {
    setAuth()
    await seedSubscription('user_test123', { status: 'past_due' })
    const sessionStartedAt = new Date(Date.now() - 2 * HOUR_MS)
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      pastDueBannerDismissedAt: new Date(Date.now() - HOUR_MS),
    })
    const body = await fetchMe(
      `?sessionStartedAt=${encodeURIComponent(sessionStartedAt.toISOString())}`,
    )
    expect(body.data.showPastDueBanner).toBe(false)
  })

  it('shows the past-due banner when the dismissal predates the supplied sessionStartedAt', async () => {
    setAuth()
    await seedSubscription('user_test123', { status: 'past_due' })
    const sessionStartedAt = new Date(Date.now() - HOUR_MS)
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      pastDueBannerDismissedAt: new Date(Date.now() - 2 * HOUR_MS),
    })
    const body = await fetchMe(
      `?sessionStartedAt=${encodeURIComponent(sessionStartedAt.toISOString())}`,
    )
    expect(body.data.showPastDueBanner).toBe(true)
  })

  it('ignores an invalid sessionStartedAt instead of returning 400', async () => {
    setAuth()
    await seedSubscription('user_test123', { status: 'past_due' })
    await testDb.insert(userBilling).values({
      userId: 'user_test123',
      pastDueBannerDismissedAt: new Date(Date.now() - HOUR_MS),
    })
    // Invalid ⇒ treated as absent ⇒ any dismissal suppresses.
    const body = await fetchMe('?sessionStartedAt=not-a-date')
    expect(body.data.showPastDueBanner).toBe(false)
  })

  it('returns the founder window snapshot', async () => {
    setAuth()
    const opensAt = new Date(Date.now() - DAY_MS)
    await setFounderWindow({ opensAt, seatsRemaining: 42 })
    const body = await fetchMe()
    // closesAt is generated: opensAt + windowDays (30).
    expect(body.data.founderWindow).toEqual({
      state: 'open',
      seatsTotal: 100,
      seatsRemaining: 42,
      closesAt: new Date(opensAt.getTime() + 30 * DAY_MS).toISOString(),
    })
  })

  it('falls back to a pre-launch founder window when the singleton row is missing', async () => {
    setAuth()
    await testDb.execute(sql`TRUNCATE founder_window`)
    const body = await fetchMe()
    expect(body.data.founderWindow).toEqual({
      state: 'pre-launch',
      seatsTotal: 100,
      closesAt: null,
    })
  })
})

describe('PATCH /v1/users/me', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 without auth', async () => {
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'myhandle' }),
    })
    expect(res.status).toBe(401)
  })

  it('creates a profile with handle', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({ handle: 'myhandle' }),
    })
    expect(res.status).toBe(200)
  })

  it('rejects reserved handles with 422', async () => {
    setAuth()
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({ handle: 'admin' }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects taken handles with 409', async () => {
    await seedUserProfile('user_other', { handle: 'taken' })
    setAuth('user_test123')
    const res = await app.request('/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test',
      },
      body: JSON.stringify({ handle: 'taken' }),
    })
    expect(res.status).toBe(409)
  })
})

describe('GET /v1/users/me/submissions', () => {
  it('returns user submissions with display status', async () => {
    setAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123', {
      status: 'corroborated',
      priceMin: '40',
    })

    const res = await app.request('/v1/users/me/submissions', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ status: string; priceMin: number }>
    }
    expect(body.success).toBe(true)
    expect(body.data[0]?.status).toBe('confirmed')
    expect(body.data[0]?.priceMin).toBe(4000)
  })

  it('returns tier, corroborationCount, and submittedAt fields', async () => {
    setAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123', { priceMin: '25' })

    const res = await app.request('/v1/users/me/submissions', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: Array<{
        tier: string
        corroborationCount: number
        submittedAt: string
      }>
    }
    expect(body.success).toBe(true)
    expect(body.data[0]?.tier).toBe('GA')
    // Submitter counts as observation #1 (1/2 corroboration model) — seed
    // helper inserts with corroborationCount=1.
    expect(body.data[0]?.corroborationCount).toBe(1)
    expect(typeof body.data[0]?.submittedAt).toBe('string')
    expect(new Date(body.data[0]?.submittedAt ?? '').getTime()).not.toBeNaN()
  })

  it('returns submissions newest-first', async () => {
    setAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123', { priceMin: '10' })
    await seedPriceSubmission(event.id, 'user_test123', { priceMin: '20' })

    const res = await app.request('/v1/users/me/submissions', {
      headers: { Authorization: 'Bearer test' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ submittedAt: string }>
    }
    expect(body.success).toBe(true)
    expect(body.data.length).toBe(2)
    const first = new Date(body.data[0]?.submittedAt ?? '').getTime()
    const second = new Date(body.data[1]?.submittedAt ?? '').getTime()
    expect(first).toBeGreaterThanOrEqual(second)
  })
})

describe('GET /v1/users/handle-availability', () => {
  beforeEach(async () => {
    setAuth()
    await clearTables()
  })

  it('returns available: true for free handle', async () => {
    const res = await app.request(
      '/v1/users/handle-availability?handle=freehandle',
      {
        headers: { Authorization: 'Bearer test' },
      },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { available: boolean }
    }
    expect(body.data.available).toBe(true)
  })

  it('returns available: false for reserved word', async () => {
    const res = await app.request(
      '/v1/users/handle-availability?handle=admin',
      {
        headers: { Authorization: 'Bearer test' },
      },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { available: boolean; reason: string }
    }
    expect(body.data.available).toBe(false)
    expect(body.data.reason).toBe('reserved')
  })

  it('returns available: false for taken handle', async () => {
    await seedUserProfile('user_other2', { handle: 'takenone' })
    const res = await app.request(
      '/v1/users/handle-availability?handle=takenone',
      {
        headers: { Authorization: 'Bearer test' },
      },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { available: boolean }
    }
    expect(body.data.available).toBe(false)
  })
})

describe('DELETE /v1/users/me', () => {
  it('anonymizes submissions and deletes profile', async () => {
    setAuth()
    await clearTables()
    await seedUserProfile('user_test123')
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_test123')

    const res = await app.request('/v1/users/me', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test' },
    })
    expect(res.status).toBe(200)
  })
})
