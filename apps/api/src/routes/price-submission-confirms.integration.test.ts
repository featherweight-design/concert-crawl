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

import { createApp } from '../app.js'
import {
  clearTables,
  seedEvent,
  seedVenue,
  seedPriceSubmission,
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when user tries to confirm their own submission', async () => {
    setAuth(SUBMITTER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(403)
  })

  it('confirms successfully and returns pending status below threshold', async () => {
    setAuth(CONFIRMER)
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  it('returns 409 on duplicate confirm', async () => {
    setAuth(CONFIRMER)
    await app.request(confirmUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmBody),
    })
    const res = await app.request(confirmUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmBody),
    })
    expect(res.status).toBe(409)
  })

  it('promotes to corroborated when threshold is reached', async () => {
    const { SP_POLICY } = await import('@concert-crawl/types')

    for (let idx = 0; idx < SP_POLICY.confirmsRequired; idx++) {
      setAuth(`user_confirmer_${idx}`)
      const res = await app.request(confirmUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmBody),
      })
      if (idx < SP_POLICY.confirmsRequired - 1) {
        expect(res.status).toBe(200)
      } else {
        expect(res.status).toBe(200)
        const body = (await res.json()) as {
          success: boolean
          data: { submissionStatus: string; confirmsCount: number }
        }
        expect(body.data.submissionStatus).toBe('corroborated')
        expect(body.data.confirmsCount).toBe(SP_POLICY.confirmsRequired)
      }
    }
  })
})
