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

  it('accepts Etix, the vendor picker value behind the most prod ticket links', async () => {
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
        vendor: 'Etix',
        howFound: 'bought_myself',
        sourceCategory: 'standard',
      }),
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ data: { vendor: 'Etix' } })
  })

  it('rejects a vendor outside the enum with 422', async () => {
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
        vendor: 'https://phishing.example.com',
        howFound: 'bought_myself',
      }),
    })
    expect(res.status).toBe(422)
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

  it('allows a follow-up submission when under the 3-act limit (#876)', async () => {
    setAuth()
    // One recent non-pending act — under the limit, so the follow-up lands.
    await seedPriceSubmission(eventId, 'user_abc123', {
      status: 'corroborated',
      tier: 'Lawn',
    })
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(201)
  })

  it('returns 429 after 3 contribution acts within 24h (#876)', async () => {
    setAuth()
    // Three distinct acts (distinct createdAt) inside the window. Non-pending
    // so the 409 pending check does not fire first.
    const now = Date.now()
    const tiers = ['Lawn', 'Pit', 'Reserved'] as const
    for (const [idx, tier] of tiers.entries()) {
      await seedPriceSubmission(eventId, 'user_abc123', {
        status: 'corroborated',
        tier,
        createdAt: new Date(now - (idx + 1) * 60 * 1000),
      })
    }
    const res = await app.request(`/v1/events/${eventId}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(TEST_BODY),
    })
    expect(res.status).toBe(429)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.error).toBe('Rate limit: 3 submissions per event per 24h')
  })

  it('serializes concurrent submissions — exactly one lands (#876 TOCTOU)', async () => {
    setAuth()
    const fire = () =>
      app.request(`/v1/events/${eventId}/price-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(TEST_BODY),
      })
    const responses = await Promise.all([fire(), fire(), fire()])
    const statuses = responses.map((res) => res.status).sort()
    expect(statuses).toEqual([201, 409, 409])

    const rows = await testDb
      .select({ id: priceSubmissions.id })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId))
    expect(rows).toHaveLength(1)
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

  it('reports submissionsRemaining for the caller (#876)', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)

    // Anonymous caller gets the full allowance.
    clearAuth()
    const anonRes = await app.request(
      `/v1/events/${event.id}/price-submissions`,
    )
    const anonBody = (await anonRes.json()) as {
      data: { submissionsRemaining: number }
    }
    expect(anonBody.data.submissionsRemaining).toBe(3)

    // Two recent acts (distinct createdAt) → 1 remaining. Includes a stale
    // row: staleness hides a price from display but the contribution act
    // still counts against the window, mirroring the POST 429 check.
    const now = Date.now()
    await seedPriceSubmission(event.id, 'user_abc123', {
      status: 'corroborated',
      tier: 'Lawn',
      createdAt: new Date(now - 60 * 1000),
    })
    await seedPriceSubmission(event.id, 'user_abc123', {
      status: 'stale',
      tier: 'Pit',
      createdAt: new Date(now - 2 * 60 * 1000),
    })
    // Outside the 24h window — must not count.
    await seedPriceSubmission(event.id, 'user_abc123', {
      status: 'corroborated',
      tier: 'Reserved',
      createdAt: new Date(now - 48 * 60 * 60 * 1000),
    })
    setAuth()
    const authRes = await app.request(
      `/v1/events/${event.id}/price-submissions`,
      { headers: { Authorization: 'Bearer test-token' } },
    )
    const authBody = (await authRes.json()) as {
      data: { submissionsRemaining: number }
    }
    expect(authBody.data.submissionsRemaining).toBe(1)
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

describe('price submissions — anonymous access (#794)', () => {
  // Replaces the REQUIRE_BETA_AUTH 401 assertion. The router-wide gate is gone,
  // so reading is open while every write keeps its own per-route guard.
  it('serves GET /:id/price-submissions to an anonymous caller', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    expect(res.status).toBe(200)
  })

  it('withholds the submitter Clerk id from an anonymous caller', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_leak_check')

    const res = await app.request(`/v1/events/${event.id}/price-submissions`)
    const body = (await res.json()) as {
      data: { submissions: { userId: string | null }[] }
    }
    expect(body.data.submissions).toHaveLength(1)
    expect(body.data.submissions[0]?.userId).toBeNull()
    expect(JSON.stringify(body)).not.toContain('user_leak_check')
  })

  it('withholds another submitter Clerk id from a signed-in caller', async () => {
    await clearTables()
    const venue = await seedVenue()
    const event = await seedEvent(venue.id)
    await seedPriceSubmission(event.id, 'user_leak_check')
    await seedPriceSubmission(event.id, 'user_abc123')

    setAuth('user_abc123')
    const res = await app.request(`/v1/events/${event.id}/price-submissions`, {
      headers: { Authorization: 'Bearer test-token' },
    })
    const body = (await res.json()) as {
      data: { submissions: { userId: string | null }[] }
    }
    // The caller keeps their own id — the "yours" affordance reads it — and
    // sees null on the other submitter's row.
    const ids = body.data.submissions.map((sub) => sub.userId)
    expect(ids).toContain('user_abc123')
    expect(JSON.stringify(body)).not.toContain('user_leak_check')
  })

  it('still rejects an anonymous POST /:id/price-submissions', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000001/price-submissions',
      { method: 'POST' },
    )
    expect(res.status).toBe(401)
  })

  it('still rejects an anonymous POST /:id/price-submissions/batch', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000001/price-submissions/batch',
      { method: 'POST' },
    )
    expect(res.status).toBe(401)
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

  // R4-1: The counter-path route must enforce the same self-dispute 403 as
  // POST /v1/submissions/:id/dispute (submissions.ts:143-148). Without it a
  // user could contest their OWN row via this surface — the contest would
  // land in the admin queue and flip the parent's visible state to
  // 'disputed' for no legitimate reason.
  it('rejects self-dispute with 403', async () => {
    const venue = await seedVenue({
      name: 'Self Dispute PS',
      slug: 'self-dispute-ps',
    })
    const event = await seedEvent(venue.id, { date: '2027-07-04' })
    await seedUserProfile('submitter-self', { handle: 'submitter_self' })

    const parent = await seedPriceSubmission(event.id, 'submitter-self', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'saw_listing',
      sourceCategory: 'standard',
      status: 'corroborated',
    })

    setAuth('submitter-self')
    const res = await app.request(`/v1/events/${event.id}/price-submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        priceMin: 55,
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
        disputedSubmissionId: parent.id,
      }),
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toMatch(/your own submission/i)

    // Parent must NOT flip to 'disputed' — the 403 must short-circuit
    // before the parent-flip transaction runs. Otherwise the rejection
    // would still leak the contested visual state.
    const [reloadedParent] = await testDb
      .select({ status: priceSubmissions.status })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, parent.id))
    expect(reloadedParent?.status).toBe('corroborated')
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
