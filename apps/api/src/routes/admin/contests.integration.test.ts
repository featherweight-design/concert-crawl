import { describe, expect, it, beforeEach, vi } from 'vitest'

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

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserProfile,
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
