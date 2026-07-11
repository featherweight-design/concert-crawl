import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

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

import { sql } from 'drizzle-orm'
import { giftedComps, subscriptions, userBilling } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import {
  requireFeature,
  ENTITLEMENT_REQUIRED_CODE,
  type EntitlementVariables,
} from './entitlement.js'

const USER_ID = 'user_entitlement_test'

// Probe app: the exact one-line mount any future concert-history /
// calendar-export endpoint uses.
const app = new Hono<{ Variables: EntitlementVariables }>()
app.use('/history', requireFeature('concert-history'))
app.get('/history', (ctx) =>
  ctx.json({ success: true, plan: ctx.get('planState').plan }),
)
app.use('/export', requireFeature('calendar-export'))
app.get('/export', (ctx) => ctx.json({ success: true }))
app.use('/watching', requireFeature('watching'))
app.get('/watching', (ctx) => ctx.json({ success: true }))

async function clearBillingTables(): Promise<void> {
  await testDb.execute(sql`TRUNCATE subscriptions, gifted_comps, user_billing`)
}

async function seedSubscription(
  overrides: Partial<typeof subscriptions.$inferInsert> = {},
): Promise<void> {
  await testDb.insert(subscriptions).values({
    userId: USER_ID,
    stripeCustomerId: `cus_${USER_ID}`,
    stripeSubscriptionId: `sub_${USER_ID}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    ...overrides,
  })
}

function setAuth(role = 'user'): void {
  authState.current = {
    userId: USER_ID,
    sessionClaims: { metadata: { role } },
  }
}

describe('requireFeature (real plan derivation)', () => {
  beforeEach(async () => {
    authState.current = null
    await clearBillingTables()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/history')
    expect(res.status).toBe(401)
  })

  it('403s a free user (no billing rows) with the typed error code', async () => {
    setAuth()
    const res = await app.request('/history')
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string; feature: string }
    expect(body.code).toBe(ENTITLEMENT_REQUIRED_CODE)
    expect(body.feature).toBe('concert-history')
  })

  it('403s a supporter on calendar-export', async () => {
    setAuth()
    await seedSubscription({ tier: 'supporter' })
    const res = await app.request('/export')
    expect(res.status).toBe(403)
  })

  it('passes an active premium subscription', async () => {
    setAuth()
    await seedSubscription({ tier: 'premium' })
    const res = await app.request('/history')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { plan: string }
    expect(body.plan).toBe('premium')
  })

  it('passes an active founder subscription', async () => {
    setAuth()
    await seedSubscription({ tier: 'founder' })
    const res = await app.request('/export')
    expect(res.status).toBe(200)
  })

  it('passes a live gifted comp', async () => {
    setAuth()
    await testDb.insert(giftedComps).values({
      userId: USER_ID,
      grantedBy: 'user_admin',
    })
    const res = await app.request('/history')
    expect(res.status).toBe(200)
  })

  it('passes a live trial (premium onTrial)', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: USER_ID,
      trialEndsAt: new Date(Date.now() + 86400000),
    })
    const res = await app.request('/export')
    expect(res.status).toBe(200)
  })

  it('403s an expired trial', async () => {
    setAuth()
    await testDb.insert(userBilling).values({
      userId: USER_ID,
      trialEndsAt: new Date(Date.now() - 86400000),
    })
    const res = await app.request('/export')
    expect(res.status).toBe(403)
  })

  it('passes a roleComped user with no billing rows', async () => {
    setAuth('admin')
    const res = await app.request('/history')
    expect(res.status).toBe(200)
  })

  it('watching passes for a free user (locked decision: watching is free)', async () => {
    setAuth()
    const res = await app.request('/watching')
    expect(res.status).toBe(200)
  })
})
