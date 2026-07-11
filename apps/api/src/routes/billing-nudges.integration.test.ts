// Integration tests for POST /v1/billing/nudges/dismiss and
// POST /v1/billing/nudges/trial-takeover-shown (eng infra spec Part 2 §1.4,
// §6; execution plan PR 4.2).

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { userBilling } from '@concert-crawl/db'

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

import { createBillingNudgesRouter } from './billing-nudges.js'
import { testDb } from '../test/helpers/db.js'

const USER_ID = 'user_nudges_test'

function setAuth(userId = USER_ID): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function buildApp(): Hono {
  const app = new Hono()
  app.route('/v1/billing', createBillingNudgesRouter())
  return app
}

function postJson(app: Hono, path: string, body?: unknown): Promise<Response> {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

async function clearBillingTable(): Promise<void> {
  await testDb.execute(sql`TRUNCATE user_billing`)
}

async function readBillingRow(): Promise<
  typeof userBilling.$inferSelect | undefined
> {
  const [row] = await testDb
    .select()
    .from(userBilling)
    .where(eq(userBilling.userId, USER_ID))
    .limit(1)
  return row
}

describe('POST /v1/billing/nudges/dismiss', () => {
  beforeEach(async () => {
    authState.current = null
    await clearBillingTable()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await postJson(buildApp(), '/v1/billing/nudges/dismiss', {
      nudge: 'day13',
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 with invalid_body for a missing or invalid body', async () => {
    setAuth()
    const app = buildApp()
    const missing = await postJson(app, '/v1/billing/nudges/dismiss')
    expect(missing.status).toBe(400)
    const missingBody = (await missing.json()) as { code?: string }
    expect(missingBody.code).toBe('invalid_body')

    const invalid = await postJson(app, '/v1/billing/nudges/dismiss', {
      nudge: 'not-a-nudge',
    })
    expect(invalid.status).toBe(400)
    const invalidBody = (await invalid.json()) as { code?: string }
    expect(invalidBody.code).toBe('invalid_body')
  })

  it('day13 dismiss stamps dayThirteenBannerDismissedAt', async () => {
    setAuth()
    const before = Date.now()
    const res = await postJson(buildApp(), '/v1/billing/nudges/dismiss', {
      nudge: 'day13',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    const row = await readBillingRow()
    expect(row?.dayThirteenBannerDismissedAt).toBeInstanceOf(Date)
    expect(row?.dayThirteenBannerDismissedAt?.getTime()).toBeGreaterThanOrEqual(
      before,
    )
    expect(row?.pastDueBannerDismissedAt).toBeNull()
    expect(row?.lastTrialEndedShownAt).toBeNull()
  })

  it('past-due dismiss stamps pastDueBannerDismissedAt', async () => {
    setAuth()
    const res = await postJson(buildApp(), '/v1/billing/nudges/dismiss', {
      nudge: 'past-due',
    })
    expect(res.status).toBe(200)

    const row = await readBillingRow()
    expect(row?.pastDueBannerDismissedAt).toBeInstanceOf(Date)
    expect(row?.dayThirteenBannerDismissedAt).toBeNull()
  })

  it('updates an existing row without clobbering other columns', async () => {
    setAuth()
    const trialEndsAt = new Date('2026-07-20T00:00:00.000Z')
    const lastTrialEndedShownAt = new Date('2026-07-01T00:00:00.000Z')
    await testDb.insert(userBilling).values({
      userId: USER_ID,
      trialEndsAt,
      lastTrialEndedShownAt,
    })

    const res = await postJson(buildApp(), '/v1/billing/nudges/dismiss', {
      nudge: 'day13',
    })
    expect(res.status).toBe(200)

    const row = await readBillingRow()
    expect(row?.dayThirteenBannerDismissedAt).toBeInstanceOf(Date)
    expect(row?.trialEndsAt?.toISOString()).toBe(trialEndsAt.toISOString())
    expect(row?.lastTrialEndedShownAt?.toISOString()).toBe(
      lastTrialEndedShownAt.toISOString(),
    )
  })
})

describe('POST /v1/billing/nudges/trial-takeover-shown', () => {
  beforeEach(async () => {
    authState.current = null
    await clearBillingTable()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await postJson(
      buildApp(),
      '/v1/billing/nudges/trial-takeover-shown',
    )
    expect(res.status).toBe(401)
  })

  it('stamps lastTrialEndedShownAt when no row exists', async () => {
    setAuth()
    const res = await postJson(
      buildApp(),
      '/v1/billing/nudges/trial-takeover-shown',
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    const row = await readBillingRow()
    expect(row?.lastTrialEndedShownAt).toBeInstanceOf(Date)
  })

  it('updates an existing row without clobbering trialEndsAt', async () => {
    setAuth()
    const trialEndsAt = new Date('2026-07-05T00:00:00.000Z')
    await testDb.insert(userBilling).values({ userId: USER_ID, trialEndsAt })

    const res = await postJson(
      buildApp(),
      '/v1/billing/nudges/trial-takeover-shown',
    )
    expect(res.status).toBe(200)

    const row = await readBillingRow()
    expect(row?.lastTrialEndedShownAt).toBeInstanceOf(Date)
    expect(row?.trialEndsAt?.toISOString()).toBe(trialEndsAt.toISOString())
  })
})
