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
  seedUserProfile,
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

const TEST_BODY = {
  priceMin: 35,
  tier: 'GA',
  vendor: 'Ticketmaster',
  howFound: 'bought_myself',
}

describe('POST /v1/events/:id/price-submissions', () => {
  let eventId: string

  beforeEach(async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    eventId = event.id
  })

  it('returns 401 without auth', async () => {
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(401)
  })

  it('creates a pending submission', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ ...TEST_BODY, priceMax: 65 }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: {
        status: string
        priceMin: string
        tier: string
        corroborationCount: number
        sourceCategory: string | null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('pending')
    expect(parseFloat(body.data.priceMin)).toBe(35)
    expect(body.data.tier).toBe('GA')
    // Submitter counts as observation #1 in the 1/2 model
    expect(body.data.corroborationCount).toBe(1)
    // sourceCategory is optional, but the server derives it from
    // (vendor, howFound) when omitted so the partial unique index + boxoffice
    // staleness exemption fire immediately. TEST_BODY uses
    // vendor=Ticketmaster + howFound=bought_myself → standard.
    expect(body.data.sourceCategory).toBe('standard')
  })

  it('derives sourceCategory=boxoffice from VenueBoxOffice vendor when omitted', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        priceMin: 25,
        tier: 'GA',
        vendor: 'VenueBoxOffice',
        howFound: 'bought_myself',
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      data: { sourceCategory: string | null }
    }
    expect(body.data.sourceCategory).toBe('boxoffice')
  })

  it('derives sourceCategory=boxoffice from at_the_venue howFound when omitted', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        priceMin: 25,
        tier: 'GA',
        vendor: 'Ticketmaster',
        howFound: 'at_the_venue',
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      data: { sourceCategory: string | null }
    }
    expect(body.data.sourceCategory).toBe('boxoffice')
  })

  it('persists sourceCategory when provided and returns it on GET', async () => {
    setAuth()
    const postRes = await app.request(
      `/v1/events/${eventId}/price-submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          priceMin: 25,
          tier: 'GA',
          vendor: 'VenueBoxOffice',
          howFound: 'at_the_venue',
          sourceCategory: 'boxoffice',
        }),
      },
    )
    expect(postRes.status).toBe(201)
    const postBody = (await postRes.json()) as {
      success: boolean
      data: { sourceCategory: string; corroborationCount: number }
    }
    expect(postBody.data.sourceCategory).toBe('boxoffice')
    expect(postBody.data.corroborationCount).toBe(1)

    const getRes = await app.request(
      `/v1/events/${eventId}/price-submissions`,
      { headers: { Authorization: 'Bearer test-token' } },
    )
    const getBody = (await getRes.json()) as {
      data: {
        submissions: Array<{
          userId: string
          sourceCategory: string | null
          corroborationCount: number
        }>
      }
    }
    const ourRow = getBody.data.submissions.find(
      (sub) => sub.userId === 'user_abc123',
    )
    expect(ourRow?.sourceCategory).toBe('boxoffice')
    expect(ourRow?.corroborationCount).toBe(1)
  })

  it('returns 422 when sourceCategory is not one of the enum values', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ ...TEST_BODY, sourceCategory: 'invalid' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 when required fields are missing', async () => {
    setAuth()
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ priceMax: 65 }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 409 when user already has a pending submission', async () => {
    setAuth()
    await seedPriceSubmission(eventId, 'user_abc123')
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(409)
  })

  it('returns 429 when user submits within 24h (non-pending submission exists)', async () => {
    setAuth()
    await seedPriceSubmission(eventId, 'user_abc123', {
      status: 'corroborated',
    })
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(429)
  })
})

describe('GET /v1/events/:id/price-submissions', () => {
  it('returns submissions with enriched shape', async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_1', {
      status: 'corroborated',
      priceMin: '40',
    })

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    const body = (await res.json()) as {
      success: boolean
      data: {
        submissions: Array<{ status: string; confirms: number; byYou: boolean }>
        alreadySubmitted: boolean
        userSubmission: null
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.submissions[0]?.status).toBe('corroborated')
    expect(typeof body.data.submissions[0]?.confirms).toBe('number')
    expect(body.data.alreadySubmitted).toBe(false)
    expect(body.data.userSubmission).toBeNull()
  })

  it('filters out stale submissions', async () => {
    clearAuth()
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_1', { status: 'stale' })

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    const body = (await res.json()) as {
      success: boolean
      data: { submissions: Array<unknown> }
    }
    expect(body.success).toBe(true)
    expect(body.data.submissions).toHaveLength(0)
  })
})

describe('GET /v1/events/:id/price-submissions — beta auth gate', () => {
  it('returns 401 without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { priceSubmissionsRouter: freshRouter } =
        await import('./price-submissions.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request(
        '/v1/events/00000000-0000-0000-0000-000000000001/price-submissions',
      )
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })
})

// Task 5b — counter-creation via POST /v1/events/:eventId/price-submissions.
// This is the SECOND counter-creation path (CounterSubmitSheet posts here with
// `disputedSubmissionId` in the body). Must mirror the /v1/submissions/:id/dispute
// route's contract: 1-pending-counter-per-parent invariant, parent-flip to
// 'disputed' in the same transaction, and slot-identity inheritance from parent.
describe('POST /v1/events/:eventId/price-submissions — counter path', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  it('rejects a 2nd pending counter against the same parent with 409', async () => {
    const venue = await seedVenue({
      name: 'Dup Counter PS',
      slug: 'dup-counter-ps',
    })
    const event = await seedEvent(venue.id, { date: '2027-07-01' })
    await seedUserProfile('parent-user-ps', { handle: 'parent_ps' })
    await seedUserProfile('chal-1-ps', { handle: 'chal1_ps' })
    await seedUserProfile('chal-2-ps', { handle: 'chal2_ps' })

    const parent = await seedPriceSubmission(event.id, 'parent-user-ps', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'saw_listing',
      sourceCategory: 'standard',
      status: 'corroborated',
    })

    setAuth('chal-1-ps')
    const first = await app.request(
      `/v1/events/${event.id}/price-submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          priceMin: 50,
          tier: 'GA',
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          disputedSubmissionId: parent.id,
        }),
      },
    )
    expect(first.status).toBe(201)

    setAuth('chal-2-ps')
    const second = await app.request(
      `/v1/events/${event.id}/price-submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          priceMin: 60,
          tier: 'GA',
          vendor: 'AXS',
          howFound: 'saw_listing',
          sourceCategory: 'standard',
          disputedSubmissionId: parent.id,
        }),
      },
    )
    expect(second.status).toBe(409)
    const body = (await second.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/already pending/i)
  })

  it('flips the parent row to disputed when a counter is filed', async () => {
    const venue = await seedVenue({
      name: 'Flip Parent PS',
      slug: 'flip-parent-ps',
    })
    const event = await seedEvent(venue.id, { date: '2027-07-02' })
    await seedUserProfile('flip-parent', { handle: 'flip_parent' })
    await seedUserProfile('flip-chal', { handle: 'flip_chal' })

    const parent = await seedPriceSubmission(event.id, 'flip-parent', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'saw_listing',
      sourceCategory: 'standard',
      status: 'corroborated',
    })

    setAuth('flip-chal')
    const res = await app.request(`/v1/events/${event.id}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        priceMin: 70,
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
        disputedSubmissionId: parent.id,
      }),
    })
    expect(res.status).toBe(201)

    const [reloadedParent] = await testDb
      .select({ status: priceSubmissions.status })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, parent.id))
    expect(reloadedParent?.status).toBe('disputed')
  })

  it('overwrites submitter-supplied slot fields with parent values', async () => {
    const venue = await seedVenue({
      name: 'Slot Inherit',
      slug: 'slot-inherit',
    })
    const event = await seedEvent(venue.id, { date: '2027-07-03' })
    await seedUserProfile('slot-parent', { handle: 'slot_parent' })
    await seedUserProfile('slot-chal', { handle: 'slot_chal' })

    const parent = await seedPriceSubmission(event.id, 'slot-parent', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'saw_listing',
      sourceCategory: 'standard',
      status: 'corroborated',
    })

    setAuth('slot-chal')
    const res = await app.request(`/v1/events/${event.id}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        priceMin: 80,
        // Submitter tries to override slot fields — server must IGNORE these
        // when disputedSubmissionId is set and inherit from the parent. Without
        // this inheritance the counter would land in a different (tier,
        // source_category) slot than the parent and trip the admin resolve
        // transaction's same-slot assertions (spec §4.3).
        tier: 'VIP',
        vendor: 'Ticketmaster',
        howFound: 'bought_myself',
        sourceCategory: 'resale',
        disputedSubmissionId: parent.id,
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      success: boolean
      data: {
        tier: string
        vendor: string
        sourceCategory: string
        howFound: string
      }
    }
    expect(body.data.tier).toBe('GA') // parent's value, not submitter's 'VIP'
    expect(body.data.vendor).toBe('AXS') // parent's value, not 'Ticketmaster'
    expect(body.data.sourceCategory).toBe('standard') // parent's value, not 'resale'
    // howFound is NOT slot identity — submitter's value is preserved. This
    // intentionally differs from the /v1/submissions/:id/dispute route which
    // inherits howFound; that small inconsistency is out of scope for this PR.
    expect(body.data.howFound).toBe('bought_myself')
  })
})
