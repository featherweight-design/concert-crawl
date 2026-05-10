import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import { createApp } from '../app.js'
import { clearTables } from '../test/helpers/seed.js'
import { testDb } from '../test/helpers/db.js'
import { feedback } from '@concert-crawl/db'
import { eq, sql } from 'drizzle-orm'

const app = createApp()

function setAuth(userId: string): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

beforeEach(async () => {
  clearAuth()
  await clearTables()
  await testDb.execute(sql`TRUNCATE feedback RESTART IDENTITY CASCADE`)
})

describe('POST /v1/feedback', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'test',
        pageUrl: '/events',
      }),
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 422 when category is missing', async () => {
    setAuth('user-validate-1')
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test', pageUrl: '/events' }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(false)
  })

  it('returns 422 when message is empty', async () => {
    setAuth('user-validate-2')
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: '',
        pageUrl: '/events',
      }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(false)
  })

  it('inserts feedback and returns 201', async () => {
    setAuth('user-insert-abc')
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'idea',
        message: 'Love this app.',
        pageUrl: '/events',
        metadata: { theme: 'electric', build: 'dev', device: 'Mac' },
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { success: boolean }
    expect(body).toEqual({ success: true })

    const rows = await testDb
      .select()
      .from(feedback)
      .where(eq(feedback.userId, 'user-insert-abc'))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.category).toBe('idea')
    expect(rows[0]?.message).toBe('Love this app.')
    expect(rows[0]?.userId).toBe('user-insert-abc')
    expect(rows[0]?.pageUrl).toBe('/events')
    expect(rows[0]?.metadata).toMatchObject({
      theme: 'electric',
      build: 'dev',
      device: 'Mac',
    })
  })

  it('returns 429 on second submission within the hour', async () => {
    // Use a unique userId per test run to avoid in-memory rate-limit store pollution
    const userId = `rate-limit-user-${Date.now()}`
    setAuth(userId)

    const payload = {
      category: 'bug',
      message: 'First report',
      pageUrl: '/events',
    }

    const firstRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(firstRes.status).toBe(201)

    const secondRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, message: 'Second report' }),
    })
    expect(secondRes.status).toBe(429)
    expect(Number(secondRes.headers.get('Retry-After'))).toBeGreaterThan(0)
  })
})
