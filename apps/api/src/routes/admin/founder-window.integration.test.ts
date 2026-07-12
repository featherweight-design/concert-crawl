import { describe, expect, it, beforeEach, vi } from 'vitest'
import { desc, eq, sql } from 'drizzle-orm'

// Hoisted auth state so the Clerk mock can swap users between tests.
// Same pattern as admin/contests.integration.test.ts.
const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { auditLog, founderWindow, subscriptionEvents } from '@concert-crawl/db'
import { createApp } from '../../app.js'
import { testDb } from '../../test/helpers/db.js'
import { clearTables } from '../../test/helpers/seed.js'

const app = createApp()

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_founder_test',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

interface SeedWindow {
  opensAt: Date | null
  seatsTotal: number
  seatsRemaining: number
  seatsRemainingTest: number
  windowDays: number
}

async function seedFounderWindow(overrides: Partial<SeedWindow> = {}) {
  const values: SeedWindow = {
    opensAt: null,
    seatsTotal: 100,
    seatsRemaining: 100,
    seatsRemainingTest: 100,
    windowDays: 30,
    ...overrides,
  }
  await testDb
    .insert(founderWindow)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: founderWindow.id, set: values })
}

async function readWindow() {
  const [row] = await testDb
    .select()
    .from(founderWindow)
    .where(eq(founderWindow.id, 1))
  if (!row) throw new Error('founder_window singleton missing')
  return row
}

describe('admin founder-window', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
    await testDb.execute(sql`TRUNCATE subscription_events`)
    await seedFounderWindow()
  })

  describe('GET /v1/admin/founder-window', () => {
    it('requires admin auth', async () => {
      const res = await app.request('/v1/admin/founder-window')
      expect([401, 403]).toContain(res.status)
    })

    it('returns the dormant view with parsed recent claims', async () => {
      await testDb.insert(subscriptionEvents).values([
        {
          userId: 'user_seat_2',
          type: 'founder_claimed',
          metadata: { seatNumber: 2 },
        },
        {
          userId: 'user_seat_bad',
          type: 'founder_claimed',
          metadata: { note: 'legacy row, no seat number' },
        },
      ])
      setAdminAuth()

      const res = await app.request('/v1/admin/founder-window', {
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.state).toBe('pre-launch')
      expect(body.data.opensAt).toBeNull()
      expect(body.data.closesAt).toBeNull()
      expect(body.data.seatsTotal).toBe(100)
      expect(body.data.seatsRemaining).toBe(100)
      expect(body.data.seatsRemainingTest).toBe(100)
      expect(body.data.recentClaims).toHaveLength(2)
      // Most recent first; the legacy row without seatNumber → null.
      const bySeat = body.data.recentClaims.map(
        (claim: { seatNumber: number | null }) => claim.seatNumber,
      )
      expect(bySeat).toContain(2)
      expect(bySeat).toContain(null)
    })
  })

  describe('POST /v1/admin/founder-window/open', () => {
    it('flips opens_at and writes an audit log entry', async () => {
      setAdminAuth()
      const res = await app.request('/v1/admin/founder-window/open', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.state).toBe('open')
      expect(body.data.opensAt).not.toBeNull()
      expect(body.data.closesAt).not.toBeNull()

      const row = await readWindow()
      expect(row.opensAt).not.toBeNull()

      const [entry] = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'founder_window.open'))
      expect(entry?.actorId).toBe('admin_founder_test')
    })

    it('refuses a second open with 409', async () => {
      await seedFounderWindow({ opensAt: new Date() })
      setAdminAuth()
      const res = await app.request('/v1/admin/founder-window/open', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('founder_window_already_open')
    })
  })

  describe('POST /v1/admin/founder-window/simulate-claim', () => {
    it('decrements only the test counter', async () => {
      setAdminAuth()
      const res = await app.request('/v1/admin/founder-window/simulate-claim', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.seatsRemainingTest).toBe(99)

      const row = await readWindow()
      expect(row.seatsRemainingTest).toBe(99)
      expect(row.seatsRemaining).toBe(100) // real count untouched
    })

    it('returns 409 when test seats are exhausted', async () => {
      await seedFounderWindow({ seatsRemainingTest: 0 })
      setAdminAuth()
      const res = await app.request('/v1/admin/founder-window/simulate-claim', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.code).toBe('founder_test_seats_exhausted')
    })
  })

  describe('POST /v1/admin/founder-window/reset-test-seats', () => {
    it('restores the test counter to seats_total', async () => {
      await seedFounderWindow({ seatsRemainingTest: 3, seatsTotal: 100 })
      setAdminAuth()
      const res = await app.request(
        '/v1/admin/founder-window/reset-test-seats',
        { method: 'POST', headers: ADMIN_HEADERS },
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.seatsRemainingTest).toBe(100)
    })
  })

  it('records the most recent claim first', async () => {
    const older = new Date(Date.now() - 60_000)
    const newer = new Date()
    await testDb.insert(subscriptionEvents).values([
      {
        userId: 'user_older',
        type: 'founder_claimed',
        metadata: { seatNumber: 1 },
        createdAt: older,
      },
      {
        userId: 'user_newer',
        type: 'founder_claimed',
        metadata: { seatNumber: 2 },
        createdAt: newer,
      },
    ])
    setAdminAuth()
    const res = await app.request('/v1/admin/founder-window', {
      headers: ADMIN_HEADERS,
    })
    const body = await res.json()
    expect(body.data.recentClaims[0].userId).toBe('user_newer')

    // Sanity: ordering matches a direct desc query.
    const [top] = await testDb
      .select({ userId: subscriptionEvents.userId })
      .from(subscriptionEvents)
      .orderBy(desc(subscriptionEvents.createdAt))
      .limit(1)
    expect(top?.userId).toBe('user_newer')
  })
})
