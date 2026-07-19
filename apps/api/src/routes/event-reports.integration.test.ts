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

import { db, notifications } from '@concert-crawl/db'
import { and, eq } from 'drizzle-orm'
import { createApp } from '../app.js'
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedEventReportConfirm,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js'

const app = createApp()

function setAuth(userId = 'user_abc123'): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  }
}

function clearAuth(): void {
  authState.current = null
}

const REPORTER = 'user_reporter'
const OTHER_USER = 'user_other'

describe('POST /v1/events/:id/reports', () => {
  let eventId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  const reportUrl = () => `/v1/events/${eventId}/reports`
  const reportBody = {
    status: 'sold-out',
    evidenceMethod: 'saw_listing',
  }

  it('returns 401 without auth', async () => {
    const res = await app.request(reportUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportBody),
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid status', async () => {
    setAuth(REPORTER)
    const res = await app.request(reportUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ ...reportBody, status: 'wrong' }),
    })
    expect(res.status).toBe(422)
  })

  it('files a report successfully', async () => {
    setAuth(REPORTER)
    const res = await app.request(reportUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(reportBody),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { status: string; evidenceMethod: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('sold-out')
    expect(body.data.evidenceMethod).toBe('saw_listing')
  })

  it('returns 409 when user already has an unresolved report', async () => {
    setAuth(REPORTER)
    await seedEventReport(eventId, REPORTER)
    const res = await app.request(reportUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(reportBody),
    })
    expect(res.status).toBe(409)
  })

  it('returns 422 when note contains profanity', async () => {
    setAuth(REPORTER)
    const res = await app.request(reportUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ ...reportBody, note: 'this is ass content' }),
    })
    expect(res.status).toBe(422)
  })
})

describe('GET /v1/events/:id/reports', () => {
  let eventId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  it('returns empty list when no reports exist', async () => {
    const res = await app.request(`/v1/events/${eventId}/reports`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  it('returns open reports with confirmsCount and confirmsNeeded', async () => {
    await seedEventReport(eventId, REPORTER)
    const res = await app.request(`/v1/events/${eventId}/reports`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{
        status: string
        confirmsCount: number
        confirmsNeeded: number
        isReporter: boolean
        userHasConfirmed: boolean
      }>
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.status).toBe('sold-out')
    expect(typeof body.data[0]?.confirmsCount).toBe('number')
    expect(typeof body.data[0]?.confirmsNeeded).toBe('number')
    expect(body.data[0]?.isReporter).toBe(false)
    expect(body.data[0]?.userHasConfirmed).toBe(false)
  })

  it('sets isReporter true for the reporting user', async () => {
    await seedEventReport(eventId, REPORTER)
    setAuth(REPORTER)
    const res = await app.request(`/v1/events/${eventId}/reports`)
    const body = (await res.json()) as {
      data: Array<{ isReporter: boolean; userHasConfirmed: boolean }>
    }
    expect(body.data[0]?.isReporter).toBe(true)
    expect(body.data[0]?.userHasConfirmed).toBe(false)
  })

  it('sets userHasConfirmed true when user has confirmed the report', async () => {
    const report = await seedEventReport(eventId, REPORTER)
    await seedEventReportConfirm(report.id, OTHER_USER)
    setAuth(OTHER_USER)
    const res = await app.request(`/v1/events/${eventId}/reports`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    const body = (await res.json()) as {
      data: Array<{ userHasConfirmed: boolean; confirmsCount: number }>
    }
    expect(body.data[0]?.userHasConfirmed).toBe(true)
    expect(body.data[0]?.confirmsCount).toBe(1)
  })
})

describe('POST /v1/events/:id/reports/:reportId/confirm', () => {
  let eventId: string
  let reportId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    // Far-future date keeps threshold = confirmsRequired (2), never confirmsRequiredImminent (3)
    const event = await seedEvent(venue.id, { date: '2099-09-01' })
    eventId = event.id
    const report = await seedEventReport(eventId, REPORTER)
    reportId = report.id
  })

  const confirmUrl = () => `/v1/events/${eventId}/reports/${reportId}/confirm`

  it('returns 401 without auth', async () => {
    const res = await app.request(confirmUrl(), { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('returns 403 when reporter tries to confirm their own report', async () => {
    setAuth(REPORTER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(403)
  })

  it('confirms successfully', async () => {
    setAuth(OTHER_USER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { confirmed: boolean; confirmsCount: number; resolved: boolean }
    }
    expect(body.success).toBe(true)
    expect(body.data.confirmed).toBe(true)
    expect(body.data.confirmsCount).toBe(1)
    expect(body.data.resolved).toBe(false)
  })

  it('returns 409 on duplicate confirm', async () => {
    setAuth(OTHER_USER)
    await app.request(confirmUrl(), {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(409)
  })

  it('promotes and resolves when threshold is reached', async () => {
    const { ER_POLICY } = await import('@concert-crawl/types')

    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_confirmer_${idx}`)
      const res = await app.request(confirmUrl(), {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(res.status).toBe(200)
      if (idx === ER_POLICY.confirmsRequired - 1) {
        const body = (await res.json()) as {
          data: { resolved: boolean; confirmsCount: number }
        }
        expect(body.data.resolved).toBe(true)
        expect(body.data.confirmsCount).toBe(ER_POLICY.confirmsRequired)
      }
    }
  })

  it('fans out watch-update notifications to status=watching users on promote', async () => {
    // Seed a watcher (status='watching'), a going user, and an interested
    // user — the fan-out should target only the watcher.
    const WATCHER = 'user_watcher_promote'
    const GOING = 'user_going_promote'
    const INTERESTED = 'user_interested_promote'
    await seedUserEvent(WATCHER, eventId, { status: 'watching' })
    await seedUserEvent(GOING, eventId, { status: 'going' })
    await seedUserEvent(INTERESTED, eventId, { status: 'interested' })

    const { ER_POLICY } = await import('@concert-crawl/types')
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_promote_confirmer_${idx}`)
      const res = await app.request(confirmUrl(), {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(res.status).toBe(200)
    }

    // Report was seeded with status='sold-out' by default → 'watch.soldout'.
    const rows = await db
      .select({
        userId: notifications.userId,
        category: notifications.category,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'user_notification'),
          eq(notifications.category, 'watch.soldout'),
        ),
      )
    const userIds = rows.map((row) => row.userId).sort()
    expect(userIds).toEqual([WATCHER])
    expect(rows[0]?.category).toBe('watch.soldout')
  })

  it('writes no watch-update notifications when no one is watching', async () => {
    const { ER_POLICY } = await import('@concert-crawl/types')
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_empty_confirmer_${idx}`)
      const res = await app.request(confirmUrl(), {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(res.status).toBe(200)
    }
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.category, 'watch.soldout'))
    expect(rows).toHaveLength(0)
  })

  it('does not re-fanout when a second cancelled report is promoted for an already-cancelled event', async () => {
    // Cancelled/postponed live on events.status (no DB unique constraint on
    // active promoted reports — that constraint exists only for sold-out via
    // migration 0032). This test exercises the code-level dedup gate.
    const WATCHER = 'user_dedup_watcher_cancelled'
    await seedUserEvent(WATCHER, eventId, { status: 'watching' })

    // First cancelled report — seed it and drive it to promotion.
    const firstReport = await seedEventReport(eventId, 'user_first_reporter', {
      status: 'cancelled',
    })
    const firstUrl = () =>
      `/v1/events/${eventId}/reports/${firstReport.id}/confirm`
    const { ER_POLICY } = await import('@concert-crawl/types')
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_first_cancel_confirmer_${idx}`)
      const res = await app.request(firstUrl(), {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(res.status).toBe(200)
    }

    // Sanity: watcher got exactly one watch.cancelled row.
    const firstRound = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, WATCHER),
          eq(notifications.category, 'watch.cancelled'),
        ),
      )
    expect(firstRound).toHaveLength(1)

    // Second cancelled report on the same event. Event is already flagged
    // cancelled (events.status='cancelled'), so promotion is a no-op for
    // user-visible state — no new watch.cancelled row should be written.
    const secondReport = await seedEventReport(
      eventId,
      'user_second_reporter',
      {
        status: 'cancelled',
      },
    )
    const secondUrl = () =>
      `/v1/events/${eventId}/reports/${secondReport.id}/confirm`
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_second_cancel_confirmer_${idx}`)
      const res = await app.request(secondUrl(), {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
      })
      expect(res.status).toBe(200)
    }

    const finalRows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, WATCHER),
          eq(notifications.category, 'watch.cancelled'),
        ),
      )
    expect(finalRows).toHaveLength(1)
  })
})

describe('DELETE /v1/events/:id/reports/:reportId', () => {
  let eventId: string
  let reportId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const report = await seedEventReport(eventId, REPORTER)
    reportId = report.id
  })

  const withdrawUrl = () => `/v1/events/${eventId}/reports/${reportId}`

  it('returns 401 without auth', async () => {
    const res = await app.request(withdrawUrl(), { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('returns 403 when a different user tries to withdraw', async () => {
    setAuth(OTHER_USER)
    const res = await app.request(withdrawUrl(), {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(403)
  })

  it('withdraws successfully', async () => {
    setAuth(REPORTER)
    const res = await app.request(withdrawUrl(), {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(204)
  })
})
