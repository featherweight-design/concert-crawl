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
