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
  userCred,
} from '@concert-crawl/db'
import { createApp } from '../../app.js'
import { testDb } from '../../test/helpers/db.js'
import {
  observeBlocking,
  openLockHolder,
  waitForLockWaiter,
} from '../../test/helpers/locks.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserCred,
  seedUserProfile,
  seedUserEvent,
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
            submitter: { userId: string | null; handle: string | null }
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
            submitter: { userId: string | null; handle: string | null }
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

  // #758 — sort=filed-at-desc reverses the default oldest-first order.
  it('sorts newest first when sort=filed-at-desc', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Desc Venue',
      slug: 'contest-desc-venue',
    })
    const eventA = await seedEvent(venue.id, {
      date: '2027-09-01',
      title: 'Desc Show A',
      artist: 'Desc Artist A',
    })
    const eventB = await seedEvent(venue.id, {
      date: '2027-09-02',
      title: 'Desc Show B',
      artist: 'Desc Artist B',
    })
    const parentA = await seedPriceSubmission(eventA.id, 'desc-parent-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    const parentB = await seedPriceSubmission(eventB.id, 'desc-parent-b', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '50',
      status: 'disputed',
    })
    await seedPriceSubmission(eventA.id, 'desc-chal-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parentA.id,
      createdAt: new Date('2027-01-01T00:00:00Z'),
    })
    await seedPriceSubmission(eventB.id, 'desc-chal-b', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parentB.id,
      createdAt: new Date('2027-02-01T00:00:00Z'),
    })

    const res = await app.request(
      '/v1/admin/contests/prices?sort=filed-at-desc',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { items: Array<{ contestId: string }> }
    }
    expect(body.data.items).toHaveLength(2)
    // Newest contest first
    expect(body.data.items[0]?.contestId).toBe(parentB.id)
    expect(body.data.items[1]?.contestId).toBe(parentA.id)
  })

  // #758 — includeArchived=true widens the scope from open contests
  // (pending counters) to all contest history; each row carries the
  // counter's actual status so the UI badge stays honest.
  it('surfaces non-pending counters with their status when includeArchived=true', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Archive Venue',
      slug: 'contest-archive-venue',
    })
    const eventA = await seedEvent(venue.id, {
      date: '2027-10-01',
      title: 'Archive Show A',
      artist: 'Archive Artist A',
    })
    const eventB = await seedEvent(venue.id, {
      date: '2027-10-02',
      title: 'Archive Show B',
      artist: 'Archive Artist B',
    })
    const parentA = await seedPriceSubmission(eventA.id, 'arch-parent-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    const parentB = await seedPriceSubmission(eventB.id, 'arch-parent-b', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '50',
      status: 'corroborated',
    })
    // Open contest — pending counter
    await seedPriceSubmission(eventA.id, 'arch-chal-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parentA.id,
      createdAt: new Date('2027-01-01T00:00:00Z'),
    })
    // Resolved contest — archived counter (parent won)
    const archivedCounter = await seedPriceSubmission(
      eventB.id,
      'arch-chal-b',
      {
        tier: 'GA',
        vendor: 'AXS',
        sourceCategory: 'standard',
        priceMin: '60',
        status: 'archived',
        disputedSubmissionId: parentB.id,
        createdAt: new Date('2027-02-01T00:00:00Z'),
      },
    )

    // Default scope excludes the archived counter and doesn't count it.
    const openRes = await app.request('/v1/admin/contests/prices', {
      headers: ADMIN_HEADERS,
    })
    expect(openRes.status).toBe(200)
    const openBody = (await openRes.json()) as {
      success: boolean
      data: {
        items: Array<{ contestId: string; counter: { status: string } }>
        total: number
      }
    }
    expect(openBody.data.items).toHaveLength(1)
    expect(openBody.data.items[0]?.contestId).toBe(parentA.id)
    expect(openBody.data.items[0]?.counter.status).toBe('pending')
    expect(openBody.data.total).toBe(1)

    // Widened scope surfaces both, with honest counter statuses.
    const allRes = await app.request(
      '/v1/admin/contests/prices?includeArchived=true',
      { headers: ADMIN_HEADERS },
    )
    expect(allRes.status).toBe(200)
    const allBody = (await allRes.json()) as {
      success: boolean
      data: {
        items: Array<{
          contestId: string
          counter: { id: string; status: string }
        }>
        total: number
      }
    }
    expect(allBody.data.items).toHaveLength(2)
    expect(allBody.data.total).toBe(2)
    expect(allBody.data.items[0]?.counter.status).toBe('pending')
    expect(allBody.data.items[1]?.counter.id).toBe(archivedCounter.id)
    expect(allBody.data.items[1]?.counter.status).toBe('archived')
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
          submitter: { userId: string | null; handle: string | null }
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
          submitter: { userId: string | null; handle: string | null }
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
        parent: { status: string; archivedReason: string | null }
        counter: { status: string; archivedReason: string | null }
      }
    }
    expect(body.data.parent.status).toBe('corroborated')
    expect(body.data.counter.status).toBe('archived')
    // G1 — archivedReason round-trips through the detail endpoint so
    // the AdminDisputePanel read-only banner can re-display the admin's
    // resolution rationale.
    expect(body.data.counter.archivedReason).toBe(
      'Original held — box-office confirmed.',
    )
    // Parent's archivedReason stays null because it was the corroborated
    // winner (only the loser carries an archive reason).
    expect(body.data.parent.archivedReason).toBeNull()
  })

  // R1-4: submitter.userId is a true `string | null` on the wire — not
  // coerced to '' when the column is null. The UI reads only `handle`
  // for rendering, but the wire stays honest with the DB column so
  // downstream consumers (audit views, future modlinks) can distinguish
  // anonymous-by-construction rows from real users.
  it('preserves submitter.userId as string for non-null rows (no coercion to empty string)', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'UserId Venue',
      slug: 'contest-detail-userid',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-05',
      title: 'UserId Show',
      artist: 'UserId Artist',
    })
    const parent = await seedPriceSubmission(event.id, 'auth_real_user', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    await seedPriceSubmission(event.id, 'auth_real_challenger', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })

    const res = await app.request(`/v1/admin/contests/prices/${parent.id}`, {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        parent: { submitter: { userId: string | null } }
        counter: { submitter: { userId: string | null } }
      }
    }
    expect(body.data.parent.submitter.userId).toBe('auth_real_user')
    expect(body.data.counter.submitter.userId).toBe('auth_real_challenger')
    // The wire value is a real string — NOT '' from a `?? ''` coalesce.
    expect(body.data.parent.submitter.userId).not.toBe('')
    expect(body.data.counter.submitter.userId).not.toBe('')
  })

  // R1-3 + R16: lastAdminActionKind is a free-text column at the DB layer;
  // the detail endpoint narrows it to `'defer' | null` via the shared helper
  // (apps/api/src/lib/last-admin-action.ts). Any value that isn't 'defer'
  // — including the empty string, a future internal kind, or stale data
  // — must map to null AND its paired lastAdminActionAt must collapse to
  // null too so consumers never see a half-populated pair partially leaking
  // a future admin action.
  it('narrows lastAdminActionKind to null AND pairs lastAdminActionAt to null for unrecognized values', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Narrow Venue',
      slug: 'contest-detail-narrow',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-06',
      title: 'Narrow Show',
      artist: 'Narrow Artist',
    })
    const parent = await seedPriceSubmission(event.id, 'narrow-parent-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'disputed',
    })
    const counter = await seedPriceSubmission(event.id, 'narrow-chal-u', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parent.id,
      lastAdminActionAt: new Date('2027-05-15T12:00:00Z'),
    })

    // Direct SQL write: simulate an unrecognized internal kind landing
    // in the column via a future migration / stale data. Bypass the
    // typed Drizzle insert path so we can write a value the type system
    // wouldn't normally allow. The lastAdminActionAt was seeded above as
    // a real timestamp — without the R16 paired-narrow, this would leak.
    await testDb.execute(
      sql`UPDATE price_submissions
          SET last_admin_action_kind = 'some_future_kind'
          WHERE id = ${counter.id}`,
    )

    const res = await app.request(`/v1/admin/contests/prices/${parent.id}`, {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        counter: {
          lastAdminActionKind: 'defer' | null
          lastAdminActionAt: string | null
        }
      }
    }
    expect(body.data.counter.lastAdminActionKind).toBeNull()
    // Paired: when kind narrows away an unrecognized value, the timestamp
    // must collapse to null too so the pair stays consistent.
    expect(body.data.counter.lastAdminActionAt).toBeNull()
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
    // Cred lives in user_cred (#1012). Seed starting balances so the dispute
    // award's upsert exercises its UPDATE branch (increment an existing row).
    const parentCred = await seedUserCred(submitter.userId, 5)
    const challengerCred = await seedUserCred(challenger.userId, 2)
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
      parentCredBefore: parentCred,
      challengerCredBefore: challengerCred,
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
      .select({ score: userCred.priceCredScore })
      .from(userCred)
      .where(eq(userCred.userId, userId))
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

  it('allows resolve when parent.sourceCategory is null and counter.sourceCategory is derived (R15 — legacy row)', async () => {
    // Legacy rows pre-PR-#651 have parent.sourceCategory = null. The counter-
    // creation routes inherit-or-derive a non-null value, so a strict !==
    // check would permanently lock these contests. Pin null-as-wildcard
    // semantics so a future refactor can't silently break the unlock.
    setAdminAuth()
    const { parent, counter } = await seedContest()
    // Seed the legacy shape: null parent, derived counter. Bypass the
    // seedContest defaults via raw insert/update so we are explicit about
    // null on the parent side.
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: null })
      .where(eq(priceSubmissions.id, parent.id))
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: 'standard' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'challenger_wins',
          reason: 'Legacy row — null parent source_category should not block.',
        }),
      },
    )
    expect(res.status).toBe(200)
  })

  it('returns 409 when BOTH parent.sourceCategory and counter.sourceCategory are non-null and mismatched (R15 — preserves safety invariant)', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()
    // Both sides explicitly non-null but different — the original same-slot
    // safety check must still fire.
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: 'standard' })
      .where(eq(priceSubmissions.id, parent.id))
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: 'resale' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/resolve`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution: 'parent_wins',
          reason: 'Source category mismatch — should be rejected.',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/source_category/i)
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
      // Reason text references the contest id (= parent.id) and uses
      // "Superseded by contest resolution" — accurate regardless of
      // which side won (parent_wins leaves the parent corroborated, so
      // the old "parent was archived" phrasing was wrong).
      expect(orphanAfter.archivedReason).toMatch(
        /Superseded by contest resolution/i,
      )
      expect(orphanAfter.archivedReason).toContain(parent.id)
      // R5-1: every status flip during resolve must clear engagement
      // signals so a previously-deferred row doesn't keep showing the
      // "Admin requested more info" pill after the contest closes.
      expect(orphanAfter.lastAdminActionKind).toBeNull()
      expect(orphanAfter.lastAdminActionAt).toBeNull()
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

  describe('watch.pricedrop fan-out (#1107)', () => {
    const resolve = async (
      contestId: string,
      resolution: 'parent_wins' | 'challenger_wins',
    ): Promise<Response> =>
      app.request(`/v1/admin/contests/prices/${contestId}/resolve`, {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          resolution,
          reason: 'Verified the face value against the vendor listing.',
        }),
      })

    const pricedropRows = async (): Promise<
      { userId: string; title: string; body: string | null }[]
    > =>
      testDb
        .select({
          userId: notifications.userId,
          title: notifications.title,
          body: notifications.body,
        })
        .from(notifications)
        .where(eq(notifications.category, 'watch.pricedrop'))

    it('challenger_wins with a strictly lower price fires one watch.pricedrop per watcher', async () => {
      setAdminAuth()
      const { event, parent } = await seedContest({
        counterOverrides: { priceMin: '30', priceMax: '30' },
      })
      const WATCHER = 'user_contest_drop_watcher'
      await seedUserEvent(WATCHER, event.id, { status: 'watching' })
      await seedUserEvent('user_contest_drop_going', event.id, {
        status: 'going',
      })
      await seedUserEvent('user_contest_drop_interested', event.id, {
        status: 'interested',
      })

      const res = await resolve(parent.id, 'challenger_wins')
      expect(res.status).toBe(200)

      const eventAfter = await fetchEvent(event.id)
      expect(eventAfter.ticketPriceMin).toBe('30.00')

      const rows = await pricedropRows()
      expect(rows.map((row) => row.userId)).toEqual([WATCHER])
      expect(rows[0]?.title).toMatch(/\$30/)
      expect(rows[0]?.body).toMatch(/\$40/)
    })

    it('challenger_wins with an equal price does not fire', async () => {
      setAdminAuth()
      const { event, parent } = await seedContest({
        counterOverrides: { priceMin: '40', priceMax: '45' },
      })
      await seedUserEvent('user_contest_equal_watcher', event.id, {
        status: 'watching',
      })

      const res = await resolve(parent.id, 'challenger_wins')
      expect(res.status).toBe(200)
      expect(await pricedropRows()).toHaveLength(0)
    })

    it('challenger_wins with a higher price does not fire', async () => {
      setAdminAuth()
      // Default counter is $55 against the event's $40.
      const { event, parent } = await seedContest()
      await seedUserEvent('user_contest_higher_watcher', event.id, {
        status: 'watching',
      })

      const res = await resolve(parent.id, 'challenger_wins')
      expect(res.status).toBe(200)
      expect(await pricedropRows()).toHaveLength(0)
    })

    it('challenger_wins does not fire when the event had no previous price', async () => {
      setAdminAuth()
      const { event, parent } = await seedContest({
        eventOverrides: {
          ticketPriceMin: null,
          ticketPriceMax: null,
          priceSource: null,
        },
        counterOverrides: { priceMin: '30', priceMax: '30' },
      })
      await seedUserEvent('user_contest_first_watcher', event.id, {
        status: 'watching',
      })

      const res = await resolve(parent.id, 'challenger_wins')
      expect(res.status).toBe(200)

      const eventAfter = await fetchEvent(event.id)
      expect(eventAfter.ticketPriceMin).toBe('30.00')
      expect(await pricedropRows()).toHaveLength(0)
    })

    it('parent_wins never fires, even when the counter was lower', async () => {
      setAdminAuth()
      const { event, parent } = await seedContest({
        counterOverrides: { priceMin: '30', priceMax: '30' },
      })
      await seedUserEvent('user_contest_parent_watcher', event.id, {
        status: 'watching',
      })

      const res = await resolve(parent.id, 'parent_wins')
      expect(res.status).toBe(200)
      expect(await pricedropRows()).toHaveLength(0)
    })

    it('challenger_wins is not blocked by a foreign-key KEY SHARE lock on the event', async () => {
      setAdminAuth()
      const { event, parent } = await seedContest({
        counterOverrides: { priceMin: '30', priceMax: '30' },
      })
      const holder = await openLockHolder([
        sql`SELECT id FROM events WHERE id = ${event.id} FOR KEY SHARE`,
      ])
      const { blocked, result } = await observeBlocking(() =>
        resolve(parent.id, 'challenger_wins'),
      )
      await holder.release()
      const res = await result
      expect(blocked).toBe(false)
      expect(res.status).toBe(200)
    })

    it('challenger_wins does not hold the event lock while waiting on the box-office unique index (deadlock guard)', async () => {
      // A concurrent writer is corroborating another box-office row for the
      // same event/tier: it holds that unique-index entry uncommitted and
      // will next lock the event. Resolution must take its submission
      // updates (which wait on that index entry) BEFORE locking the event,
      // or the writer's event lock waits on us while we wait on it.
      setAdminAuth()
      const { event, parent } = await seedContest({
        parentOverrides: { sourceCategory: 'boxoffice' },
        counterOverrides: {
          sourceCategory: 'boxoffice',
          priceMin: '30',
          priceMax: '30',
        },
      })
      const rival = await seedPriceSubmission(event.id, 'user_contest_rival', {
        tier: 'GA',
        vendor: 'AXS',
        sourceCategory: 'boxoffice',
        priceMin: '35',
        status: 'pending',
      })
      const writer = await openLockHolder([
        sql`UPDATE price_submissions SET status = 'corroborated' WHERE id = ${rival.id}`,
      ])
      const request = resolve(parent.id, 'challenger_wins')
      // The resolution is now waiting on the rival's index entry.
      await waitForLockWaiter()

      let writerLockError: unknown
      try {
        await writer.run(sql`SET LOCAL lock_timeout = '30s'`)
        await writer.run(
          sql`SELECT id FROM events WHERE id = ${event.id} FOR NO KEY UPDATE`,
        )
      } catch (err) {
        writerLockError = err
      }
      // Roll the rival back so the resolution's promotion can proceed.
      await writer.release()
      const res = await request

      expect(writerLockError).toBeUndefined()
      expect(res.status).toBe(200)
      expect((await fetchEvent(event.id)).ticketPriceMin).toBe('30.00')
    })

    it('challenger_wins awards cred before locking the event (deadlock guard)', async () => {
      // A concurrent admin approval for the same challenger holds their
      // user_cred row (awardPriceCred) and will next lock the event. If the
      // resolution locked the event before awarding cred, each would wait on
      // the other. Global order: submissions, then user_cred, then events.
      setAdminAuth()
      const { event, parent, challenger } = await seedContest({
        counterOverrides: { priceMin: '30', priceMax: '30' },
      })
      const writer = await openLockHolder([
        sql`UPDATE user_cred SET price_cred_score = price_cred_score + 1 WHERE user_id = ${challenger.userId}`,
      ])
      const request = resolve(parent.id, 'challenger_wins')
      // The resolution is now waiting on the challenger's user_cred row.
      await waitForLockWaiter()

      let writerLockError: unknown
      try {
        await writer.run(sql`SET LOCAL lock_timeout = '30s'`)
        await writer.run(
          sql`SELECT id FROM events WHERE id = ${event.id} FOR NO KEY UPDATE`,
        )
      } catch (err) {
        writerLockError = err
      }
      await writer.release()
      const res = await request

      expect(writerLockError).toBeUndefined()
      expect(res.status).toBe(200)
      expect((await fetchEvent(event.id)).ticketPriceMin).toBe('30.00')
    })

    it('challenger_wins on a non-community priceSource does not fire', async () => {
      setAdminAuth()
      const { event, parent } = await seedContest({
        eventOverrides: { priceSource: 'ticketmaster' },
        counterOverrides: { priceMin: '30', priceMax: '30' },
      })
      await seedUserEvent('user_contest_tm_watcher', event.id, {
        status: 'watching',
      })

      const res = await resolve(parent.id, 'challenger_wins')
      expect(res.status).toBe(200)

      const eventAfter = await fetchEvent(event.id)
      expect(eventAfter.ticketPriceMin).toBe('40.00')
      expect(await pricedropRows()).toHaveLength(0)
    })
  })
})

describe('POST /v1/admin/contests/prices/:contestId/defer', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
    // notifications is NOT in the shared clearTables TRUNCATE list. Wipe it
    // here so per-test assertions about row counts aren't contaminated by
    // rows from previous tests (same pattern as the resolve block above).
    await testDb.delete(notifications)
  })

  // Mirror of the resolve block's seedContest helper. Defer doesn't propagate
  // to the events row or cred, so eventOverrides default is fine; the key
  // bits are the parent (disputed) + counter (pending) pair.
  const seedContest = async (
    options: {
      eventOverrides?: Partial<typeof events.$inferInsert>
      counterOverrides?: Partial<typeof priceSubmissions.$inferInsert>
      parentOverrides?: Partial<typeof priceSubmissions.$inferInsert>
    } = {},
  ) => {
    const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
    const venue = await seedVenue({
      name: 'Defer Venue',
      slug: `defer-venue-${uniq}`,
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      title: `Defer Show ${uniq}`,
      artist: `Defer Artist ${uniq}`,
      ticketPriceMin: '40',
      ticketPriceMax: '40',
      priceSource: 'community',
      ...options.eventOverrides,
    })
    const submitter = await seedUserProfile(`defer-parent-${uniq}`, {
      handle: `parent-${uniq}`,
    })
    const challenger = await seedUserProfile(`defer-chal-${uniq}`, {
      handle: `chal-${uniq}`,
    })
    await seedUserCred(submitter.userId, 5)
    await seedUserCred(challenger.userId, 2)
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
      .select({ score: userCred.priceCredScore })
      .from(userCred)
      .where(eq(userCred.userId, userId))
      .limit(1)
    return row?.score ?? 0
  }

  it('requires admin auth', async () => {
    const { parent } = await seedContest()

    // Unauthed
    const unauthRes = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Need ticket URL screenshot to verify the new price.',
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
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Need ticket URL screenshot to verify the new price.',
        }),
      },
    )
    expect([401, 403]).toContain(nonAdminRes.status)
  })

  it('rejects missing reason field with 400/422', async () => {
    setAdminAuth()
    const { parent } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({}),
      },
    )
    expect([400, 422]).toContain(res.status)
  })

  it('rejects reason shorter than 10 chars with 400/422', async () => {
    setAdminAuth()
    const { parent } = await seedContest()
    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ reason: 'too short' }),
      },
    )
    expect([400, 422]).toContain(res.status)
  })

  it('returns 404 for an unknown contestId', async () => {
    setAdminAuth()
    const res = await app.request(
      '/v1/admin/contests/prices/00000000-0000-0000-0000-000000000000/defer',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Need ticket URL screenshot to verify the new price.',
        }),
      },
    )
    expect(res.status).toBe(404)
  })

  it('sets lastAdminActionKind=defer + lastAdminActionAt on the counter row; leaves statuses unchanged', async () => {
    setAdminAuth()
    const beforeCall = Date.now()
    const { event, parent, counter } = await seedContest()
    // R5-2: capture counter's updatedAt BEFORE the defer call so we can
    // assert the handler bumped it. Every other UPDATE in this file sets
    // updatedAt=now() — defer must too or the row's "last updated"
    // timestamp lags behind the action.
    const counterBefore = await fetchSubmission(counter.id)

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Need ticket URL screenshot to verify the new price.',
        }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        contestId: string
        deferredAt: string
        deferReason: string
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.contestId).toBe(parent.id)
    expect(body.data.deferReason).toMatch(/ticket URL screenshot/i)
    expect(body.data.deferredAt).toBeTruthy()
    const deferredAtMs = new Date(body.data.deferredAt).getTime()
    expect(deferredAtMs).toBeGreaterThanOrEqual(beforeCall - 1000)
    expect(deferredAtMs).toBeLessThanOrEqual(Date.now() + 1000)

    // Counter: engagement-signal fields set, status untouched.
    const counterAfter = await fetchSubmission(counter.id)
    expect(counterAfter.status).toBe('pending')
    expect(counterAfter.lastAdminActionKind).toBe('defer')
    expect(counterAfter.lastAdminActionAt).not.toBeNull()
    // R5-2: updatedAt bumped to match the action. Use a strictly-greater
    // comparison against the pre-call updatedAt rather than a NOW()-window
    // check to dodge any clock skew between the test runner and Postgres.
    expect(new Date(counterAfter.updatedAt).getTime()).toBeGreaterThan(
      new Date(counterBefore.updatedAt).getTime(),
    )

    // Parent: completely untouched (status still disputed; no engagement
    // fields set on the parent — those live on the counter per spec §4.5).
    const parentAfter = await fetchSubmission(parent.id)
    expect(parentAfter.status).toBe('disputed')
    expect(parentAfter.lastAdminActionKind).toBeNull()
    expect(parentAfter.lastAdminActionAt).toBeNull()

    // Event projection untouched.
    const eventAfter = await fetchEvent(event.id)
    expect(eventAfter.ticketPriceMin).toBe('40.00')
    expect(eventAfter.priceSource).toBe('community')
  })

  it('does NOT award cred to either submitter', async () => {
    setAdminAuth()
    const { parent, submitter, challenger } = await seedContest()
    const submitterCredBefore = await fetchCred(submitter.userId)
    const challengerCredBefore = await fetchCred(challenger.userId)

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Need ticket URL screenshot to verify the new price.',
        }),
      },
    )
    expect(res.status).toBe(200)

    const submitterCredAfter = await fetchCred(submitter.userId)
    const challengerCredAfter = await fetchCred(challenger.userId)
    expect(submitterCredAfter).toBe(submitterCredBefore)
    expect(challengerCredAfter).toBe(challengerCredBefore)
  })

  it('writes 2 notification rows (parent + challenger submitters) with kind=defer', async () => {
    setAdminAuth()
    const { parent, submitter, challenger } = await seedContest()

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Need vendor screenshot to confirm the new price.',
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
      // Inline fan-out uses kind:'defer' in metadata so Task 10 can extract
      // the helper without changing the wire shape. category column on this
      // path is not asserted here — Task 10 will lock it.
      const parsed = JSON.parse(row.metadata ?? 'null') as {
        contestId: string
        kind: string
        reason: string
      }
      expect(parsed.contestId).toBe(parent.id)
      expect(parsed.kind).toBe('defer')
      expect(parsed.reason).toMatch(/vendor screenshot/i)
    }
  })

  it('dedupes notification rows when parent and challenger are the same user', async () => {
    setAdminAuth()
    const venue = await seedVenue({
      name: 'Defer Dedupe Venue',
      slug: `defer-dedupe-venue-${Date.now()}`,
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-02',
      title: 'Defer Dedupe Show',
      artist: 'Defer Dedupe Artist',
      ticketPriceMin: '40',
      priceSource: 'community',
    })
    const sameUser = await seedUserProfile(`defer-dedupe-u-${Date.now()}`, {
      handle: 'defer-dedupe',
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
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Same-user defer — verifying notification dedupe.',
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

  it('returns 409 when no pending counter exists (race: counter already archived)', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()
    // Simulate concurrent state change: another admin already archived the
    // counter (resolve raced ahead of this defer click).
    await testDb
      .update(priceSubmissions)
      .set({ status: 'archived', archivedReason: 'race winner' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Should be rejected because counter already archived.',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      success: boolean
      error: string
      code?: string
    }
    expect(body.success).toBe(false)
    expect(body.code).toBe('precondition_failed')
  })

  it('returns 409 on slot mismatch (tier differs between parent and counter)', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()
    // Same defensive same-slot assertion the resolve handler has — bypass
    // creation-time slot locking by directly writing a mismatched tier.
    await testDb
      .update(priceSubmissions)
      .set({ tier: 'VIP' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Tier mismatch — should be rejected.',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      success: boolean
      error: string
      code?: string
    }
    expect(body.success).toBe(false)
    expect(body.code).toBe('precondition_failed')
    expect(body.error).toMatch(/tier/i)
  })

  it('allows defer when parent.sourceCategory is null and counter.sourceCategory is derived (R15 — legacy row)', async () => {
    // Legacy rows pre-PR-#651 have parent.sourceCategory = null. The counter-
    // creation routes inherit-or-derive a non-null value, so a strict !==
    // check would permanently lock these contests at the defer assertion.
    setAdminAuth()
    const { parent, counter } = await seedContest()
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: null })
      .where(eq(priceSubmissions.id, parent.id))
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: 'standard' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason:
            'Legacy row — null parent source_category should not block defer.',
        }),
      },
    )
    expect(res.status).toBe(200)
  })

  it('returns 409 on defer when BOTH parent.sourceCategory and counter.sourceCategory are non-null and mismatched (R15 — preserves safety invariant)', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: 'standard' })
      .where(eq(priceSubmissions.id, parent.id))
    await testDb
      .update(priceSubmissions)
      .set({ sourceCategory: 'resale' })
      .where(eq(priceSubmissions.id, counter.id))

    const res = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Source category mismatch — should be rejected.',
        }),
      },
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      success: boolean
      error: string
      code?: string
    }
    expect(body.success).toBe(false)
    expect(body.code).toBe('precondition_failed')
    expect(body.error).toMatch(/source_category/i)
  })

  it('allows multiple defers in sequence; lastAdminActionAt advances', async () => {
    setAdminAuth()
    const { parent, counter } = await seedContest()

    const firstRes = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'First defer — initial info request.',
        }),
      },
    )
    expect(firstRes.status).toBe(200)
    const firstCounter = await fetchSubmission(counter.id)
    expect(firstCounter.lastAdminActionKind).toBe('defer')
    expect(firstCounter.lastAdminActionAt).not.toBeNull()
    const firstAt = firstCounter.lastAdminActionAt as Date

    // Sleep briefly so the second NOW() is strictly after the first.
    await new Promise((resolve) => setTimeout(resolve, 50))

    const secondRes = await app.request(
      `/v1/admin/contests/prices/${parent.id}/defer`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          reason: 'Second defer — still need more info.',
        }),
      },
    )
    expect(secondRes.status).toBe(200)
    const secondCounter = await fetchSubmission(counter.id)
    expect(secondCounter.lastAdminActionKind).toBe('defer')
    expect(secondCounter.lastAdminActionAt).not.toBeNull()
    const secondAt = secondCounter.lastAdminActionAt as Date
    expect(secondAt.getTime()).toBeGreaterThan(firstAt.getTime())

    // Statuses still unchanged after two defers.
    expect(secondCounter.status).toBe('pending')
    const parentAfter = await fetchSubmission(parent.id)
    expect(parentAfter.status).toBe('disputed')
  })
})
