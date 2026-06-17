import { describe, it, expect, beforeEach, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { eventReports } from '@concert-crawl/db'

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
import { clearTables, seedEvent, seedVenue } from '../../test/helpers/seed.js'
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
