import { describe, it, expect, beforeEach, vi } from 'vitest'

interface TestAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import { clearTables, seedVenue } from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import { auditLog, crawlTriggers, venues } from '@concert-crawl/db'
import { desc, eq } from 'drizzle-orm'

const app = createApp()

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } }
}

async function latestAuditRow(): Promise<
  typeof auditLog.$inferSelect | undefined
> {
  const [row] = await testDb
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1)
  return row
}

async function pausedAt(venueId: string): Promise<Date | null> {
  const [row] = await testDb
    .select({ crawlPausedAt: venues.crawlPausedAt })
    .from(venues)
    .where(eq(venues.id, venueId))
  return row?.crawlPausedAt ?? null
}

const pause = (venueId: string, body: unknown): Promise<Response> =>
  app.request(`/v1/admin/venues/${venueId}/crawl-pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const resume = (venueId: string): Promise<Response> =>
  app.request(`/v1/admin/venues/${venueId}/crawl-pause`, { method: 'DELETE' })

describe('admin venue crawl pause', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('requires an admin role', async () => {
    setAuth('user')
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' })
    expect((await pause(venue.id, { reason: 'asked to stop' })).status).toBe(
      403,
    )
    expect(await pausedAt(venue.id)).toBeNull()
  })

  it('pauses without deactivating the venue, and audits the reason', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' })

    const res = await pause(venue.id, { reason: 'awaiting API access' })
    expect(res.status).toBe(200)

    const [row] = await testDb
      .select({ active: venues.active, crawlPausedAt: venues.crawlPausedAt })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.crawlPausedAt).toBeInstanceOf(Date)
    // Shows stay published: the public queries join on venues.active.
    expect(row?.active).toBe(true)

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.crawl_pause')
    expect(audit?.targetId).toBe(venue.id)
    expect(audit?.metadata).toMatchObject({ reason: 'awaiting API access' })
  })

  it('requires a non-blank reason', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' })
    expect((await pause(venue.id, { reason: '   ' })).status).toBe(400)
    expect(await pausedAt(venue.id)).toBeNull()
  })

  it('keeps the original timestamp when paused again', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' })
    await pause(venue.id, { reason: 'first' })
    const first = await pausedAt(venue.id)
    await pause(venue.id, { reason: 'second' })
    expect(await pausedAt(venue.id)).toEqual(first)
  })

  it('resumes and audits how long the venue was paused', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' })
    await pause(venue.id, { reason: 'asked to stop' })

    const res = await resume(venue.id)
    expect(res.status).toBe(200)
    expect(await pausedAt(venue.id)).toBeNull()

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.crawl_resume')
    expect(audit?.metadata).toMatchObject({
      pausedSince: expect.any(String),
    })
  })

  it('404s for an unknown venue', async () => {
    setAuth('admin')
    const missing = '00000000-0000-4000-8000-000000000000'
    expect((await pause(missing, { reason: 'x' })).status).toBe(404)
    expect((await resume(missing)).status).toBe(404)
  })

  it('leaves a paused venue out of run-all', async () => {
    setAuth('admin')
    const paused = await seedVenue({ name: 'Levitt', slug: 'levitt' })
    const open = await seedVenue({ name: 'Bluebird', slug: 'bluebird' })
    await pause(paused.id, { reason: 'asked to stop' })

    const res = await app.request('/v1/admin/crawl', { method: 'POST' })
    expect(res.status).toBe(202)
    const queued = await testDb
      .select({ venueId: crawlTriggers.venueId })
      .from(crawlTriggers)
    expect(queued.map((row) => row.venueId)).toEqual([open.id])
  })
})
