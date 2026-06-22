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
  seedSubmissionConfirm,
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

describe('GET /v1/submissions/:id', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('returns 401 without auth', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const submission = await seedPriceSubmission(event.id, 'user_1')
    const res = await app.request(`/v1/submissions/${submission.id}`)
    expect(res.status).toBe(401)
  })

  it('returns submission by id', async () => {
    setAuth()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    const submission = await seedPriceSubmission(event.id, 'user_1')

    const res = await app.request(`/v1/submissions/${submission.id}`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { id: string; status: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(submission.id)
  })

  it('returns 404 for unknown id', async () => {
    setAuth()
    const res = await app.request(
      '/v1/submissions/00000000-0000-0000-0000-000000000000',
      { headers: { Authorization: 'Bearer test-token' } },
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /v1/submissions/:id/confirm', () => {
  let eventId: string
  let submissionId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const submission = await seedPriceSubmission(eventId, 'user_owner')
    submissionId = submission.id
  })

  it('returns 401 without auth', async () => {
    const res = await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when confirming own submission', async () => {
    setAuth('user_owner')
    const res = await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(403)
  })

  it('increments corroboration count and promotes after one non-submitter confirm', async () => {
    // 1/2 confirmation model: seed inserts with corroborationCount=1
    // (submitter = observation #1). One non-submitter confirm brings the
    // total to 2, which meets confirmsRequired=2 and promotes immediately.
    setAuth('user_confirmer')
    const res = await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { confirms: number; status: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.confirms).toBe(2)
    expect(body.data.status).toBe('corroborated')
  })

  it('keeps incrementing corroboration count after promotion (subsequent confirms)', async () => {
    // First confirm by user_2 — promotes
    setAuth('user_2')
    await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })

    // Second confirm by user_3 — still increments count; status stays
    // corroborated (the CASE WHEN preserves it via ELSE branch).
    setAuth('user_3')
    const res = await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: { confirms: number; status: string }
    }
    expect(body.data.confirms).toBe(3)
    expect(body.data.status).toBe('corroborated')
  })

  it('is idempotent for same user', async () => {
    setAuth('user_confirmer')
    await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    const res = await app.request(`/v1/submissions/${submissionId}/confirm`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
    })
    const body = (await res.json()) as {
      success: boolean
      data: { confirms: number }
    }
    expect(res.status).toBe(200)
    // Idempotent: the first confirm already bumped corroborationCount from 1
    // to 2 (and promoted the row). The duplicate confirm hits onConflictDoNothing,
    // skips the update, and reads back the existing count — still 2.
    expect(body.data.confirms).toBe(2)
  })
})

describe('POST /v1/submissions/:id/dispute', () => {
  let eventId: string
  let submissionId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const submission = await seedPriceSubmission(eventId, 'user_owner')
    submissionId = submission.id
  })

  it('returns 403 when disputing own submission', async () => {
    setAuth('user_owner')
    const res = await app.request(`/v1/submissions/${submissionId}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        floor: 50,
        vendor: 'AXS',
      }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when floor is missing', async () => {
    setAuth('user_disputer')
    const res = await app.request(`/v1/submissions/${submissionId}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ vendor: 'AXS' }),
    })
    expect(res.status).toBe(400)
  })

  it('creates dispute row and marks parent disputed', async () => {
    setAuth('user_disputer')
    const res = await app.request(`/v1/submissions/${submissionId}/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ floor: 50, vendor: 'AXS' }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: {
        disputedSubmissionId: string
        status: string
        priceMin: string
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.disputedSubmissionId).toBe(submissionId)
    expect(body.data.status).toBe('pending')
    expect(parseFloat(body.data.priceMin)).toBe(50)

    // Verify parent is marked disputed
    setAuth('user_owner')
    const parentRes = await app.request(`/v1/submissions/${submissionId}`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    const parentBody = (await parentRes.json()) as {
      data: { status: string }
    }
    expect(parentBody.data.status).toBe('disputed')
  })

  it('inherits vendor from parent when dispute body omits it (price-only contest scope)', async () => {
    const corroborated = await seedPriceSubmission(eventId, 'user_owner', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })

    setAuth('user_disputer')
    const res = await app.request(
      `/v1/submissions/${corroborated.id}/dispute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ floor: 35 }),
      },
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: {
        vendor: string
        tier: string
        sourceCategory: string | null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.vendor).toBe('AXS')
    expect(body.data.tier).toBe('GA')
    expect(body.data.sourceCategory).toBe('standard')
  })

  it('ignores vendor in dispute body — always inherits from parent (slot identity is fixed)', async () => {
    // Even if a client tries to override vendor (e.g. legacy UI still sends
    // it, or a malicious request hoping to flip the source bucket), the
    // server unconditionally inherits from the parent. Otherwise the dispute
    // mutates the (tier, source_category) slot the corroborated price lives
    // in — exactly what the price-only contest scope is meant to prevent.
    const corroborated = await seedPriceSubmission(eventId, 'user_owner', {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })

    setAuth('user_disputer')
    const res = await app.request(
      `/v1/submissions/${corroborated.id}/dispute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        // Try to flip the vendor — server must ignore.
        body: JSON.stringify({ floor: 35, vendor: 'Ticketmaster' }),
      },
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: { vendor: string }
    }
    expect(body.success).toBe(true)
    expect(body.data.vendor).toBe('AXS')
  })
})

describe('PATCH /v1/submissions/:id', () => {
  let eventId: string
  let submissionId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const submission = await seedPriceSubmission(eventId, 'user_owner')
    submissionId = submission.id
  })

  it('updates own pending submission', async () => {
    setAuth('user_owner')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ floor: 75 }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { priceMin: string }
    }
    expect(body.success).toBe(true)
    expect(parseFloat(body.data.priceMin)).toBe(75)
  })

  it('returns 403 for wrong owner', async () => {
    setAuth('user_other')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ floor: 75 }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 for non-pending submission', async () => {
    const corroboratedSub = await seedPriceSubmission(eventId, 'user_owner', {
      status: 'corroborated',
    })
    setAuth('user_owner')
    const res = await app.request(`/v1/submissions/${corroboratedSub.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ floor: 75 }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /v1/submissions/:id', () => {
  let eventId: string
  let submissionId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
    const submission = await seedPriceSubmission(eventId, 'user_owner')
    submissionId = submission.id
  })

  it('deletes own submission', async () => {
    setAuth('user_owner')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(204)
  })

  it('returns 403 for wrong owner', async () => {
    setAuth('user_other')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(403)
  })

  it('cascades and removes confirms on delete', async () => {
    await seedSubmissionConfirm(submissionId, 'user_confirmer')
    setAuth('user_owner')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBe(204)

    // Verify submission is gone (404)
    setAuth('user_owner')
    const checkRes = await app.request(`/v1/submissions/${submissionId}`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(checkRes.status).toBe(404)
  })
})
