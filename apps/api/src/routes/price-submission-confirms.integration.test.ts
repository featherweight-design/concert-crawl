import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { events, notifications, priceSubmissions } from '@concert-crawl/db'
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
  seedUserEvent,
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

describe('POST /v1/events/:id/price-submissions/:submissionId/confirm', () => {
  let eventId: string
  let submissionId: string
  const SUBMITTER = 'user_submitter'
  const CONFIRMER = 'user_confirmer'

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const submission = await seedPriceSubmission(eventId, SUBMITTER)
    submissionId = submission.id
  })

  const confirmUrl = () =>
    `/v1/events/${eventId}/price-submissions/${submissionId}/confirm`

  const confirmBody = { method: 'same-vendor' }

  it('returns 401 without auth', async () => {
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 for invalid method', async () => {
    setAuth(CONFIRMER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ method: 'invalid-method' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 404 when submission belongs to a different event', async () => {
    setAuth(CONFIRMER)
    const venue2 = await seedVenue({ name: 'Other Venue', slug: 'other-venue' })
    const event2 = await seedEvent(venue2.id)
    const wrongUrl = `/v1/events/${event2.id}/price-submissions/${submissionId}/confirm`
    const res = await app.request(wrongUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the event is hidden from consumers', async () => {
    // Regression test for Copilot review on PR #705: confirm flow must treat
    // hidden_from_consumer events as not-found so the promotion path can't
    // mutate a non-public event's prices.
    const hiddenVenue = await seedVenue({
      slug: `venue-hidden-${Date.now()}`,
    })
    const hiddenEvent = await seedEvent(hiddenVenue.id, {
      artist: 'Hidden Artist',
      hiddenFromConsumer: true,
    })
    const hiddenSubmission = await seedPriceSubmission(
      hiddenEvent.id,
      'user_hidden_submitter',
    )

    setAuth(CONFIRMER)
    const res = await app.request(
      `/v1/events/${hiddenEvent.id}/price-submissions/${hiddenSubmission.id}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(confirmBody),
      },
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when user tries to confirm their own submission', async () => {
    setAuth(SUBMITTER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(403)
  })

  it('bumps updatedAt even when the row stays pending (freshness signal)', async () => {
    // Regression test for Copilot review on PR #705: updatedAt must move on
    // every successful confirm, not just on promotion, so consumers can use
    // it as a freshness signal and to match /v1/submissions/:id/confirm.
    const imminentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const imminentEvent = await seedEvent(
      (await seedVenue({ slug: `venue-updatedat-${Date.now()}` })).id,
      { date: imminentDate, artist: 'UpdatedAt Artist' },
    )
    const imminentSubmission = await seedPriceSubmission(
      imminentEvent.id,
      'user_updatedat_submitter',
    )
    const beforeUpdatedAt = imminentSubmission.updatedAt

    // Wait long enough that a now() bump is observable in the millisecond
    // precision the tests use.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 25)
    })

    setAuth(CONFIRMER)
    const res = await app.request(
      `/v1/events/${imminentEvent.id}/price-submissions/${imminentSubmission.id}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(confirmBody),
      },
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { submissionStatus: string }
    }
    expect(body.data.submissionStatus).toBe('pending')

    const reloaded = await testDb
      .select({ updatedAt: priceSubmissions.updatedAt })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, imminentSubmission.id))
      .limit(1)
    expect(reloaded[0]!.updatedAt.getTime()).toBeGreaterThan(
      beforeUpdatedAt.getTime(),
    )
  })

  it('confirms successfully and stays pending when below the imminent-event threshold', async () => {
    // 1/2 confirmation model: the submitter is observation #1, so a single
    // non-submitter confirm hits the non-imminent threshold (2) and promotes
    // immediately. To exercise the below-threshold path we need an imminent
    // event (threshold = 3, so submitter + 1 confirm = 2 < 3 = pending).
    const imminentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const imminentEvent = await seedEvent(
      (await seedVenue({ slug: `venue-imminent-${Date.now()}` })).id,
      { date: imminentDate, artist: 'Imminent Artist' },
    )
    const imminentSubmission = await seedPriceSubmission(
      imminentEvent.id,
      'user_imminent_submitter',
    )
    const imminentUrl = `/v1/events/${imminentEvent.id}/price-submissions/${imminentSubmission.id}/confirm`

    setAuth(CONFIRMER)
    const res = await app.request(imminentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        confirmed: boolean
        submissionStatus: string
        confirmsCount: number
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.confirmed).toBe(true)
    expect(body.data.submissionStatus).toBe('pending')
    expect(body.data.confirmsCount).toBe(1)
  })

  it('promotes after one non-submitter confirm on a non-imminent event', async () => {
    // The default seedEvent date is far past, so confirmsRequired = 2. With
    // the submitter as observation #1, a single non-submitter confirm meets
    // the threshold and promotes the row to corroborated.
    setAuth(CONFIRMER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        confirmed: boolean
        submissionStatus: string
        confirmsCount: number
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.confirmed).toBe(true)
    expect(body.data.submissionStatus).toBe('corroborated')
    expect(body.data.confirmsCount).toBe(1)
  })

  it('returns 409 on duplicate confirm (imminent event, still pending after one confirm)', async () => {
    // Under the 1/2 model the default non-imminent event promotes on the first
    // confirm, so the duplicate-confirm path is only reachable on imminent
    // events (where one confirm leaves the row at 2/3 = pending).
    const imminentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const imminentEvent = await seedEvent(
      (await seedVenue({ slug: `venue-duplicate-${Date.now()}` })).id,
      { date: imminentDate, artist: 'Duplicate-Confirm Artist' },
    )
    const imminentSubmission = await seedPriceSubmission(
      imminentEvent.id,
      'user_duplicate_submitter',
    )
    const imminentUrl = `/v1/events/${imminentEvent.id}/price-submissions/${imminentSubmission.id}/confirm`

    setAuth(CONFIRMER)
    await app.request(imminentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(confirmBody),
    })
    const res = await app.request(imminentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(409)
  })

  it('promotes when total observations (submitter + confirms) meets the imminent threshold', async () => {
    const { SP_POLICY } = await import('@concert-crawl/types')

    const imminentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const imminentVenue = await seedVenue({
      slug: `venue-promote-${Date.now()}`,
    })
    const imminentEvent = await seedEvent(imminentVenue.id, {
      date: imminentDate,
      artist: 'Imminent Promotion Artist',
    })
    const imminentSubmission = await seedPriceSubmission(
      imminentEvent.id,
      'user_promote_submitter',
    )
    const imminentUrl = `/v1/events/${imminentEvent.id}/price-submissions/${imminentSubmission.id}/confirm`

    // confirmsRequiredImminent counts total observations. Submitter = 1, so
    // we need (confirmsRequiredImminent - 1) non-submitter confirms.
    const confirmsNeeded = SP_POLICY.confirmsRequiredImminent - 1

    for (let idx = 0; idx < confirmsNeeded; idx++) {
      setAuth(`user_confirmer_${idx}`)
      const res = await app.request(imminentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(confirmBody),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        success: boolean
        data: { submissionStatus: string; confirmsCount: number }
      }
      if (idx < confirmsNeeded - 1) {
        expect(body.data.submissionStatus).toBe('pending')
      } else {
        expect(body.data.submissionStatus).toBe('corroborated')
        expect(body.data.confirmsCount).toBe(confirmsNeeded)
      }
    }
  })
})

describe('confirm promotion: watch.pricedrop fan-out (#1107)', () => {
  const SUBMITTER = 'user_drop_submitter'

  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  // The default seedEvent date is in the past, so confirmsRequired = 2 and a
  // single non-submitter confirm promotes the submission to corroborated.
  async function confirmAs(
    userId: string,
    eventId: string,
    submissionId: string,
  ): Promise<Response> {
    setAuth(userId)
    return app.request(
      `/v1/events/${eventId}/price-submissions/${submissionId}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ method: 'same-vendor' }),
      },
    )
  }

  async function pricedropRows(): Promise<
    { userId: string; title: string; body: string | null }[]
  > {
    return testDb
      .select({
        userId: notifications.userId,
        title: notifications.title,
        body: notifications.body,
      })
      .from(notifications)
      .where(eq(notifications.category, 'watch.pricedrop'))
  }

  it('fires one watch.pricedrop per watcher when the promoted price is strictly lower', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { ticketPriceMin: '48' })
    const WATCHER = 'user_confirm_drop_watcher'
    await seedUserEvent(WATCHER, event.id, { status: 'watching' })
    await seedUserEvent('user_confirm_drop_going', event.id, {
      status: 'going',
    })
    await seedUserEvent('user_confirm_drop_interested', event.id, {
      status: 'interested',
    })
    const submission = await seedPriceSubmission(event.id, SUBMITTER, {
      priceMin: '32',
    })

    const res = await confirmAs('user_confirm_1', event.id, submission.id)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { submissionStatus: string }
    }
    expect(body.data.submissionStatus).toBe('corroborated')

    const [updatedEvent] = await testDb
      .select({
        ticketPriceMin: events.ticketPriceMin,
        priceSource: events.priceSource,
      })
      .from(events)
      .where(eq(events.id, event.id))
      .limit(1)
    expect(updatedEvent?.ticketPriceMin).toBe('32.00')
    expect(updatedEvent?.priceSource).toBe('community')

    const rows = await pricedropRows()
    expect(rows.map((row) => row.userId)).toEqual([WATCHER])
    expect(rows[0]?.title).toMatch(/\$32/)
    expect(rows[0]?.body).toMatch(/\$48/)
  })

  it('does not fan out again on a further confirm after promotion', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { ticketPriceMin: '48' })
    await seedUserEvent('user_confirm_repeat_watcher', event.id, {
      status: 'watching',
    })
    const submission = await seedPriceSubmission(event.id, SUBMITTER, {
      priceMin: '32',
    })

    const first = await confirmAs('user_confirm_a', event.id, submission.id)
    expect(first.status).toBe(200)
    const second = await confirmAs('user_confirm_b', event.id, submission.id)
    // Already corroborated, so the confirm is refused before any write.
    expect(second.status).toBe(400)

    expect(await pricedropRows()).toHaveLength(1)
  })

  it('does not fire when the promoted price equals the current event price', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { ticketPriceMin: '35' })
    await seedUserEvent('user_confirm_equal_watcher', event.id, {
      status: 'watching',
    })
    const submission = await seedPriceSubmission(event.id, SUBMITTER, {
      priceMin: '35',
    })

    const res = await confirmAs('user_confirm_eq', event.id, submission.id)
    expect(res.status).toBe(200)
    expect(await pricedropRows()).toHaveLength(0)
  })

  it('does not fire when the promoted price is higher than the current event price', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, { ticketPriceMin: '30' })
    await seedUserEvent('user_confirm_higher_watcher', event.id, {
      status: 'watching',
    })
    const submission = await seedPriceSubmission(event.id, SUBMITTER, {
      priceMin: '40',
    })

    const res = await confirmAs('user_confirm_hi', event.id, submission.id)
    expect(res.status).toBe(200)
    expect(await pricedropRows()).toHaveLength(0)
  })

  it('does not fire when the event had no previous price', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedUserEvent('user_confirm_first_watcher', event.id, {
      status: 'watching',
    })
    const submission = await seedPriceSubmission(event.id, SUBMITTER, {
      priceMin: '25',
    })

    const res = await confirmAs('user_confirm_first', event.id, submission.id)
    expect(res.status).toBe(200)

    const [updatedEvent] = await testDb
      .select({ ticketPriceMin: events.ticketPriceMin })
      .from(events)
      .where(eq(events.id, event.id))
      .limit(1)
    expect(updatedEvent?.ticketPriceMin).toBe('25.00')
    expect(await pricedropRows()).toHaveLength(0)
  })

  it('does not fire while the submission stays pending below threshold', async () => {
    const imminentDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      date: imminentDate,
      ticketPriceMin: '48',
    })
    await seedUserEvent('user_confirm_pending_watcher', event.id, {
      status: 'watching',
    })
    const submission = await seedPriceSubmission(event.id, SUBMITTER, {
      priceMin: '32',
    })

    const res = await confirmAs('user_confirm_p', event.id, submission.id)
    expect(res.status).toBe(200)

    const [unchanged] = await testDb
      .select({ ticketPriceMin: events.ticketPriceMin })
      .from(events)
      .where(eq(events.id, event.id))
      .limit(1)
    expect(unchanged?.ticketPriceMin).toBe('48.00')
    expect(await pricedropRows()).toHaveLength(0)
  })
})
