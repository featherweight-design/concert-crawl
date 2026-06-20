import { describe, it, expect, beforeEach, vi } from 'vitest'
import { and, eq, inArray } from 'drizzle-orm'
import {
  auditLog,
  eventReports,
  events,
  priceRetrievalLog,
  priceSubmissions,
  userEvents,
} from '@concert-crawl/db'

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
  seedEventReport,
  seedPriceRetrievalLog,
  seedPriceSubmission,
  seedUserEvent,
  seedVenue,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'

const app = createApp()

const ADMIN_USER_ID = 'admin_user'
const NON_ADMIN_USER_ID = 'fan_user'

function setAdminAuth(): void {
  authState.current = {
    userId: ADMIN_USER_ID,
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

function setNonAdminAuth(): void {
  authState.current = {
    userId: NON_ADMIN_USER_ID,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

const NON_ADMIN_HEADERS = {
  Authorization: 'Bearer fan-token',
  'Content-Type': 'application/json',
}

describe('POST /v1/admin/events/:id/sold-out', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('creates a promoted sold-out report and returns 201', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-04' })

    const res = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        evidenceMethod: 'venue_site',
        evidenceUrl: 'https://venue.example.com/show',
        note: 'Venue confirmed via website',
      }),
    })

    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: {
        id: string
        eventId: string
        reporterId: string
        status: string
        evidenceMethod: string
        evidenceUrl: string | null
        note: string | null
        resolution: string | null
        resolvedAt: string | null
        adminNote: string | null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.eventId).toBe(event.id)
    expect(body.data.reporterId).toBe(ADMIN_USER_ID)
    expect(body.data.status).toBe('sold-out')
    expect(body.data.evidenceMethod).toBe('venue_site')
    expect(body.data.evidenceUrl).toBe('https://venue.example.com/show')
    expect(body.data.note).toBe('Venue confirmed via website')
    expect(body.data.resolution).toBe('promoted')
    expect(body.data.resolvedAt).not.toBeNull()
    expect(body.data.adminNote).toBe(
      'admin-authored — auto-promoted on creation',
    )

    // Confirm row is actually in the DB.
    const rows = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, event.id))
    expect(rows).toHaveLength(1)
  })

  it('defaults evidenceMethod to "other" when body is empty', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-05' })

    const res = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { evidenceMethod: string }
    }
    expect(body.data.evidenceMethod).toBe('other')
  })

  it('is idempotent — second call returns 200 with the existing report', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-06' })

    const first = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ evidenceMethod: 'saw_listing' }),
    })
    expect(first.status).toBe(201)
    const firstBody = (await first.json()) as {
      data: { id: string }
    }
    const originalReportId = firstBody.data.id

    const second = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ evidenceMethod: 'bought_myself' }),
    })
    expect(second.status).toBe(200)
    const secondBody = (await second.json()) as {
      data: { id: string; evidenceMethod: string }
    }
    expect(secondBody.data.id).toBe(originalReportId)
    // Evidence method from the second call is ignored — the existing row wins.
    expect(secondBody.data.evidenceMethod).toBe('saw_listing')

    // Still only one row.
    const rows = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, event.id))
    expect(rows).toHaveLength(1)
  })

  it('returns 404 when the event does not exist', async () => {
    const res = await app.request(
      '/v1/admin/events/00000000-0000-0000-0000-000000000000/sold-out',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({}),
      },
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 for non-admin users', async () => {
    setNonAdminAuth()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-07' })

    const res = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: NON_ADMIN_HEADERS,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(403)

    // Nothing should have been written.
    const rows = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, event.id))
    expect(rows).toHaveLength(0)
  })

  it('rejects invalid evidenceUrl (422)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-08' })

    const res = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ evidenceUrl: 'not-a-url' }),
    })
    expect(res.status).toBe(422)
  })
})

describe('POST /v1/admin/events/:id/available', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('flips the active sold-out report to rejected and returns 204', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-10' })

    const markRes = await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })
    expect(markRes.status).toBe(201)

    const availableRes = await app.request(
      `/v1/admin/events/${event.id}/available`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ note: 'tickets released again' }),
      },
    )
    expect(availableRes.status).toBe(204)

    // The row stays — its resolution is flipped to 'rejected'.
    const rows = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, event.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('sold-out')
    expect(rows[0]?.resolution).toBe('rejected')
    expect(rows[0]?.adminNote).toBe('tickets released again')
  })

  it('uses default admin note when no body is supplied', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-11' })

    await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })

    const availableRes = await app.request(
      `/v1/admin/events/${event.id}/available`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({}),
      },
    )
    expect(availableRes.status).toBe(204)

    const rows = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, event.id))
    expect(rows[0]?.adminNote).toBe('admin marked available')
  })

  it('returns 204 (no-op) when no active sold-out report exists', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-12' })

    const res = await app.request(`/v1/admin/events/${event.id}/available`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(204)

    const rows = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, event.id))
    expect(rows).toHaveLength(0)
  })

  it('returns 403 for non-admin users', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-07-13' })

    // Pre-seed an admin sold-out report so we can assert it survives a
    // forbidden call.
    await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })

    setNonAdminAuth()
    const res = await app.request(`/v1/admin/events/${event.id}/available`, {
      method: 'POST',
      headers: NON_ADMIN_HEADERS,
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(403)

    const rows = await testDb
      .select()
      .from(eventReports)
      .where(
        and(
          eq(eventReports.eventId, event.id),
          eq(eventReports.resolution, 'promoted'),
        ),
      )
    expect(rows).toHaveLength(1)
  })
})

describe('GET /v1/admin/events — isSoldOut derivation', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('reflects isSoldOut state as sold-out reports are marked and cleared', async () => {
    const venue = await seedVenue()
    // Use a date well in the future so it appears in the default
    // verified=false list query (which filters to today onward).
    const event = await seedEvent(venue.id, {
      date: '2026-12-01',
      verified: false,
    })

    // Initial state: not sold out.
    const listBefore = await app.request('/v1/admin/events', {
      headers: ADMIN_HEADERS,
    })
    expect(listBefore.status).toBe(200)
    const bodyBefore = (await listBefore.json()) as {
      data: Array<{ id: string; isSoldOut: boolean }>
    }
    const rowBefore = bodyBefore.data.find((row) => row.id === event.id)
    expect(rowBefore).toBeDefined()
    expect(rowBefore?.isSoldOut).toBe(false)

    // Mark sold out.
    await app.request(`/v1/admin/events/${event.id}/sold-out`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })

    const listSold = await app.request('/v1/admin/events', {
      headers: ADMIN_HEADERS,
    })
    const bodySold = (await listSold.json()) as {
      data: Array<{ id: string; isSoldOut: boolean }>
    }
    const rowSold = bodySold.data.find((row) => row.id === event.id)
    expect(rowSold?.isSoldOut).toBe(true)

    // Mark available again.
    await app.request(`/v1/admin/events/${event.id}/available`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({}),
    })

    const listAfter = await app.request('/v1/admin/events', {
      headers: ADMIN_HEADERS,
    })
    const bodyAfter = (await listAfter.json()) as {
      data: Array<{ id: string; isSoldOut: boolean }>
    }
    const rowAfter = bodyAfter.data.find((row) => row.id === event.id)
    expect(rowAfter?.isSoldOut).toBe(false)
  })
})

function futureDate(daysFromNow: number): string {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + daysFromNow)
  return now.toISOString().slice(0, 10)
}

describe('GET /v1/admin/events?missing=true — integration (#607)', () => {
  beforeEach(async () => {
    setAdminAuth()
    await clearTables()
  })

  it('returns only rows with first_missing_at NOT NULL, ordered DESC', async () => {
    const venue = await seedVenue({
      name: 'Stale Test Venue',
      slug: 'stale-test-venue',
    })

    // Three rows: one currently-seen, two missing at different timestamps.
    // The missing pair lets us verify ordering (most recent first).
    const earlier = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const later = new Date(Date.now() - 1 * 60 * 60 * 1000)

    await seedEvent(venue.id, {
      title: 'Currently Seen Show',
      artist: 'Artist Seen',
      date: futureDate(14),
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Older Disappearance',
      artist: 'Artist Older',
      date: futureDate(21),
      status: 'upcoming',
      firstMissingAt: earlier,
    })
    await seedEvent(venue.id, {
      title: 'Newer Disappearance',
      artist: 'Artist Newer',
      date: futureDate(28),
      status: 'upcoming',
      firstMissingAt: later,
    })

    const res = await app.request('/v1/admin/events?missing=true')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { title: string; firstMissingAt: string | null }[]
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0]?.title).toBe('Newer Disappearance')
    expect(body.data[1]?.title).toBe('Older Disappearance')
    expect(body.data.every((row) => row.firstMissingAt !== null)).toBe(true)
  })

  it('excludes past-date events even when first_missing_at is set', async () => {
    // Belt-and-braces against accidental surfacing of historical shows.
    // The crawler's stale-detection pass only writes first_missing_at on
    // upcoming events, but the admin filter must independently enforce the
    // date >= today guarantee so backfilled or legacy rows can't leak in.
    const venue = await seedVenue({
      name: 'Past Event Venue',
      slug: 'past-event-venue',
    })
    await seedEvent(venue.id, {
      title: 'Old Disappeared Show',
      artist: 'Artist Past',
      date: futureDate(-30),
      status: 'upcoming',
      firstMissingAt: new Date(),
    })

    const res = await app.request('/v1/admin/events?missing=true')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: unknown[]
    }
    expect(body.data).toHaveLength(0)
  })

  // Regression for #712: events admins have marked non-concert
  // (hidden_from_consumer=true) must not appear in the missing queue when
  // crawls stop seeing them — they've already been triaged and are not
  // actionable. The /v1/admin/review/counts pill applies the same filter.
  it('excludes hidden_from_consumer events from the missing list', async () => {
    const venue = await seedVenue({
      name: 'Hidden Filter Venue',
      slug: 'hidden-filter-venue',
    })
    await seedEvent(venue.id, {
      title: 'Visible Missing Show',
      artist: 'Visible Artist',
      date: futureDate(14),
      status: 'upcoming',
      firstMissingAt: new Date(),
      hiddenFromConsumer: false,
    })
    await seedEvent(venue.id, {
      title: 'Hidden Missing Show',
      artist: 'Hidden Artist',
      date: futureDate(21),
      status: 'upcoming',
      firstMissingAt: new Date(),
      hiddenFromConsumer: true,
    })

    const res = await app.request('/v1/admin/events?missing=true')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { title: string; hiddenFromConsumer: boolean }[]
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Visible Missing Show')
    expect(body.data[0]?.hiddenFromConsumer).toBe(false)
  })

  it('exposes lastSeenAt and firstMissingAt on the standard list response', async () => {
    // Regression test for the admin Review UI: the missing tab renders
    // relative timestamps inline, so the GET /v1/admin/events response
    // must include both columns regardless of which filter is active.
    const venue = await seedVenue({
      name: 'Field Exposure Venue',
      slug: 'field-exposure-venue',
    })
    await seedEvent(venue.id, {
      title: 'Verified Show',
      artist: 'Artist Verified',
      date: futureDate(14),
      status: 'upcoming',
      verified: true,
    })

    const res = await app.request('/v1/admin/events?verified=true')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        title: string
        lastSeenAt: string
        firstMissingAt: string | null
      }[]
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toHaveProperty('lastSeenAt')
    expect(body.data[0]).toHaveProperty('firstMissingAt')
    expect(typeof body.data[0]?.lastSeenAt).toBe('string')
    expect(body.data[0]?.firstMissingAt).toBeNull()
  })
})

describe('PATCH /v1/admin/events/:id — Missing-tab actions', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('clears firstMissingAt when given { firstMissingAt: null } (Dismiss)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-08-01',
      firstMissingAt: new Date('2026-06-15T03:00:00Z'),
      lastSeenAt: new Date('2026-06-14T03:00:00Z'),
      verified: true,
    })
    expect(event.firstMissingAt).not.toBeNull()

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ firstMissingAt: null }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { firstMissingAt: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.firstMissingAt).toBeNull()
  })

  it('transitions status from upcoming to postponed (Mark postponed)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-08-02',
      verified: true,
      status: 'upcoming',
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'postponed' }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { status: string }
    }
    expect(body.data.status).toBe('postponed')
  })

  it('transitions status to cancelled (Mark cancelled)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-08-03',
      verified: true,
      status: 'upcoming',
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'cancelled' }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { status: string }
    }
    expect(body.data.status).toBe('cancelled')
  })

  it('rejects non-null values for firstMissingAt', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-08-04',
      firstMissingAt: new Date('2026-06-15T03:00:00Z'),
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ firstMissingAt: '2026-06-15T03:00:00Z' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('GET /v1/admin/events — verified filter optional (PR 4 all-events)', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns both verified and unverified events when verified is omitted', async () => {
    // PR 4's All-events tab needs to surface every event regardless of
    // verification state. The legacy default of `verified=false` masked
    // verified rows from this endpoint, blocking the new view.
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Verified Show',
      artist: 'Artist V',
      date: futureDate(14),
      verified: true,
    })
    await seedEvent(venue.id, {
      title: 'Unverified Show',
      artist: 'Artist U',
      date: futureDate(15),
      verified: false,
    })

    const res = await app.request('/v1/admin/events', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ title: string; verified: boolean }>
    }
    expect(body.success).toBe(true)
    const titles = body.data.map((row) => row.title).sort()
    expect(titles).toEqual(['Unverified Show', 'Verified Show'])
  })

  it('still filters when verified=true is provided explicitly', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Verified Show',
      artist: 'Artist V',
      date: futureDate(14),
      verified: true,
    })
    await seedEvent(venue.id, {
      title: 'Unverified Show',
      artist: 'Artist U',
      date: futureDate(15),
      verified: false,
    })

    const res = await app.request('/v1/admin/events?verified=true', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ title: string; verified: boolean }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Verified Show')
    expect(body.data[0]?.verified).toBe(true)
  })

  it('still filters when verified=false is provided explicitly', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Verified Show',
      artist: 'Artist V',
      date: futureDate(14),
      verified: true,
    })
    await seedEvent(venue.id, {
      title: 'Unverified Show',
      artist: 'Artist U',
      date: futureDate(15),
      verified: false,
    })

    const res = await app.request('/v1/admin/events?verified=false', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ title: string; verified: boolean }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Unverified Show')
    expect(body.data[0]?.verified).toBe(false)
  })
})

describe('GET /v1/admin/events — PR 5 filters', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('filters by query matching title (case-insensitive)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Lord Huron Live',
      artist: 'Lord Huron',
      date: futureDate(14),
    })
    await seedEvent(venue.id, {
      title: 'Other Show',
      artist: 'Some Band',
      date: futureDate(15),
    })

    const res = await app.request('/v1/admin/events?query=lord+huron', {
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Lord Huron Live')
  })

  it('filters by query matching artist', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Set A',
      artist: 'Bon Iver',
      date: futureDate(14),
    })
    await seedEvent(venue.id, {
      title: 'Set B',
      artist: 'King Krule',
      date: futureDate(15),
    })

    const res = await app.request('/v1/admin/events?query=Bon', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Set A')
  })

  it('filters by query matching venue name', async () => {
    const targetVenue = await seedVenue({
      name: 'Mission Ballroom',
      slug: 'mission-ballroom',
    })
    const otherVenue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
    })
    await seedEvent(targetVenue.id, {
      title: 'At Mission',
      artist: 'Artist X',
      date: futureDate(14),
    })
    await seedEvent(otherVenue.id, {
      title: 'At Bluebird',
      artist: 'Artist Y',
      date: futureDate(15),
    })

    const res = await app.request('/v1/admin/events?query=mission', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('At Mission')
  })

  it('filters by dateFrom (inclusive) overriding the today default', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Past Show',
      artist: 'Artist A',
      date: futureDate(-30),
    })
    await seedEvent(venue.id, {
      title: 'Recent Show',
      artist: 'Artist B',
      date: futureDate(-5),
    })
    await seedEvent(venue.id, {
      title: 'Upcoming Show',
      artist: 'Artist C',
      date: futureDate(7),
    })

    const dateFrom = futureDate(-10)
    const res = await app.request(`/v1/admin/events?dateFrom=${dateFrom}`, {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    const titles = body.data.map((row) => row.title).sort()
    expect(titles).toEqual(['Recent Show', 'Upcoming Show'])
  })

  it('filters by dateTo (inclusive)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Near Show',
      artist: 'Artist A',
      date: futureDate(5),
    })
    await seedEvent(venue.id, {
      title: 'Far Show',
      artist: 'Artist B',
      date: futureDate(30),
    })

    const dateTo = futureDate(10)
    const res = await app.request(`/v1/admin/events?dateTo=${dateTo}`, {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Near Show')
  })

  it('filters by genre (single tag, array overlap)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Indie Show',
      artist: 'Artist A',
      date: futureDate(7),
      genre: ['indie', 'folk'],
    })
    await seedEvent(venue.id, {
      title: 'Metal Show',
      artist: 'Artist B',
      date: futureDate(8),
      genre: ['metal'],
    })

    const res = await app.request('/v1/admin/events?genre=indie', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Indie Show')
  })

  it('filters by genre (multiple tags, OR)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Indie Show',
      artist: 'Artist A',
      date: futureDate(7),
      genre: ['indie'],
    })
    await seedEvent(venue.id, {
      title: 'Metal Show',
      artist: 'Artist B',
      date: futureDate(8),
      genre: ['metal'],
    })
    await seedEvent(venue.id, {
      title: 'Jazz Show',
      artist: 'Artist C',
      date: futureDate(9),
      genre: ['jazz'],
    })

    const res = await app.request('/v1/admin/events?genre=indie,metal', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    const titles = body.data.map((row) => row.title).sort()
    expect(titles).toEqual(['Indie Show', 'Metal Show'])
  })

  it('filters by missingData=no-price', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Priced Show',
      artist: 'Artist A',
      date: futureDate(7),
      ticketPriceMin: '25',
    })
    await seedEvent(venue.id, {
      title: 'No Price Show',
      artist: 'Artist B',
      date: futureDate(8),
      ticketPriceMin: null,
    })

    const res = await app.request('/v1/admin/events?missingData=no-price', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('No Price Show')
  })

  it('filters by missingData=no-show-time + no-genre combined (AND)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Full Show',
      artist: 'Artist A',
      date: futureDate(7),
      showTime: '20:00',
      genre: ['indie'],
    })
    await seedEvent(venue.id, {
      title: 'Missing Both',
      artist: 'Artist B',
      date: futureDate(8),
      showTime: null,
      genre: null,
    })
    await seedEvent(venue.id, {
      title: 'Missing Genre Only',
      artist: 'Artist C',
      date: futureDate(9),
      showTime: '21:00',
      genre: null,
    })

    const res = await app.request(
      '/v1/admin/events?missingData=no-show-time,no-genre',
      { headers: ADMIN_HEADERS },
    )
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Missing Both')
  })

  it('combines query + genre + verified across params', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Lord Huron Indie',
      artist: 'Lord Huron',
      date: futureDate(7),
      genre: ['indie'],
      verified: true,
    })
    await seedEvent(venue.id, {
      title: 'Lord Huron Folk',
      artist: 'Lord Huron',
      date: futureDate(8),
      genre: ['folk'],
      verified: true,
    })
    await seedEvent(venue.id, {
      title: 'Other Indie',
      artist: 'Some Band',
      date: futureDate(9),
      genre: ['indie'],
      verified: true,
    })

    const res = await app.request(
      '/v1/admin/events?query=lord+huron&genre=indie&verified=true',
      { headers: ADMIN_HEADERS },
    )
    const body = (await res.json()) as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.title).toBe('Lord Huron Indie')
  })
})

describe('PR 6 — DELETE loosened + PATCH hiddenFromConsumer', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('DELETE /:id now removes a verified event (legacy guard dropped)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: futureDate(7),
      verified: true,
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'DELETE',
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean }
    expect(body.success).toBe(true)
  })

  it('PATCH /:id sets hiddenFromConsumer=true', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: futureDate(7) })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ hiddenFromConsumer: true }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { hiddenFromConsumer: boolean }
    }
    expect(body.data.hiddenFromConsumer).toBe(true)
  })

  it('PATCH /:id can flip hiddenFromConsumer back to false', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: futureDate(7),
      hiddenFromConsumer: true,
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ hiddenFromConsumer: false }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { hiddenFromConsumer: boolean }
    }
    expect(body.data.hiddenFromConsumer).toBe(false)
  })

  it('GET /:id projection includes hiddenFromConsumer', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: futureDate(7),
      hiddenFromConsumer: true,
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'GET',
      headers: ADMIN_HEADERS,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { hiddenFromConsumer: boolean }
    }
    expect(body.data.hiddenFromConsumer).toBe(true)
  })

  it('admin GET / surfaces hidden events (no consumer filter)', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      title: 'Hidden Show',
      artist: 'Artist Hidden',
      date: futureDate(7),
      hiddenFromConsumer: true,
    })
    await seedEvent(venue.id, {
      title: 'Visible Show',
      artist: 'Artist Visible',
      date: futureDate(8),
      hiddenFromConsumer: false,
    })

    const res = await app.request('/v1/admin/events', {
      headers: ADMIN_HEADERS,
    })
    const body = (await res.json()) as {
      data: Array<{ title: string; hiddenFromConsumer: boolean }>
    }
    const titles = body.data.map((row) => row.title).sort()
    expect(titles).toEqual(['Hidden Show', 'Visible Show'])
  })
})

describe('PR 10 — bulk endpoints', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('POST /bulk/unverify flips verified=false and writes per-event audit', async () => {
    const venue = await seedVenue()
    const evt1 = await seedEvent(venue.id, {
      title: 'Show 1',
      artist: 'Artist 1',
      date: futureDate(7),
      verified: true,
    })
    const evt2 = await seedEvent(venue.id, {
      title: 'Show 2',
      artist: 'Artist 2',
      date: futureDate(8),
      verified: true,
    })

    const res = await app.request('/v1/admin/events/bulk/unverify', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids: [evt1.id, evt2.id] }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { count: number }
    }
    expect(body.data.count).toBe(2)

    const rows = await testDb
      .select({ id: events.id, verified: events.verified })
      .from(events)
      .where(inArray(events.id, [evt1.id, evt2.id]))
    expect(rows.every((row) => row.verified === false)).toBe(true)

    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'event.bulk_unverify'))
    expect(audits).toHaveLength(2)
    expect(audits.map((row) => row.targetId).sort()).toEqual(
      [evt1.id, evt2.id].sort(),
    )
  })

  it('POST /bulk/mark-non-concert sets hiddenFromConsumer=true', async () => {
    const venue = await seedVenue()
    const evt1 = await seedEvent(venue.id, {
      title: 'A',
      artist: 'A',
      date: futureDate(7),
    })
    const evt2 = await seedEvent(venue.id, {
      title: 'B',
      artist: 'B',
      date: futureDate(8),
    })

    const res = await app.request('/v1/admin/events/bulk/mark-non-concert', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids: [evt1.id, evt2.id] }),
    })
    expect(res.status).toBe(200)

    const rows = await testDb
      .select({
        id: events.id,
        hiddenFromConsumer: events.hiddenFromConsumer,
      })
      .from(events)
      .where(inArray(events.id, [evt1.id, evt2.id]))
    expect(rows.every((row) => row.hiddenFromConsumer === true)).toBe(true)
  })

  it('POST /bulk/delete requires confirmation=DELETE', async () => {
    const venue = await seedVenue()
    const evt = await seedEvent(venue.id, {
      title: 'D',
      artist: 'D',
      date: futureDate(7),
    })

    const noConfirm = await app.request('/v1/admin/events/bulk/delete', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids: [evt.id] }),
    })
    expect(noConfirm.status).toBe(422)

    const wrongConfirm = await app.request('/v1/admin/events/bulk/delete', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids: [evt.id], confirmation: 'delete' }),
    })
    expect(wrongConfirm.status).toBe(422)

    const ok = await app.request('/v1/admin/events/bulk/delete', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids: [evt.id], confirmation: 'DELETE' }),
    })
    expect(ok.status).toBe(200)

    const remaining = await testDb
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, evt.id))
    expect(remaining).toHaveLength(0)
  })

  it('rejects bulk payloads with more than 100 ids', async () => {
    const ids = Array.from(
      { length: 101 },
      (_, idx) => `00000000-0000-0000-0000-${String(idx).padStart(12, '0')}`,
    )

    const res = await app.request('/v1/admin/events/bulk/unverify', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects bulk payloads with an empty ids array', async () => {
    const res = await app.request('/v1/admin/events/bulk/mark-non-concert', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ ids: [] }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects non-admin callers with 403', async () => {
    const venue = await seedVenue()
    const evt = await seedEvent(venue.id, { date: futureDate(7) })
    setNonAdminAuth()

    const res = await app.request('/v1/admin/events/bulk/unverify', {
      method: 'POST',
      headers: NON_ADMIN_HEADERS,
      body: JSON.stringify({ ids: [evt.id] }),
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /v1/admin/events/:id — single-event editor payload', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns the full event projection with venue joined', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: '2026-08-10',
      verified: true,
      status: 'upcoming',
    })

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'GET',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        id: string
        title: string
        artist: string | null
        date: string
        verified: boolean
        status: string
        venueId: string
        venueName: string | null
        firstMissingAt: string | null
        isSoldOut: boolean
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(event.id)
    expect(body.data.venueId).toBe(venue.id)
    expect(body.data.venueName).toBe(venue.name)
    expect(body.data.verified).toBe(true)
    expect(body.data.status).toBe('upcoming')
    expect(body.data.isSoldOut).toBe(false)
  })

  it('returns 404 for a non-existent event id', async () => {
    const res = await app.request(
      `/v1/admin/events/00000000-0000-0000-0000-000000000000`,
      { method: 'GET', headers: ADMIN_HEADERS },
    )
    expect(res.status).toBe(404)
  })

  it('rejects non-admin callers with 403', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { date: '2026-08-11' })

    setNonAdminAuth()

    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'GET',
      headers: NON_ADMIN_HEADERS,
    })
    expect(res.status).toBe(403)
  })
})

describe('POST /v1/admin/events/:id/merge', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('moves user_events, reports, submissions, and price logs to target then deletes source', async () => {
    const venue = await seedVenue()
    const source = await seedEvent(venue.id, {
      title: 'Source Show',
      artist: 'Source Artist',
      date: '2026-09-01',
    })
    const target = await seedEvent(venue.id, {
      title: 'Target Show',
      artist: 'Target Artist',
      date: '2026-09-02',
    })

    await seedUserEvent('user-a', source.id)
    await seedUserEvent('user-b', source.id, { status: 'going' })
    await seedEventReport(source.id, 'reporter-a', { status: 'cancelled' })
    await seedPriceSubmission(source.id, 'price-user-a')
    await seedPriceRetrievalLog(source.id, venue.id)

    const res = await app.request(`/v1/admin/events/${source.id}/merge`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ targetId: target.id }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        mergedInto: string
        referencesMoved: {
          userEventsMoved: number
          userEventsDropped: number
          reportsMoved: number
          submissionsMoved: number
          priceLogsMoved: number
        }
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.mergedInto).toBe(target.id)
    expect(body.data.referencesMoved.userEventsMoved).toBe(2)
    expect(body.data.referencesMoved.userEventsDropped).toBe(0)
    expect(body.data.referencesMoved.reportsMoved).toBe(1)
    expect(body.data.referencesMoved.submissionsMoved).toBe(1)
    expect(body.data.referencesMoved.priceLogsMoved).toBe(1)

    // Source row is gone.
    const sourceRows = await testDb
      .select()
      .from(events)
      .where(eq(events.id, source.id))
    expect(sourceRows).toHaveLength(0)

    // References point at the target.
    const movedUserEvents = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.eventId, target.id))
    expect(movedUserEvents).toHaveLength(2)
    const movedReports = await testDb
      .select()
      .from(eventReports)
      .where(eq(eventReports.eventId, target.id))
    expect(movedReports).toHaveLength(1)
    const movedSubmissions = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, target.id))
    expect(movedSubmissions).toHaveLength(1)
    const movedLogs = await testDb
      .select()
      .from(priceRetrievalLog)
      .where(eq(priceRetrievalLog.eventId, target.id))
    expect(movedLogs).toHaveLength(1)
  })

  it('drops the source user_events row when the same user already has the target on their list', async () => {
    const venue = await seedVenue()
    const source = await seedEvent(venue.id, { artist: 'Source' })
    const target = await seedEvent(venue.id, {
      artist: 'Target',
      date: '2026-10-01',
    })

    // user-a has both, user-b has only source.
    await seedUserEvent('user-a', source.id, { status: 'watching' })
    await seedUserEvent('user-a', target.id, { status: 'going' })
    await seedUserEvent('user-b', source.id, { status: 'interested' })

    const res = await app.request(`/v1/admin/events/${source.id}/merge`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ targetId: target.id }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        referencesMoved: { userEventsMoved: number; userEventsDropped: number }
      }
    }
    expect(body.data.referencesMoved.userEventsMoved).toBe(1)
    expect(body.data.referencesMoved.userEventsDropped).toBe(1)

    // Target ends up with 2 user_events: user-a's original 'going' (preserved)
    // and user-b's moved row.
    const targetRows = await testDb
      .select()
      .from(userEvents)
      .where(eq(userEvents.eventId, target.id))
    expect(targetRows).toHaveLength(2)
    const userAStatus = targetRows.find(
      (row) => row.userId === 'user-a',
    )?.status
    // The conflict-winner is user-a's pre-existing target row, so the
    // surviving status is 'going', not the source's 'watching'.
    expect(userAStatus).toBe('going')
  })

  it('writes one audit-log row with source + counts metadata', async () => {
    const venue = await seedVenue()
    const source = await seedEvent(venue.id, { artist: 'Src' })
    const target = await seedEvent(venue.id, {
      artist: 'Tgt',
      date: '2026-11-01',
    })
    await seedUserEvent('user-a', source.id)

    const res = await app.request(`/v1/admin/events/${source.id}/merge`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ targetId: target.id }),
    })
    expect(res.status).toBe(200)

    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'event.merge'))
    expect(auditRows).toHaveLength(1)
    const row = auditRows[0]!
    expect(row.targetId).toBe(target.id)
    const metadata = row.metadata as {
      sourceId: string
      referencesMoved: { userEventsMoved: number }
    }
    expect(metadata.sourceId).toBe(source.id)
    expect(metadata.referencesMoved.userEventsMoved).toBe(1)
  })

  it('rejects merging an event with itself (422)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/events/${event.id}/merge`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ targetId: event.id }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 404 when the source event does not exist', async () => {
    const venue = await seedVenue()
    const target = await seedEvent(venue.id, { artist: 'Target' })

    const res = await app.request(
      `/v1/admin/events/00000000-0000-0000-0000-000000000000/merge`,
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ targetId: target.id }),
      },
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when the target event does not exist', async () => {
    const venue = await seedVenue()
    const source = await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/events/${source.id}/merge`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        targetId: '00000000-0000-0000-0000-000000000000',
      }),
    })
    expect(res.status).toBe(404)

    // Source must still exist — the failed validation must not have deleted it.
    const remaining = await testDb
      .select()
      .from(events)
      .where(eq(events.id, source.id))
    expect(remaining).toHaveLength(1)
  })

  it('rejects an invalid targetId payload (422)', async () => {
    const venue = await seedVenue()
    const source = await seedEvent(venue.id)

    const res = await app.request(`/v1/admin/events/${source.id}/merge`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ targetId: 'not-a-uuid' }),
    })
    expect(res.status).toBe(422)
  })

  it('rejects non-admin callers with 403', async () => {
    const venue = await seedVenue()
    const source = await seedEvent(venue.id)
    const target = await seedEvent(venue.id, {
      artist: 'Target',
      date: '2026-12-01',
    })
    setNonAdminAuth()
    const res = await app.request(`/v1/admin/events/${source.id}/merge`, {
      method: 'POST',
      headers: NON_ADMIN_HEADERS,
      body: JSON.stringify({ targetId: target.id }),
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /v1/admin/events?count=true', () => {
  beforeEach(() => {
    setAdminAuth()
    return clearTables()
  })

  it('returns { rows, total } with total ignoring limit/offset', async () => {
    const venue = await seedVenue()
    // Seed 5 events spread across distinct dates so the date-default doesn't
    // hide any of them.
    for (let idx = 0; idx < 5; idx++) {
      await seedEvent(venue.id, {
        artist: `Artist ${idx}`,
        date: `2026-09-0${idx + 1}`,
      })
    }

    const res = await app.request(
      '/v1/admin/events?count=true&limit=2&offset=0',
      { method: 'GET', headers: ADMIN_HEADERS },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { rows: { id: string }[]; total: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.rows.length).toBe(2)
    expect(body.data.total).toBe(5)
  })

  it('keeps legacy array response when count is omitted', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, { artist: 'Solo', date: '2026-10-01' })

    const res = await app.request('/v1/admin/events?limit=10', {
      method: 'GET',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown }
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('applies the same WHERE clauses to the count as to the rows', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Verified Artist',
      date: '2026-11-01',
      verified: true,
    })
    await seedEvent(venue.id, {
      artist: 'Unverified Artist',
      date: '2026-11-02',
      verified: false,
    })

    const res = await app.request(
      '/v1/admin/events?count=true&verified=false&limit=10',
      { method: 'GET', headers: ADMIN_HEADERS },
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { rows: { id: string }[]; total: number }
    }
    expect(body.data.rows.length).toBe(1)
    expect(body.data.total).toBe(1)
  })
})
