import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { userRoles } from '@concert-crawl/db'

vi.mock('@sentry/hono/node', async () => {
  const actual =
    await vi.importActual<typeof import('@sentry/hono/node')>(
      '@sentry/hono/node',
    )
  return {
    ...actual,
    captureMessage: vi.fn(),
  }
})

import * as Sentry from '@sentry/hono/node'

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

// Prevent the async price pipeline from escaping into adjacent tests and
// causing TRUNCATE/INSERT deadlocks. The pipeline's correctness is covered
// by packages/price-pipeline unit tests.
vi.mock('@concert-crawl/price-pipeline', () => ({
  runPricePipeline: vi.fn().mockResolvedValue(undefined),
}))

import { createApp } from '../../app.js'
import {
  clearTables,
  seedEvent,
  seedPriceRetrievalLog,
  seedPriceSubmission,
  seedUserRole,
  seedVenue,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'

const app = createApp()

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

describe('GET /v1/admin/prices/activity', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns expected fields for each row', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-06-15' })
    await seedPriceRetrievalLog(event.id, venue.id, {
      source: 'ticketmaster',
      outcome: 'miss',
      latencyMs: 42,
    })

    const res = await app.request('/v1/admin/prices/activity', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{
        eventId: string
        eventTitle: string | null
        venueName: string | null
        date: string
        source: string
        outcome: string
        latencyMs: number
        attemptedAt: string
      }>
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    const row = body.data[0]
    expect(row?.eventId).toBe(event.id)
    expect(row?.source).toBe('ticketmaster')
    expect(row?.outcome).toBe('miss')
    expect(row?.latencyMs).toBe(42)
    expect(row?.attemptedAt).toBeDefined()
  })

  it('orders rows by event date ascending then attempt time descending', async () => {
    const venue = await seedVenue()
    const near = await seedEvent(venue.id, { date: '2026-06-01' })
    const far = await seedEvent(venue.id, { date: '2026-12-01' })
    await seedPriceRetrievalLog(far.id, venue.id, {
      source: 'seatgeek',
      outcome: 'miss',
      latencyMs: 0,
    })
    await seedPriceRetrievalLog(near.id, venue.id, {
      source: 'ticketmaster',
      outcome: 'hit',
      latencyMs: 50,
    })

    const res = await app.request('/v1/admin/prices/activity', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ eventId: string }>
    }
    expect(body.data[0]?.eventId).toBe(near.id)
    expect(body.data[1]?.eventId).toBe(far.id)
  })
})

describe('GET /v1/admin/prices/health', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns pipeline health stats', async () => {
    const res = await app.request('/v1/admin/prices/health', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { stats: unknown[] }
    }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.stats)).toBe(true)
  })
})

describe('GET /v1/admin/prices/log', () => {
  beforeEach(() => {
    setAdminAuth()
  })

  it('returns last retrieval attempts', async () => {
    const res = await app.request('/v1/admin/prices/log', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('POST /v1/admin/prices/pipeline/:eventId', () => {
  beforeEach(() => {
    setAdminAuth()
  })

  it('returns 202 and starts pipeline for existing event', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/prices/pipeline/${event.id}`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(202)
    const body = (await res.json()) as {
      success: boolean
      data: { eventId: string }
    }
    expect(body.data.eventId).toBe(event.id)
  })

  it('returns 404 for unknown event', async () => {
    const res = await app.request(
      '/v1/admin/prices/pipeline/00000000-0000-0000-0000-000000000000',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
      },
    )
    expect(res.status).toBe(404)
  })
})

describe('PATCH /v1/admin/prices/submissions/:id', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('increments priceCredScore when transitioning pending → corroborated', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const userId = 'user_cred_test'
    await seedUserRole(userId)
    const submission = await seedPriceSubmission(event.id, userId)

    const res = await app.request(
      `/v1/admin/prices/submissions/${submission.id}`,
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    )
    expect(res.status).toBe(200)

    const [role] = await testDb
      .select({ priceCredScore: userRoles.priceCredScore })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1)
    expect(role?.priceCredScore).toBe(1)
  })

  it('does not double-increment when status is already corroborated', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const userId = 'user_no_double'
    await seedUserRole(userId)
    const submission = await seedPriceSubmission(event.id, userId, {
      status: 'corroborated',
    })

    const res = await app.request(
      `/v1/admin/prices/submissions/${submission.id}`,
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    )
    expect(res.status).toBe(200)

    const [role] = await testDb
      .select({ priceCredScore: userRoles.priceCredScore })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1)
    expect(role?.priceCredScore).toBe(0)
  })

  it('does not increment for anonymous submissions (null userId)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const submission = await seedPriceSubmission(event.id, 'placeholder', {
      userId: null,
    })

    const res = await app.request(
      `/v1/admin/prices/submissions/${submission.id}`,
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('returns 404 for missing submission', async () => {
    const res = await app.request(
      '/v1/admin/prices/submissions/00000000-0000-0000-0000-000000000000',
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    )
    expect(res.status).toBe(404)
  })

  // Defensive lockout — see spec §4.7 + §11.3 and plan Task 4.
  // The pre-contest-UI PATCH endpoint cannot be allowed to overturn a
  // corroborated price by silently approving a counter row, and cannot be
  // allowed to mutate a parent whose status is already 'disputed'. Both
  // cases must return 409 and fire a loud Sentry capture so the
  // `endpoint_lockout: contest_row` tag baseline can be alerted on.
  describe('contest-row lockout', () => {
    beforeEach(() => {
      vi.mocked(Sentry.captureMessage).mockClear()
    })

    it('rejects PATCH on a counter row (disputedSubmissionId !== null) with 409', async () => {
      const venue = await seedVenue({
        name: 'PATCH Lockout',
        slug: 'patch-lockout-1',
      })
      const event = await seedEvent(venue.id, { date: '2027-06-01' })
      const parent = await seedPriceSubmission(event.id, 'parent-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'corroborated',
      })
      const counter = await seedPriceSubmission(event.id, 'challenger-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '50',
        status: 'pending',
        disputedSubmissionId: parent.id,
      })

      const res = await app.request(
        `/v1/admin/prices/submissions/${counter.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      )

      expect(res.status).toBe(409)
      const body = (await res.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
      expect(body.error).toMatch(/contest/i)
      expect(body.error).toMatch(/\/v1\/admin\/contests\/prices/)

      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
      const [, options] = vi.mocked(Sentry.captureMessage).mock.calls[0] ?? []
      expect(options).toMatchObject({
        level: 'warning',
        tags: { endpoint_lockout: 'contest_row' },
      })
    })

    it('rejects PATCH on a parent row whose status is disputed with 409', async () => {
      const venue = await seedVenue({
        name: 'PATCH Lockout 2',
        slug: 'patch-lockout-2',
      })
      const event = await seedEvent(venue.id, { date: '2027-06-01' })
      const parent = await seedPriceSubmission(event.id, 'parent-user-2', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'disputed',
      })

      const res = await app.request(
        `/v1/admin/prices/submissions/${parent.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      )

      expect(res.status).toBe(409)
      const body = (await res.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
      expect(body.error).toMatch(/contest/i)

      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
      const [, options] = vi.mocked(Sentry.captureMessage).mock.calls[0] ?? []
      expect(options).toMatchObject({
        level: 'warning',
        tags: { endpoint_lockout: 'contest_row' },
      })
    })

    it('still accepts PATCH on a non-contest pending row (regression)', async () => {
      const venue = await seedVenue({ name: 'PATCH OK', slug: 'patch-ok' })
      const event = await seedEvent(venue.id, { date: '2027-06-01' })
      const submission = await seedPriceSubmission(event.id, 'plain-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'pending',
      })

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      )
      expect(res.status).toBe(200)
      expect(Sentry.captureMessage).not.toHaveBeenCalled()
    })
  })
})

describe('GET /v1/admin/prices/events', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns only missing-price events by default', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })
    await seedEvent(venue.id, {
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: '25.00',
    })

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].priceMin).toBeNull()
  })

  it('returns all upcoming events when missingOnly=false', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })
    await seedEvent(venue.id, {
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: '25.00',
    })

    const res = await app.request('/v1/admin/prices/events?missingOnly=false', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
  })

  it('respects limit and offset', async () => {
    const venue = await seedVenue()
    for (let idx = 1; idx <= 5; idx++) {
      await seedEvent(venue.id, {
        date: `2099-07-0${idx}`,
        status: 'upcoming',
        ticketPriceMin: null,
      })
    }

    const res = await app.request(
      '/v1/admin/prices/events?missingOnly=true&limit=2&offset=2',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].date).toBe('2099-07-03')
    expect(body.data[1].date).toBe('2099-07-04')
  })

  it('excludes past events', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      date: '2020-01-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })
    await seedEvent(venue.id, {
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    })

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    })
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].date).toBe('2099-07-01')
  })

  // Regression for #732: an event marked non-concert
  // (hidden_from_consumer=true) without a ticket price would otherwise
  // appear in the missing-price queue forever — the admin already
  // triaged it, it's not actionable. Same fix pattern as #712 applied
  // to the Missing tab.
  it('excludes hidden_from_consumer events from missing-price list', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Visible Concert',
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    })
    await seedEvent(venue.id, {
      artist: 'Hidden Non-Concert',
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: true,
    })

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    })
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].eventTitle).toBeDefined()
    // Visible Concert seeded as artist; default title is 'Test Show'.
    expect(body.data[0].artist).toBe('Visible Concert')
  })

  it('excludes hidden_from_consumer events when missingOnly=false too', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Visible',
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: '25.00',
      hiddenFromConsumer: false,
    })
    await seedEvent(venue.id, {
      artist: 'Hidden',
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: '30.00',
      hiddenFromConsumer: true,
    })

    const res = await app.request('/v1/admin/prices/events?missingOnly=false', {
      headers: ADMIN_HEADERS,
    })
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].artist).toBe('Visible')
  })

  // The admin UI fetches this surface via ?count=true (see
  // use-admin-review.ts). Pin the hidden filter on the counted shape
  // too — a future regression that applied the filter to rows but not
  // to the count(*) would otherwise slip past the array-shape test
  // above.
  it('excludes hidden_from_consumer from both rows AND total when count=true', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Visible Missing 1',
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    })
    await seedEvent(venue.id, {
      artist: 'Visible Missing 2',
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    })
    await seedEvent(venue.id, {
      artist: 'Hidden Missing',
      date: '2099-07-03',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: true,
    })

    const res = await app.request(
      '/v1/admin/prices/events?count=true&limit=10&offset=0',
      { headers: ADMIN_HEADERS },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { rows: { artist: string }[]; total: number }
    }
    expect(body.data.rows).toHaveLength(2)
    expect(body.data.total).toBe(2)
    expect(body.data.rows.map((row) => row.artist)).not.toContain(
      'Hidden Missing',
    )
  })
})

describe('GET /v1/admin/prices/coverage', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  // Regression for #732: coverage % was deflated by admin-hidden
  // non-concerts (counted as upcoming events that "lack" prices). The
  // metric should reflect only the events that actually need price
  // coverage. Also enforces date >= today (parity with /prices/events)
  // since status='upcoming' alone can persist on stale past rows.
  it('excludes hidden_from_consumer and past dates from total and withPrice counts', async () => {
    const venue = await seedVenue()
    // 2 visible upcoming, 1 with price → coverage 1/2 = 50%
    await seedEvent(venue.id, {
      artist: 'Visible With Price',
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: '25.00',
      hiddenFromConsumer: false,
    })
    await seedEvent(venue.id, {
      artist: 'Visible Missing Price',
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    })
    // 1 hidden non-concert with price (should NOT count toward either)
    await seedEvent(venue.id, {
      artist: 'Hidden Non-Concert',
      date: '2099-07-03',
      status: 'upcoming',
      ticketPriceMin: '20.00',
      hiddenFromConsumer: true,
    })
    // 1 past-date row still marked upcoming (should NOT count — parity
    // with /prices/events which enforces date >= today)
    await seedEvent(venue.id, {
      artist: 'Past Stale',
      date: '2020-01-01',
      status: 'upcoming',
      ticketPriceMin: '15.00',
      hiddenFromConsumer: false,
    })

    const res = await app.request('/v1/admin/prices/coverage', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.total).toBe(2)
    expect(body.data.withPrice).toBe(1)
    expect(body.data.pct).toBe(50)
  })
})

describe('GET /v1/admin/prices/events?count=true', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns { rows, total } with total ignoring limit/offset', async () => {
    const venue = await seedVenue()
    for (let idx = 0; idx < 4; idx++) {
      await seedEvent(venue.id, {
        artist: `Artist ${idx}`,
        date: `2099-08-0${idx + 1}`,
        status: 'upcoming',
        ticketPriceMin: null,
      })
    }

    const res = await app.request(
      '/v1/admin/prices/events?count=true&limit=2&offset=0',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { rows: { eventId: string }[]; total: number }
    }
    expect(body.data.rows.length).toBe(2)
    expect(body.data.total).toBe(4)
  })

  it('keeps legacy array shape when count is omitted', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Solo',
      date: '2099-08-15',
      status: 'upcoming',
      ticketPriceMin: null,
    })

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { success: boolean; data: unknown }
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('applies missingOnly to both rows and total', async () => {
    const venue = await seedVenue()
    // 2 with price, 1 without — missingOnly=true should count only 1.
    await seedEvent(venue.id, {
      artist: 'Priced 1',
      date: '2099-09-01',
      status: 'upcoming',
      ticketPriceMin: '30',
    })
    await seedEvent(venue.id, {
      artist: 'Priced 2',
      date: '2099-09-02',
      status: 'upcoming',
      ticketPriceMin: '40',
    })
    await seedEvent(venue.id, {
      artist: 'Missing',
      date: '2099-09-03',
      status: 'upcoming',
      ticketPriceMin: null,
    })

    const res = await app.request(
      '/v1/admin/prices/events?count=true&missingOnly=true&limit=10',
      { headers: ADMIN_HEADERS },
    )
    const body = (await res.json()) as {
      data: { rows: { eventId: string }[]; total: number }
    }
    expect(body.data.rows.length).toBe(1)
    expect(body.data.total).toBe(1)
  })
})

describe('GET /v1/admin/prices/submissions?count=true', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns { rows, total } with total ignoring limit/offset', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2099-10-01' })
    for (let idx = 0; idx < 3; idx++) {
      await seedPriceSubmission(event.id, `user-${idx}`, {
        priceMin: `${20 + idx}`,
      })
    }

    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&limit=2&offset=0',
      { headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { rows: { id: string }[]; total: number }
    }
    expect(body.data.rows.length).toBe(2)
    expect(body.data.total).toBe(3)
  })

  it('keeps legacy array shape when count is omitted', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2099-11-01' })
    await seedPriceSubmission(event.id, 'lone-user')

    const res = await app.request('/v1/admin/prices/submissions', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { success: boolean; data: unknown }
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('GET /v1/admin/prices/submissions — status filter (#708)', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  // Regression for #708: the moderation queue must default to status='pending'
  // so the panel badge and the /admin/review pill agree. The submissions
  // endpoint historically returned every status — that's how 14 rows showed
  // under a "pending" label when only 1 was actually pending.
  it('defaults to status=pending and excludes corroborated/disputed/stale', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    })
    await seedPriceSubmission(event.id, 'user-pending', { status: 'pending' })
    await seedPriceSubmission(event.id, 'user-corroborated', {
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, 'user-disputed', { status: 'disputed' })
    await seedPriceSubmission(event.id, 'user-stale', { status: 'stale' })

    const res = await app.request('/v1/admin/prices/submissions', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      success: boolean
      data: { userId: string; status: string }[]
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.userId).toBe('user-pending')
    expect(body.data[0]?.status).toBe('pending')
  })

  it('applies the pending filter to the count when count=true', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    })
    await seedPriceSubmission(event.id, 'user-pending-1', { status: 'pending' })
    await seedPriceSubmission(event.id, 'user-pending-2', { status: 'pending' })
    await seedPriceSubmission(event.id, 'user-stale', { status: 'stale' })

    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&limit=10&offset=0',
      { headers: ADMIN_HEADERS },
    )
    const body = (await res.json()) as {
      success: boolean
      data: { rows: unknown[]; total: number }
    }
    expect(body.data.total).toBe(2)
    expect(body.data.rows).toHaveLength(2)
  })

  it('returns all statuses when status=all is passed', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    })
    await seedPriceSubmission(event.id, 'user-pending', { status: 'pending' })
    await seedPriceSubmission(event.id, 'user-corroborated', {
      status: 'corroborated',
    })

    const res = await app.request('/v1/admin/prices/submissions?status=all', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      success: boolean
      data: { userId: string }[]
    }
    expect(body.data).toHaveLength(2)
  })
})
