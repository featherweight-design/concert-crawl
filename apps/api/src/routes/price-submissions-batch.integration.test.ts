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

import { eq } from 'drizzle-orm'
import { priceSubmissions } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
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

// The API accepts any HowFound value regardless of vendor — 'at_the_venue'
// here exercises that. (The web client happens to derive 'bought_myself' for
// boxoffice via howFoundForSource; the endpoint does not enforce pairing.)
const BATCH_BODY = {
  vendor: 'VenueBoxOffice',
  howFound: 'at_the_venue',
  sourceCategory: 'boxoffice',
  tiers: [
    { tier: 'GA', priceMin: 45 },
    { tier: 'VIP', priceMin: 120, priceMax: 150 },
  ],
}

type RowError = { index: number; tier: string | null; error: string }

describe('POST /v1/events/:id/price-submissions/batch', () => {
  let eventId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  const postBatch = (body: unknown) =>
    app.request(`/v1/events/${eventId}/price-submissions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(body),
    })

  it('returns 401 without auth', async () => {
    const res = await postBatch(BATCH_BODY)
    expect(res.status).toBe(401)
  })

  it('creates two pending rows for a 2-tier batch (happy path)', async () => {
    setAuth()
    const res = await postBatch(BATCH_BODY)
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{
        id: string
        status: string
        tier: string
        priceMin: string
        priceMax: string | null
        vendor: string
        howFound: string
        sourceCategory: string | null
        corroborationCount: number
        disputedSubmissionId: string | null
      }>
    }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    const gaRow = body.data.find((row) => row.tier === 'GA')
    const vipRow = body.data.find((row) => row.tier === 'VIP')
    expect(gaRow).toBeDefined()
    expect(vipRow).toBeDefined()
    expect(parseFloat(gaRow!.priceMin)).toBe(45)
    expect(gaRow!.priceMax).toBeNull()
    expect(parseFloat(vipRow!.priceMin)).toBe(120)
    expect(parseFloat(vipRow!.priceMax!)).toBe(150)
    for (const row of body.data) {
      expect(row.status).toBe('pending')
      expect(row.vendor).toBe('VenueBoxOffice')
      expect(row.howFound).toBe('at_the_venue')
      expect(row.sourceCategory).toBe('boxoffice')
      // Submitter counts as observation #1 (1/2 confirmation model)
      expect(row.corroborationCount).toBe(1)
      expect(row.disputedSubmissionId).toBeNull()
    }
    const dbRows = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(dbRows).toHaveLength(2)
  })

  it('accepts a single-tier batch (N=1) identically to the single endpoint insert', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      tiers: [{ tier: 'GA', priceMin: 45 }],
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      data: Array<{ tier: string; status: string; corroborationCount: number }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]!.tier).toBe('GA')
    expect(body.data[0]!.status).toBe('pending')
    expect(body.data[0]!.corroborationCount).toBe(1)
  })

  it('derives sourceCategory from (vendor, howFound) when omitted, on every row', async () => {
    setAuth()
    const res = await postBatch({
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      tiers: [
        { tier: 'GA', priceMin: 30 },
        { tier: 'Pit', priceMin: 60 },
      ],
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      data: Array<{ sourceCategory: string | null }>
    }
    for (const row of body.data) {
      expect(row.sourceCategory).toBe('boxoffice')
    }
  })

  it('rejects an empty tiers array with 422', async () => {
    setAuth()
    const res = await postBatch({ ...BATCH_BODY, tiers: [] })
    expect(res.status).toBe(422)
  })

  it('rejects more than 10 tier rows with 422', async () => {
    setAuth()
    const elevenRows = Array.from({ length: 11 }, () => ({
      tier: 'GA',
      priceMin: 45,
    }))
    const res = await postBatch({ ...BATCH_BODY, tiers: elevenRows })
    expect(res.status).toBe(422)
  })

  it('rejects duplicate tiers within the request with 422, before any insert', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      tiers: [
        { tier: 'GA', priceMin: 45 },
        { tier: 'GA', priceMin: 50 },
      ],
    })
    expect(res.status).toBe(422)
    const dbRows = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(dbRows).toHaveLength(0)
  })

  it('returns a per-row indexed error when one row price is out of range, inserts zero rows', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      tiers: [
        { tier: 'GA', priceMin: 45 },
        { tier: 'VIP', priceMin: 5000 },
      ],
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { success: boolean; errors: RowError[] }
    expect(body.success).toBe(false)
    expect(body.errors.some((rowError) => rowError.index === 1)).toBe(true)
    const dbRows = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(dbRows).toHaveLength(0)
  })

  it('rejects disputedSubmissionId in the batch body with 422', async () => {
    setAuth()
    const res = await postBatch({
      ...BATCH_BODY,
      disputedSubmissionId: '2b3f8a10-0000-4000-8000-000000000000',
    })
    expect(res.status).toBe(422)
  })

  it('returns 404 for an unknown event', async () => {
    setAuth()
    const res = await app.request(
      `/v1/events/2b3f8a10-0000-4000-8000-000000000000/price-submissions/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(BATCH_BODY),
      },
    )
    expect(res.status).toBe(404)
  })
})
