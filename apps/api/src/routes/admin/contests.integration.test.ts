import { describe, expect, it, beforeEach, vi } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'

// Hoisted auth state so the Clerk mock can swap users between tests without
// reloading modules. Same pattern as admin/prices.integration.test.ts.
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

import {
  events,
  notifications,
  priceSubmissions,
  userRoles,
} from '@concert-crawl/db'
import { createApp } from '../../app.js'
import { testDb } from '../../test/helpers/db.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
  seedUserRole,
  seedVenue,
} from '../../test/helpers/seed.js'

const app = createApp()

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_contest_test',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

// Convention: every admin-action test body in this file calls
// `setAdminAuth()` as its first line. The `requires admin auth` test starts
// with the cleared default state from beforeEach to verify the gate.

describe('GET /v1/admin/contests/prices', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('requires admin auth', async () => {
    const res = await app.request('/v1/admin/contests/prices')
    expect([401, 403]).toContain(res.status)
  })

  it('returns an empty list when no contests exist', async () => {
    setAdminAuth()
    const res = await app.request('/v1/admin/contests/prices', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { items: unknown[]; total: number; limit: number; offset: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.items).toEqual([])
    expect(body.data.total).toBe(0)
    expect(body.data.limit).toBe(20)
    expect(body.data.offset).toBe(0)
  })

  it('lists open contests with full parent + counter shape', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Contest Venue',
      slug: 'contest-list-1',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      title: 'Contest Test Show',
      artist: 'Contest List Artist',
    })
    const submitter = await seedUserProfile('contest-parent-u', {
      handle: 'parent-h',
    })
    const challenger = await seedUserProfile('contest-chal-u', {
      handle: 'chal-h',
    })
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
      note: 'Original observation',
      corroborationCount: 3,
    })
    const counter = await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
      note: 'Saw new price on AXS',
      corroborationCount: 1,
    })

    const res = await app.request('/v1/admin/contests/prices', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        items: Array<{
          contestId: string
          eventId: string
          eventTitle: string
          venueName: string
          eventDate: string
          tier: string
          sourceCategory: string | null
          parent: {
            id: string
            priceMin: string
            priceMax: string | null
            vendor: string
            submitter: { userId: string; handle: string | null }
            confirms: { fans: number; admin: number }
            observedAt: string
            lastUpdatedAt: string
            note: string | null
          }
          counter: {
            id: string
            priceMin: string
            priceMax: string | null
            vendor: string
            submitter: { userId: string; handle: string | null }
            confirms: { fans: number; admin: number }
            observedAt: string
            note: string | null
          }
          filedAt: string
        }>
        total: number
        limit: number
        offset: number
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.items).toHaveLength(1)
    const item = body.data.items[0]!
    expect(item.contestId).toBe(parent.id)
    expect(item.eventId).toBe(event.id)
    expect(item.eventTitle).toBe('Contest Test Show')
    expect(item.venueName).toBe('Contest Venue')
    expect(item.eventDate).toBe('2027-06-01')
    expect(item.tier).toBe('GA')
    expect(item.sourceCategory).toBe('standard')

    // Parent shape (numeric(10,2) — Postgres returns '40.00' not '40')
    expect(item.parent.id).toBe(parent.id)
    expect(item.parent.priceMin).toBe('40.00')
    expect(item.parent.vendor).toBe('AXS')
    expect(item.parent.note).toBe('Original observation')
    expect(item.parent.submitter.userId).toBe('contest-parent-u')
    expect(item.parent.submitter.handle).toBe('parent-h')
    // fans = corroborationCount (which already includes submitter as observation #1)
    expect(item.parent.confirms.fans).toBe(3)
    expect(item.parent.confirms.admin).toBe(0)
    expect(item.parent.observedAt).toBeTruthy()
    expect(item.parent.lastUpdatedAt).toBeTruthy()

    // Counter shape
    expect(item.counter.id).toBe(counter.id)
    expect(item.counter.priceMin).toBe('55.00')
    expect(item.counter.vendor).toBe('AXS')
    expect(item.counter.note).toBe('Saw new price on AXS')
    expect(item.counter.submitter.userId).toBe('contest-chal-u')
    expect(item.counter.submitter.handle).toBe('chal-h')
    // Pending counter starts at corroborationCount=1 (submitter implicit obs)
    expect(item.counter.confirms.fans).toBe(1)
    expect(item.counter.confirms.admin).toBe(0)

    expect(item.filedAt).toBeTruthy()
    expect(body.data.total).toBe(1)
  })

  it('sorts contests by filedAt ascending (oldest first)', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Sort Venue',
      slug: 'contest-sort-venue',
    })
    const eventA = await seedEvent(venue.id, {
      date: '2027-07-01',
      title: 'Sort Show A',
      artist: 'Sort Artist A',
    })
    const eventB = await seedEvent(venue.id, {
      date: '2027-07-02',
      title: 'Sort Show B',
      artist: 'Sort Artist B',
    })
    const parentA = await seedPriceSubmission(eventA.id, 'sort-parent-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    const parentB = await seedPriceSubmission(eventB.id, 'sort-parent-b', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '50',
      status: 'disputed',
    })

    // Insert older counter first, then newer one — they should appear in
    // [older, newer] order regardless of insertion sequence vs. parent age.
    const olderFiledAt = new Date('2027-01-01T00:00:00Z')
    const newerFiledAt = new Date('2027-02-01T00:00:00Z')

    await seedPriceSubmission(eventB.id, 'sort-chal-b', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parentB.id,
      createdAt: newerFiledAt,
    })
    await seedPriceSubmission(eventA.id, 'sort-chal-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parentA.id,
      createdAt: olderFiledAt,
    })

    const res = await app.request('/v1/admin/contests/prices', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { items: Array<{ contestId: string; filedAt: string }> }
    }
    expect(body.data.items).toHaveLength(2)
    // Oldest contest first
    expect(body.data.items[0]?.contestId).toBe(parentA.id)
    expect(body.data.items[1]?.contestId).toBe(parentB.id)
  })

  it('paginates via limit + offset', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Page Venue',
      slug: 'contest-page-venue',
    })

    // Seed three contests with distinct filedAt timestamps.
    for (let idx = 0; idx < 3; idx++) {
      const event = await seedEvent(venue.id, {
        date: `2027-08-0${idx + 1}`,
        title: `Page Show ${idx}`,
        artist: `Page Artist ${idx}`,
      })
      const parent = await seedPriceSubmission(event.id, `page-parent-${idx}`, {
        tier: 'GA',
        vendor: 'AXS',
        sourceCategory: 'standard',
        priceMin: `${30 + idx}`,
        status: 'disputed',
      })
      await seedPriceSubmission(event.id, `page-chal-${idx}`, {
        tier: 'GA',
        vendor: 'AXS',
        sourceCategory: 'standard',
        priceMin: `${50 + idx}`,
        status: 'pending',
        disputedSubmissionId: parent.id,
        createdAt: new Date(`2027-03-0${idx + 1}T00:00:00Z`),
      })
    }

    const res = await app.request(
      '/v1/admin/contests/prices?limit=2&offset=1',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        items: Array<{ contestId: string }>
        total: number
        limit: number
        offset: number
      }
    }
    expect(body.data.items).toHaveLength(2)
    expect(body.data.total).toBe(3)
    expect(body.data.limit).toBe(2)
    expect(body.data.offset).toBe(1)
  })
})

describe('GET /v1/admin/contests/prices/:contestId', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('requires admin auth', async () => {
    // Unauthed
    const unauthRes = await app.request(
      '/v1/admin/contests/prices/00000000-0000-0000-0000-000000000000',
    )
    expect([401, 403]).toContain(unauthRes.status)

    // Non-admin role
    authState.current = {
      userId: 'user_non_admin',
      sessionClaims: { metadata: { role: 'user' } },
    }
    const nonAdminRes = await app.request(
      '/v1/admin/contests/prices/00000000-0000-0000-0000-000000000000',
      { headers: ADMIN_HEADERS },
    )
    expect([401, 403]).toContain(nonAdminRes.status)
  })

  it('returns 404 for an unknown contestId', async () => {
    setAdminAuth()
    const res = await app.request(
      '/v1/admin/contests/prices/00000000-0000-0000-0000-000000000000',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when the parent has no counter (not a contest)', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'No Counter',
      slug: 'contest-detail-no-counter',
    })
    const event = await seedEvent(venue.id, { date: '2027-06-02' })
    const orphan = await seedPriceSubmission(event.id, 'orphan-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })

    const res = await app.request(`/v1/admin/contests/prices/${orphan.id}`, {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(404)
  })

  it('returns full detail for an open contest', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Detail Venue',
      slug: 'contest-detail-1',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      title: 'Detail Show',
      artist: 'Detail Artist',
      ticketPriceMin: '40',
      ticketPriceMax: '80',
      priceSource: 'community',
    })
    const submitter = await seedUserProfile('detail-parent-u', {
      handle: 'parent-detail',
    })
    const challenger = await seedUserProfile('detail-chal-u', {
      handle: 'chal-detail',
    })
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
      note: 'Original observation',
      corroborationCount: 3,
    })
    const counter = await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
      note: 'Saw new price on AXS',
      corroborationCount: 1,
    })

    const res = await app.request(`/v1/admin/contests/prices/${parent.id}`, {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        contestId: string
        eventId: string
        eventTitle: string
        venueName: string
        eventDate: string
        tier: string
        sourceCategory: string | null
        parent: {
          id: string
          priceMin: string
          priceMax: string | null
          vendor: string
          submitter: { userId: string; handle: string | null }
          confirms: { fans: number; admin: number }
          observedAt: string
          lastUpdatedAt: string
          note: string | null
          status: string
        }
        counter: {
          id: string
          priceMin: string
          priceMax: string | null
          vendor: string
          submitter: { userId: string; handle: string | null }
          confirms: { fans: number; admin: number }
          observedAt: string
          note: string | null
          status: string
          lastAdminActionAt: string | null
          lastAdminActionKind: string | null
        }
        filedAt: string
        history: unknown[]
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.contestId).toBe(parent.id)
    expect(body.data.eventId).toBe(event.id)
    expect(body.data.eventTitle).toBe('Detail Show')
    expect(body.data.venueName).toBe('Detail Venue')
    expect(body.data.eventDate).toBe('2027-06-01')
    expect(body.data.tier).toBe('GA')
    expect(body.data.sourceCategory).toBe('standard')

    // Parent shape
    expect(body.data.parent.id).toBe(parent.id)
    expect(body.data.parent.priceMin).toBe('40.00')
    expect(body.data.parent.vendor).toBe('AXS')
    expect(body.data.parent.note).toBe('Original observation')
    expect(body.data.parent.submitter.userId).toBe('detail-parent-u')
    expect(body.data.parent.submitter.handle).toBe('parent-detail')
    expect(body.data.parent.confirms.fans).toBe(3)
    expect(body.data.parent.confirms.admin).toBe(0)
    expect(body.data.parent.status).toBe('disputed')
    expect(body.data.parent.observedAt).toBeTruthy()
    expect(body.data.parent.lastUpdatedAt).toBeTruthy()

    // Counter shape
    expect(body.data.counter.id).toBe(counter.id)
    expect(body.data.counter.priceMin).toBe('55.00')
    expect(body.data.counter.vendor).toBe('AXS')
    expect(body.data.counter.note).toBe('Saw new price on AXS')
    expect(body.data.counter.submitter.userId).toBe('detail-chal-u')
    expect(body.data.counter.submitter.handle).toBe('chal-detail')
    expect(body.data.counter.confirms.fans).toBe(1)
    expect(body.data.counter.confirms.admin).toBe(0)
    expect(body.data.counter.status).toBe('pending')
    expect(body.data.counter.lastAdminActionAt).toBeNull()
    expect(body.data.counter.lastAdminActionKind).toBeNull()

    expect(body.data.filedAt).toBeTruthy()
    expect(body.data.history).toEqual([])
  })

  it('surfaces lastAdminActionKind=defer and lastAdminActionAt on a deferred counter', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Defer Venue',
      slug: 'contest-detail-defer',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-03',
      title: 'Defer Show',
      artist: 'Defer Artist',
    })
    const parent = await seedPriceSubmission(event.id, 'defer-parent-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    const deferTimestamp = new Date('2027-05-15T12:00:00Z')
    await seedPriceSubmission(event.id, 'defer-chal-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parent.id,
      lastAdminActionAt: deferTimestamp,
      lastAdminActionKind: 'defer',
    })

    const res = await app.request(`/v1/admin/contests/prices/${parent.id}`, {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        counter: {
          lastAdminActionAt: string | null
          lastAdminActionKind: string | null
          status: string
        }
      }
    }
    expect(body.data.counter.lastAdminActionKind).toBe('defer')
    expect(body.data.counter.lastAdminActionAt).toBe(
      deferTimestamp.toISOString(),
    )
    expect(body.data.counter.status).toBe('pending')
  })

  it('returns detail for a resolved contest (counter archived, parent corroborated)', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Resolved Venue',
      slug: 'contest-detail-resolved',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-04',
      title: 'Resolved Show',
      artist: 'Resolved Artist',
    })
    // parent_wins outcome: parent flipped back to corroborated, counter archived.
    const parent = await seedPriceSubmission(event.id, 'resolved-parent-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'resolved-chal-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'archived',
      disputedSubmissionId: parent.id,
      archivedReason: 'Original held — box-office confirmed.',
    })

    const res = await app.request(`/v1/admin/contests/prices/${parent.id}`, {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        parent: { status: string }
        counter: { status: string }
      }
    }
    expect(body.data.parent.status).toBe('corroborated')
    expect(body.data.counter.status).toBe('archived')
  })
})

describe('POST /v1/admin/contests/prices/:contestId/resolve', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
    // notifications is NOT in the shared clearTables TRUNCATE list. Wipe it
    // here so per-test assertions about row counts aren't contaminated by
    // rows from previous tests.
    await testDb.delete(notifications)
  })

  // Seeds one contest:
  //   - venue + event (priceSource='community' by default so the projection
  //     update can be observed in challenger_wins paths)
  //   - parent submission (status=disputed) + user profile + user role row
  //   - counter submission (status=pending, disputedSubmissionId=parent.id) +
  //     user profile + user role row
  // Returns all rows so tests can assert against them.
  const seedContest = async (
    options: {
      eventOverrides?: Partial<typeof events.$inferInsert>
      counterOverrides?: Partial<typeof priceSubmissions.$inferInsert>
      parentOverrides?: Partial<typeof priceSubmissions.$inferInsert>
    } = {},
  ) => {
    const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
    const venue = await seedVenue({
      name: 'Resolve Venue',
      slug: `resolve-venue-${uniq}`,
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      title: `Resolve Show ${uniq}`,
      artist: `Resolve Artist ${uniq}`,
      ticketPriceMin: '40',
      ticketPriceMax: '40',
      priceSource: 'community',
      ...options.eventOverrides,
    })
    const submitter = await seedUserProfile(`resolve-parent-${uniq}`, {
      handle: `parent-${uniq}`,
    })
    const challenger = await seedUserProfile(`resolve-chal-${uniq}`, {
      handle: `chal-${uniq}`,
    })
    // Cred is awarded by UPDATE — rows must exist for the +1 to land.
    const parentRole = await seedUserRole(submitter.userId, {
      role: 'user',
      grantedBy: 'system',
      priceCredScore: 5,
    })
    const challengerRole = await seedUserRole(challenger.userId, {
      role: 'user',
      grantedBy: 'system',
      priceCredScore: 2,
    })
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      priceMax: '40',
      status: 'disputed',
      note: 'Original observation',
      corroborationCount: 3,
      ...options.parentOverrides,
    })
    const counter = await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      priceMax: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
      note: 'New AXS price after openers added',
      corroborationCount: 1,
      ...options.counterOverrides,
    })
    return {
      venue,
      event,
      submitter,
      challenger,
      parent,
      counter,
      parentRoleBefore: parentRole,
      challengerRoleBefore: challengerRole,
    }
  }

  const fetchSubmission = async (id: string) => {
    const [row] = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)
    if (!row) throw new Error(`fetchSubmission: id ${id} not found`)
    return row
  }

  const fetchEvent = async (id: string) => {
    const [row] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1)
    if (!row) throw new Error(`fetchEvent: id ${id} not found`)
    return row
  }

  const fetchCred = async (userId: string): Promise<number> => {
    const [row] = await testDb
      .select({ score: userRoles.priceCredScore })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1)
    return row?.score ?? 0
  }

  it('requires admin auth', async () => {
    const { parent } = await seedContest()

    // Unauthed
    const unauthRes = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Original observation still holds.',
        }),
      },
    )
    expect([401, 403]).toContain(unauthRes.status)

    // Non-admin
    authState.current = {
      userId: 'user_non_admin',
      sessionClaims: { metadata: { role: 'user' } },
    }
    const nonAdminRes = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Original observation still holds.',
        }),
      },
    )
    expect([401, 403]).toContain(nonAdminRes.status)
  })

  it('rejects invalid uuid path param with 400', async () => {
    setAdminAuth()
    const res = await app.request(
      '/v1/admin/contests/prices/not-a-uuid/resolve',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Original observation still holds.',
        }),
      },
    )
    expect(res.status).toBe(400)
  })

  it('rejects missing resolution field with 400/422', async () => {
    setAdminAuth()
    const { parent } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Sufficiently long reason but no resolution field.',
        }),
      },
    )
    expect([400, 422]).toContain(res.status)
  })

  it('rejects reason shorter than 10 chars with 400/422', async () => {
    setAdminAuth()
    const { parent } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ resolution: 'parent_wins', reason: 'short' }),
      },
    )
    expect([400, 422]).toContain(res.status)
  })

  it('returns 404 for an unknown contestId', async () => {
    setAdminAuth()
    const res = await app.request(
      '/v1/admin/contests/prices/00000000-0000-0000-0000-000000000000/resolve',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Original observation still holds.',
        }),
      },
    )
    expect(res.status).toBe(404)
  })

  it('parent_wins: parent → corroborated, counter → archived, event unchanged', async () => {
    setAdminAuth()
    const { event, parent, counter } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Original price still accurate per box-office confirmation.',
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { resolution: string; eventPriceUpdated: boolean }
    }
    expect(body.success).toBe(true)
    expect(body.data.resolution).toBe('parent_wins')
    expect(body.data.eventPriceUpdated).toBe(false)

    const parentAfter = await fetchSubmission(parent.id)
    const counterAfter = await fetchSubmission(counter.id)
    expect(parentAfter.status).toBe('corroborated')
    expect(counterAfter.status).toBe('archived')
    expect(counterAfter.archivedReason).toMatch(/box-office/i)

    // event row unchanged (still $40, community source)
    const eventAfter = await fetchEvent(event.id)
    expect(eventAfter.ticketPriceMin).toBe('40.00')
  })

  it('challenger_wins: counter → corroborated, parent → archived, event projection updated, +1 cred', async () => {
    setAdminAuth()
    const { event, parent, counter, challenger } = await seedContest()
    const credBefore = await fetchCred(challenger.userId)

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'challenger_wins',
          reason: 'Verified AXS face moved to $55 after openers announced.',
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { resolution: string; eventPriceUpdated: boolean }
    }
    expect(body.data.resolution).toBe('challenger_wins')
    expect(body.data.eventPriceUpdated).toBe(true)

    const parentAfter = await fetchSubmission(parent.id)
    const counterAfter = await fetchSubmission(counter.id)
    expect(parentAfter.status).toBe('archived')
    expect(parentAfter.archivedReason).toMatch(/AXS face moved/i)
    expect(counterAfter.status).toBe('corroborated')

    const eventAfter = await fetchEvent(event.id)
    expect(eventAfter.ticketPriceMin).toBe('55.00')
    expect(eventAfter.priceSource).toBe('community')

    const credAfter = await fetchCred(challenger.userId)
    expect(credAfter).toBe(credBefore + 1)
  })

  it('challenger_wins with event.priceSource=ticketmaster: does NOT overwrite event projection', async () => {
    setAdminAuth()
    const { event, parent, counter, challenger } = await seedContest({
      eventOverrides: {
        priceSource: 'ticketmaster',
        ticketPriceMin: '40',
        ticketPriceMax: '40',
      },
    })
    const credBefore = await fetchCred(challenger.userId)

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'challenger_wins',
          reason: 'Challenger price is correct but Ticketmaster is canonical.',
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { resolution: string; eventPriceUpdated: boolean }
    }
    // Status flips still happen (counter wins) but the events row is not
    // stomped because a non-community priceSource owns the headline.
    expect(body.data.eventPriceUpdated).toBe(false)

    const counterAfter = await fetchSubmission(counter.id)
    const parentAfter = await fetchSubmission(parent.id)
    expect(counterAfter.status).toBe('corroborated')
    expect(parentAfter.status).toBe('archived')

    const eventAfter = await fetchEvent(event.id)
    expect(eventAfter.ticketPriceMin).toBe('40.00')
    expect(eventAfter.priceSource).toBe('ticketmaster')

    // Cred still awarded — the slot winner deserves it regardless of which
    // source owns the projection.
    const credAfter = await fetchCred(challenger.userId)
    expect(credAfter).toBe(credBefore + 1)
  })

  it('clears lastAdminActionKind + lastAdminActionAt on both rows after resolve', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest({
      counterOverrides: {
        lastAdminActionKind: 'defer',
        lastAdminActionAt: new Date('2027-05-15T12:00:00Z'),
      },
    })

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'challenger_wins',
          reason: 'Verified counter price; closing the deferred contest.',
        }),
      },
    )
    expect(res.status).toBe(200)

    const parentAfter = await fetchSubmission(parent.id)
    const counterAfter = await fetchSubmission(counter.id)
    expect(parentAfter.lastAdminActionKind).toBeNull()
    expect(parentAfter.lastAdminActionAt).toBeNull()
    expect(counterAfter.lastAdminActionKind).toBeNull()
    expect(counterAfter.lastAdminActionAt).toBeNull()
  })

  it('returns 409 when the counter status is not pending (race: already resolved)', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()
    // Simulate concurrent resolution: another admin already archived the counter.
    await testDb
      .update(priceSubmissions)
      .set({ status: 'archived', archivedReason: 'race winner' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Should be rejected because counter already archived.',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBeTruthy()
  })

  it('returns 409 on slot mismatch (tier differs between parent and counter)', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()
    // Bypass the application code that locks counter slot to parent slot at
    // creation time — write a mismatched tier directly to reach the resolve
    // handler's same-slot assertion.
    await testDb
      .update(priceSubmissions)
      .set({ tier: 'VIP' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Tier mismatch — should be rejected.',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/tier/i)
  })

  it('archives orphaned pending counters against the same parent in the same transaction', async () => {
    setAdminAuth()
    const { event, parent, counter } = await seedContest()
    // Stage an orphaned second pending counter by inserting it as archived
    // (which the partial unique index does not constrain) and then flipping
    // it to pending after dropping the index. §4.6 calls out orphan cleanup
    // as a migration-window safety net — without the index drop the row is
    // dead-by-construction, but we still want to exercise the cleanup branch.
    const secondCounter = await seedPriceSubmission(event.id, 'orphan-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'archived',
      disputedSubmissionId: parent.id,
    })

    await testDb.execute(
      sql`DROP INDEX IF EXISTS price_submissions_pending_counter_unique_idx`,
    )
    try {
      await testDb
        .update(priceSubmissions)
        .set({ status: 'pending' })
        .where(eq(priceSubmissions.id, secondCounter.id))

      const res = await app.request(
        `/v1/admin/contests/prices/${parent.id}/resolve`,
        {
          method: 'POST',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({
            resolution: 'challenger_wins',
            reason: 'Original counter wins; orphan must be archived.',
          }),
        },
      )

      expect(res.status).toBe(200)
      const counterAfter = await fetchSubmission(counter.id)
      const orphanAfter = await fetchSubmission(secondCounter.id)
      expect(counterAfter.status).toBe('corroborated')
      expect(orphanAfter.status).toBe('archived')
      expect(orphanAfter.archivedReason).toMatch(/parent was archived/i)
    } finally {
      // Always restore the index — even if assertions above failed. If the
      // assertions failed mid-test, there may still be two pending counters
      // referencing the same parent; archive any pending rows for this parent
      // before recreating the partial unique index so the CREATE doesn't 23505.
      await testDb
        .update(priceSubmissions)
        .set({ status: 'archived', archivedReason: 'test cleanup' })
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, parent.id),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
      await testDb.execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_unique_idx
            ON price_submissions (disputed_submission_id)
            WHERE status = 'pending' AND disputed_submission_id IS NOT NULL`,
      )
    }
  })

  it('writes notification rows for parent + challenger submitters', async () => {
    setAdminAuth()
    const { parent, submitter, challenger } = await seedContest()

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'challenger_wins',
          reason: 'Counter wins — verified via box office.',
        }),
      },
    )
    expect(res.status).toBe(200)

    const notifs = await testDb
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'user_notification'))
    expect(notifs).toHaveLength(2)
    const userIds = new Set(notifs.map((row) => row.userId))
    expect(userIds.has(submitter.userId)).toBe(true)
    expect(userIds.has(challenger.userId)).toBe(true)
    for (const row of notifs) {
      expect(row.category).toBe('contest.resolved')
      // metadata is a JSON-encoded text column
      const parsed = JSON.parse(row.metadata ?? 'null') as {
        contestId: string
        resolution: string
      }
      expect(parsed.contestId).toBe(parent.id)
      expect(parsed.resolution).toBe('challenger_wins')
    }
  })

  it('dedupes notification rows when parent and challenger are the same user', async () => {
    setAdminAuth()
    // Seed contest with same user on both sides so the dedupe path executes.
    const venue = await seedVenue({
      name: 'Dedupe Venue',
      slug: `dedupe-venue-${Date.now()}`,
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-02',
      title: 'Dedupe Show',
      artist: 'Dedupe Artist',
      ticketPriceMin: '40',
      priceSource: 'community',
    })
    const sameUser = await seedUserProfile(`dedupe-u-${Date.now()}`, {
      handle: 'dedupe',
    })
    await seedUserRole(sameUser.userId, {
      role: 'user',
      grantedBy: 'system',
    })
    const parent = await seedPriceSubmission(event.id, sameUser.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    await seedPriceSubmission(event.id, sameUser.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Same-user contest — verifying dedupe of notifications.',
        }),
      },
    )
    expect(res.status).toBe(200)

    const notifs = await testDb
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'user_notification'),
          eq(notifications.userId, sameUser.userId),
        ),
      )
    expect(notifs).toHaveLength(1)
  })
})
