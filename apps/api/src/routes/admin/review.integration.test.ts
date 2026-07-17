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

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedVenue,
} from '../../test/helpers/seed.js'

const app = createApp()

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

const NON_ADMIN_HEADERS = {
  Authorization: 'Bearer fan-token',
  'Content-Type': 'application/json',
}

const setAdminAuth = () => {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const setNonAdminAuth = () => {
  authState.current = {
    userId: 'fan_user',
    sessionClaims: { metadata: { role: 'user' } },
  }
}

const clearAuth = () => {
  authState.current = null
}

describe('GET /v1/admin/review/counts', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns { eventFlags, prices, missing } in the expected shape', async () => {
    const venue = await seedVenue()
    // 2 unverified events — eventFlags should be 2
    await seedEvent(venue.id, {
      artist: 'Unverified 1',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
      verified: false,
    })
    await seedEvent(venue.id, {
      artist: 'Unverified 2',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-02',
      verified: false,
    })
    // 1 verified event — does not count toward eventFlags
    const verified = await seedEvent(venue.id, {
      artist: 'Verified',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-03',
      verified: true,
    })
    // 1 pending price submission — prices should be 1
    await seedPriceSubmission(verified.id, 'user-a', { status: 'pending' })
    // 1 corroborated submission — does not count toward prices
    await seedPriceSubmission(verified.id, 'user-b', {
      status: 'corroborated',
    })
    // 1 missing event (firstMissingAt + upcoming + future date) — missing should be 1
    await seedEvent(venue.id, {
      artist: 'Missing',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-04',
      status: 'upcoming',
      verified: true,
      firstMissingAt: new Date('2099-08-01T00:00:00Z'),
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        eventFlags: number
        prices: number
        missing: number
        priceContests: number
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.eventFlags).toBe(2)
    expect(body.data.prices).toBe(1)
    expect(body.data.missing).toBe(1)
    // No counter rows seeded above → priceContests should default to 0.
    expect(body.data.priceContests).toBe(0)
  })

  it('excludes past-dated missing events from the missing count', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Past Missing',
      supportingArtists: null,
      tourName: null,
      date: '2020-01-01',
      status: 'upcoming',
      verified: true,
      firstMissingAt: new Date('2019-12-01T00:00:00Z'),
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: { missing: number }
    }
    expect(body.data.missing).toBe(0)
  })

  // Regression for #709: pill must align with the /v1/admin/events?verified=false
  // list endpoint, which defaults to date >= today. Past-date unverified events
  // are stale and don't belong in the queue — they were what produced the
  // "257 pill / Queue clear UI" mismatch.
  it('excludes past-dated unverified events from the eventFlags count', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Old Unverified',
      supportingArtists: null,
      tourName: null,
      date: '2020-01-01',
      verified: false,
    })
    await seedEvent(venue.id, {
      artist: 'Future Unverified',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
      verified: false,
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: { eventFlags: number }
    }
    expect(body.data.eventFlags).toBe(1)
  })

  // Regression for #712: a non-concert event (hidden_from_consumer=true) that
  // also stops appearing in crawls would otherwise pollute the missing queue.
  // The admin-hidden marker is a triage decision — counting it as "missing
  // work" misrepresents the queue depth.
  it('excludes hidden_from_consumer events from the missing count', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Hidden Missing',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
      status: 'upcoming',
      verified: true,
      firstMissingAt: new Date('2099-08-01T00:00:00Z'),
      hiddenFromConsumer: true,
    })
    await seedEvent(venue.id, {
      artist: 'Visible Missing',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-02',
      status: 'upcoming',
      verified: true,
      firstMissingAt: new Date('2099-08-02T00:00:00Z'),
      hiddenFromConsumer: false,
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: { missing: number }
    }
    expect(body.data.missing).toBe(1)
  })

  // The priceContests pill counts open contests — pending counter rows
  // (status='pending' AND disputed_submission_id IS NOT NULL). MUST stay
  // lock-step with the GET /v1/admin/contests/prices list endpoint's WHERE
  // clause, otherwise the badge ("5 open") will disagree with the queue
  // table's row count.
  it('counts open price contests toward the priceContests pill', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-09-01',
      verified: true,
    })

    // Parent A — corroborated; will get an open counter.
    const parentA = await seedPriceSubmission(event.id, 'user-parent-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })
    // Parent B — disputed (handler flips parent.status when a counter lands);
    // will get an open counter.
    const parentB = await seedPriceSubmission(event.id, 'user-parent-b', {
      tier: 'VIP',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '120',
      status: 'disputed',
    })

    // 2 open counters → priceContests should be 2.
    await seedPriceSubmission(event.id, 'user-challenger-a', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parentA.id,
    })
    await seedPriceSubmission(event.id, 'user-challenger-b', {
      tier: 'VIP',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '140',
      status: 'pending',
      disputedSubmissionId: parentB.id,
    })

    // Resolved counter (archived) — does NOT count.
    const parentC = await seedPriceSubmission(event.id, 'user-parent-c', {
      tier: 'Pit',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '60',
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'user-challenger-c', {
      tier: 'Pit',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '75',
      status: 'archived',
      disputedSubmissionId: parentC.id,
    })

    // Deferred counter (lastAdminActionKind='defer') is still pending →
    // STILL counts. Defer is an engagement signal, not a state change.
    const parentD = await seedPriceSubmission(event.id, 'user-parent-d', {
      tier: 'Lawn',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '80',
      status: 'disputed',
    })
    await seedPriceSubmission(event.id, 'user-challenger-d', {
      tier: 'Lawn',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '95',
      status: 'pending',
      disputedSubmissionId: parentD.id,
      lastAdminActionKind: 'defer',
      lastAdminActionAt: new Date('2099-08-15T00:00:00Z'),
    })

    // Non-contest pending submission (disputed_submission_id IS NULL) — must
    // NOT count toward priceContests (it counts toward prices, separately).
    await seedPriceSubmission(event.id, 'user-non-contest', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '38',
      status: 'pending',
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { priceContests: number }
    }
    // 2 open + 1 deferred (still pending) = 3
    expect(body.data.priceContests).toBe(3)
  })

  it('returns priceContests: 0 when no contests are open', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-09-01',
      verified: true,
    })
    // Pending non-contest submissions exist, but no counter rows.
    await seedPriceSubmission(event.id, 'user-pending', { status: 'pending' })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: { priceContests: number }
    }
    expect(body.data.priceContests).toBe(0)
  })

  // Regression for #708: the pill counts pending submissions only and the
  // /v1/admin/prices/submissions list defaults to the same filter. Resolved
  // statuses (corroborated/disputed/stale) belong to history, not the queue.
  it('counts only pending price submissions toward the prices pill', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-09-01',
      verified: true,
    })
    await seedPriceSubmission(event.id, 'user-pending', { status: 'pending' })
    await seedPriceSubmission(event.id, 'user-corroborated', {
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'user-disputed', { status: 'disputed' })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: { prices: number }
    }
    expect(body.data.prices).toBe(1)
  })

  // R1-2 (PR #754): a pending counter row (status='pending' AND
  // disputed_submission_id IS NOT NULL) is a contest. It must count ONLY
  // toward `priceContests`, not `prices`. Before R1-2 the `prices` query
  // matched on status alone, so every counter was double-counted in BOTH
  // pills — the legacy queue would say "5 pending" while the dedicated
  // contest queue also said "5 open" for the same 5 rows.
  it('does not double-count contest counter rows between prices and priceContests', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-09-01',
      verified: true,
    })

    // 1 pending counter (counts toward priceContests, NOT prices)
    const parent = await seedPriceSubmission(event.id, 'user-parent', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'user-counter', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })

    // 1 non-contest pending row (counts toward prices, NOT priceContests)
    await seedPriceSubmission(event.id, 'user-plain', {
      status: 'pending',
      priceMin: '38',
    })

    const res = await app.request('/v1/admin/review/counts', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { prices: number; priceContests: number }
    }
    // Hard guarantee: each row counts in exactly one pill.
    expect(body.data.prices).toBe(1)
    expect(body.data.priceContests).toBe(1)
    // Sum = 2 total pending rows, NOT 3 (which would mean the counter
    // was double-counted).
    expect(body.data.prices + body.data.priceContests).toBe(2)
  })

  it('returns 403 for non-admin callers', async () => {
    setNonAdminAuth()
    const res = await app.request('/v1/admin/review/counts', {
      headers: NON_ADMIN_HEADERS,
    })
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    clearAuth()
    const res = await app.request('/v1/admin/review/counts')
    expect(res.status).toBe(401)
  })
})
