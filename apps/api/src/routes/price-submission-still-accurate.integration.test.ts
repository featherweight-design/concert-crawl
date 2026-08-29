import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { priceSubmissions } from '@concert-crawl/db'
import { STALE_AFTER_MS } from '@concert-crawl/types'
import { testDb } from '../test/helpers/db.js'

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
import {
  clearTables,
  seedEvent,
  seedVenue,
  seedPriceSubmission,
} from '../test/helpers/seed.js'

const app = createApp()

const SUBMITTER = 'user_submitter'
const OTHER = 'user_other'

function setAuth(userId: string): void {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } }
}

function clearAuth(): void {
  authState.current = null
}

function agoMs(ms: number): Date {
  return new Date(Date.now() - ms)
}

// One hour outside the window in each direction, so neither fixture sits on
// the boundary the route compares against.
const STALE = () => agoMs(STALE_AFTER_MS + 60 * 60 * 1000)
const FRESH = () => agoMs(STALE_AFTER_MS - 60 * 60 * 1000)

describe('POST /v1/events/:id/price-submissions/:submissionId/still-accurate', () => {
  let eventId: string
  let venueId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    venueId = venue.id
    const event = await seedEvent(venueId)
    eventId = event.id
  })

  const url = (submissionId: string, forEventId = eventId) =>
    `/v1/events/${forEventId}/price-submissions/${submissionId}/still-accurate`

  const post = (path: string, authed = true) =>
    app.request(path, {
      method: 'POST',
      headers: authed ? { Authorization: 'Bearer test-token' } : {},
    })

  async function seedStale(
    userId = SUBMITTER,
    overrides: Partial<typeof priceSubmissions.$inferInsert> = {},
  ) {
    return seedPriceSubmission(eventId, userId, {
      status: 'corroborated',
      createdAt: STALE(),
      ...overrides,
    })
  }

  const readRow = async (id: string) => {
    const [row] = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)
    if (!row) throw new Error('submission row disappeared')
    return row
  }

  it('returns 401 without auth', async () => {
    const submission = await seedStale()
    const res = await post(url(submission.id), false)
    expect(res.status).toBe(401)
  })

  it('returns 400 for a malformed event id', async () => {
    setAuth(OTHER)
    const submission = await seedStale()
    const res = await post(url(submission.id, 'not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a malformed submission id', async () => {
    setAuth(OTHER)
    const res = await post(url('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown event', async () => {
    setAuth(OTHER)
    const submission = await seedStale()
    const res = await post(
      url(submission.id, '00000000-0000-4000-8000-000000000001'),
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for an unknown submission', async () => {
    setAuth(OTHER)
    const res = await post(url('00000000-0000-4000-8000-000000000002'))
    expect(res.status).toBe(404)
  })

  it('returns 404 when the submission belongs to a different event', async () => {
    setAuth(OTHER)
    const otherVenue = await seedVenue({
      name: 'Other Venue',
      slug: 'other-venue',
    })
    const otherEvent = await seedEvent(otherVenue.id)
    const submission = await seedStale()
    const res = await post(url(submission.id, otherEvent.id))
    expect(res.status).toBe(404)
  })

  // Each of the three visibility predicates can be dropped from the
  // implementation while the other two tests still pass, so they get one
  // fixture each rather than a single "hidden event 404s".
  it('returns 404 when the event is hidden from consumers', async () => {
    setAuth(OTHER)
    const hiddenEvent = await seedEvent(venueId, {
      artist: 'Hidden Artist',
      hiddenFromConsumer: true,
    })
    const submission = await seedPriceSubmission(hiddenEvent.id, SUBMITTER, {
      status: 'corroborated',
      createdAt: STALE(),
    })
    const res = await post(url(submission.id, hiddenEvent.id))
    expect(res.status).toBe(404)
  })

  it('returns 404 when the crawler has lost the event (firstMissingAt set)', async () => {
    setAuth(OTHER)
    const missingEvent = await seedEvent(venueId, {
      artist: 'Missing Artist',
      firstMissingAt: agoMs(60 * 60 * 1000),
    })
    const submission = await seedPriceSubmission(missingEvent.id, SUBMITTER, {
      status: 'corroborated',
      createdAt: STALE(),
    })
    const res = await post(url(submission.id, missingEvent.id))
    expect(res.status).toBe(404)
  })

  it('returns 404 when the venue has been deactivated', async () => {
    setAuth(OTHER)
    const deadVenue = await seedVenue({
      name: 'Closed Venue',
      slug: 'closed-venue',
      active: false,
    })
    const deadEvent = await seedEvent(deadVenue.id, { artist: 'Closed Artist' })
    const submission = await seedPriceSubmission(deadEvent.id, SUBMITTER, {
      status: 'corroborated',
      createdAt: STALE(),
    })
    const res = await post(url(submission.id, deadEvent.id))
    expect(res.status).toBe(404)
  })

  // Table-driven over the whole enum: an implementation written as
  // `if (status === 'pending') reject` passes a pending-only test while
  // silently accepting disputed, stale and archived rows.
  const nonCorroborated = ['pending', 'disputed', 'stale', 'archived'] as const
  for (const status of nonCorroborated) {
    it(`returns 400 for a ${status} submission`, async () => {
      setAuth(OTHER)
      const submission = await seedStale(SUBMITTER, { status })
      const res = await post(url(submission.id))
      expect(res.status).toBe(400)
    })
  }

  it('returns 409 when the price is not yet stale', async () => {
    setAuth(OTHER)
    const submission = await seedStale(SUBMITTER, { createdAt: FRESH() })
    const res = await post(url(submission.id))
    expect(res.status).toBe(409)
  })

  // The SQL GREATEST and the in-memory max are two implementations of one
  // rule, so the mapper's test proves nothing here. createdAt is outside the
  // window and lastSeenAt is inside it: a COALESCE(lastSeenAt, createdAt)
  // implementation returns 200, a max returns 409.
  it('returns 409 when only lastSeenAt is inside the window', async () => {
    setAuth(OTHER)
    const submission = await seedStale(SUBMITTER, {
      createdAt: agoMs(STALE_AFTER_MS * 3),
      lastSeenAt: FRESH(),
    })
    const res = await post(url(submission.id))
    expect(res.status).toBe(409)
  })

  it('returns 200 for the original submitter and stamps the sighting', async () => {
    setAuth(SUBMITTER)
    const submission = await seedStale(SUBMITTER)
    const res = await post(url(submission.id))
    expect(res.status).toBe(200)

    const row = await readRow(submission.id)
    expect(row.lastSeenBy).toBe(SUBMITTER)
    expect(row.lastSeenAt).not.toBeNull()
  })

  // Its own stale submission, not a second call against the one above: the
  // cooldown is per-submission and global, so a sequential second call would
  // correctly 409 and this test would assert the opposite of the design.
  it('returns 200 for a different signed-in user and records their id', async () => {
    setAuth(OTHER)
    const submission = await seedStale(SUBMITTER)
    const res = await post(url(submission.id))
    expect(res.status).toBe(200)

    const row = await readRow(submission.id)
    expect(row.lastSeenBy).toBe(OTHER)
  })

  it('returns 409 on a second sighting of the same submission', async () => {
    setAuth(SUBMITTER)
    const submission = await seedStale(SUBMITTER)
    expect((await post(url(submission.id))).status).toBe(200)

    setAuth(OTHER)
    expect((await post(url(submission.id))).status).toBe(409)

    const row = await readRow(submission.id)
    expect(row.lastSeenBy).toBe(SUBMITTER)
  })

  it('leaves corroborationCount alone', async () => {
    setAuth(OTHER)
    const submission = await seedStale(SUBMITTER, { corroborationCount: 2 })
    expect((await post(url(submission.id))).status).toBe(200)

    const row = await readRow(submission.id)
    expect(row.corroborationCount).toBe(2)
  })

  // The check and the write are one statement, so two callers racing the same
  // stale row must not both win.
  it('yields exactly one 200 and one 409 under concurrent sightings', async () => {
    const submission = await seedStale(SUBMITTER)
    setAuth(OTHER)
    const results = await Promise.all([
      post(url(submission.id)),
      post(url(submission.id)),
    ])
    const statuses = results.map((res) => res.status).sort()
    expect(statuses).toEqual([200, 409])
  })
})
