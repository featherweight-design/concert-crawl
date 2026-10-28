import { describe, it, expect, beforeEach, vi } from 'vitest'

interface TestAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedPriceSubmission,
  seedSubmissionConfirm,
  seedUserEvent,
  seedVenue,
} from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import {
  auditLog,
  events,
  priceSubmissions,
  submissionConfirms,
  userEvents,
  venues,
} from '@concert-crawl/db'
import { desc, eq } from 'drizzle-orm'
import { updateEventPrice } from '@concert-crawl/price-pipeline'

const app = createApp()

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } }
}

const remove = (venueId: string, body: unknown): Promise<Response> =>
  app.request(`/v1/admin/venues/${venueId}/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

async function seedPricedVenue(slug: string) {
  const venue = await seedVenue({ name: slug, slug })
  const event = await seedEvent(venue.id, {
    artist: `${slug} artist`,
    ticketPriceMin: '25',
    ticketPriceMax: '40',
    priceSource: 'community',
  })
  const original = await seedPriceSubmission(event.id, 'user_submitter', {
    status: 'corroborated',
  })
  // A price check on the original: the self-reference must not block the
  // delete.
  const counter = await seedPriceSubmission(event.id, 'user_checker', {
    disputedSubmissionId: original.id,
    tier: 'VIP',
  })
  await seedSubmissionConfirm(original.id, 'user_confirmer')
  await seedUserEvent('user_watcher', event.id, { savedPrice: '30' })
  return { venue, event, original, counter }
}

describe('admin venue removal', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('requires an admin role', async () => {
    setAuth('user')
    const { venue } = await seedPricedVenue('church')
    expect((await remove(venue.id, { reason: 'venue asked' })).status).toBe(403)
    const [row] = await testDb
      .select({ active: venues.active })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.active).toBe(true)
  })

  it('requires a reason', async () => {
    setAuth('admin')
    const { venue } = await seedPricedVenue('church')
    expect((await remove(venue.id, { reason: '  ' })).status).toBe(400)
  })

  it('returns 404 for an unknown venue', async () => {
    setAuth('admin')
    const res = await remove('00000000-0000-4000-8000-000000000000', {
      reason: 'venue asked',
    })
    expect(res.status).toBe(404)
  })

  it('hides the shows, stops crawling, deletes every price and keeps the events', async () => {
    setAuth('admin')
    const { venue, event } = await seedPricedVenue('church')

    const res = await remove(venue.id, { reason: 'venue emailed 2026-10-28' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { submissionsDeleted: number; eventPricesCleared: number }
    }
    expect(body.data.submissionsDeleted).toBe(2)
    expect(body.data.eventPricesCleared).toBe(1)

    const [venueRow] = await testDb
      .select({ active: venues.active, crawlPausedAt: venues.crawlPausedAt })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(venueRow?.active).toBe(false)
    expect(venueRow?.crawlPausedAt).toBeInstanceOf(Date)

    const [eventRow] = await testDb
      .select({
        min: events.ticketPriceMin,
        max: events.ticketPriceMax,
        source: events.priceSource,
      })
      .from(events)
      .where(eq(events.id, event.id))
    expect(eventRow).toEqual({ min: null, max: null, source: null })

    expect(
      await testDb
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.eventId, event.id)),
    ).toHaveLength(0)
    expect(await testDb.select().from(submissionConfirms)).toHaveLength(0)

    // The event row and users' Watching entries survive.
    expect(
      await testDb
        .select()
        .from(userEvents)
        .where(eq(userEvents.eventId, event.id)),
    ).toHaveLength(1)

    const [audit] = await testDb
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(1)
    expect(audit?.action).toBe('venue.remove')
    expect(audit?.targetId).toBe(venue.id)
    expect(audit?.metadata).toMatchObject({
      reason: 'venue emailed 2026-10-28',
      wasActive: true,
      wasCrawlPaused: false,
      submissionsDeleted: 2,
      eventPricesCleared: 1,
      savedPricesCleared: 1,
    })
    expect(
      await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'venue.remove')),
    ).toHaveLength(1)
  })

  it("takes the venue's past shows off the artist page, and activation brings them back", async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Church', slug: 'church' })
    await seedArtist({ name: 'Past Band' })
    await seedEvent(venue.id, { artist: 'Past Band', date: '2025-06-01' })
    const pastShows = async () => {
      const res = await app.request('/v1/artists/past-band')
      expect(res.status).toBe(200)
      const body = (await res.json()) as { data: { past: unknown[] } }
      return body.data.past
    }
    expect(await pastShows()).toHaveLength(1)

    expect((await remove(venue.id, { reason: 'venue asked' })).status).toBe(200)
    expect(await pastShows()).toHaveLength(0)

    const reactivate = await app.request(`/v1/admin/venues/${venue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    })
    expect(reactivate.status).toBe(200)
    expect(await pastShows()).toHaveLength(1)
  })

  it('stops an in-flight price pipeline from refilling a removed venue', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Church', slug: 'church' })
    const event = await seedEvent(venue.id)
    expect((await remove(venue.id, { reason: 'venue asked' })).status).toBe(200)

    await updateEventPrice(event.id, {
      priceMin: 20,
      priceMax: 30,
      source: 'structured_data',
    })

    const [row] = await testDb
      .select({ min: events.ticketPriceMin })
      .from(events)
      .where(eq(events.id, event.id))
    expect(row?.min).toBeNull()
  })

  it('leaves other venues untouched', async () => {
    setAuth('admin')
    const { venue } = await seedPricedVenue('church')
    const other = await seedPricedVenue('bluebird')

    expect((await remove(venue.id, { reason: 'venue asked' })).status).toBe(200)

    const [otherVenue] = await testDb
      .select({ active: venues.active, crawlPausedAt: venues.crawlPausedAt })
      .from(venues)
      .where(eq(venues.id, other.venue.id))
    expect(otherVenue).toEqual({ active: true, crawlPausedAt: null })
    const [otherEvent] = await testDb
      .select({ min: events.ticketPriceMin })
      .from(events)
      .where(eq(events.id, other.event.id))
    expect(otherEvent?.min).toBe('25.00')
    expect(
      await testDb
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.eventId, other.event.id)),
    ).toHaveLength(2)
  })

  it('keeps the original pause time when the venue was already paused', async () => {
    setAuth('admin')
    const { venue } = await seedPricedVenue('church')
    const pausedAt = new Date('2026-10-01T00:00:00Z')
    await testDb
      .update(venues)
      .set({ crawlPausedAt: pausedAt })
      .where(eq(venues.id, venue.id))

    expect((await remove(venue.id, { reason: 'venue asked' })).status).toBe(200)

    const [row] = await testDb
      .select({ crawlPausedAt: venues.crawlPausedAt })
      .from(venues)
      .where(eq(venues.id, venue.id))
    expect(row?.crawlPausedAt?.toISOString()).toBe(pausedAt.toISOString())
  })
})

describe('prices on an inactive venue', () => {
  const asUser = (userId: string) => {
    authState.current = {
      userId,
      sessionClaims: { metadata: { role: 'user' } },
    }
  }
  const post = (path: string, body: unknown) =>
    app.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify(body),
    })

  let eventId: string
  let submissionId: string

  beforeEach(async () => {
    authState.current = null
    await clearTables()
    const venue = await seedVenue({ active: false })
    const event = await seedEvent(venue.id)
    eventId = event.id
    submissionId = (await seedPriceSubmission(eventId, 'user_submitter')).id
  })

  it('refuses a single price submission', async () => {
    asUser('user_new')
    const res = await post(`/v1/events/${eventId}/price-submissions`, {
      priceMin: 35,
      tier: 'GA',
      vendor: 'Ticketmaster',
      howFound: 'bought_myself',
    })
    expect(res.status).toBe(404)
  })

  it('refuses a batch price submission', async () => {
    asUser('user_new')
    const res = await post(`/v1/events/${eventId}/price-submissions/batch`, {
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      tiers: [{ tier: 'GA', priceMin: 45 }],
    })
    expect(res.status).toBe(404)
  })

  it('refuses a confirm', async () => {
    asUser('user_confirmer')
    const res = await post(
      `/v1/events/${eventId}/price-submissions/${submissionId}/confirm`,
      { method: 'same-vendor' },
    )
    expect(res.status).toBe(404)
  })

  it('refuses a confirm through the legacy submissions route', async () => {
    asUser('user_confirmer')
    const res = await post(`/v1/submissions/${submissionId}/confirm`, {})
    expect(res.status).toBe(404)
  })

  it('refuses a price check through the legacy submissions route', async () => {
    asUser('user_checker')
    const res = await post(`/v1/submissions/${submissionId}/dispute`, {
      floor: 20,
    })
    expect(res.status).toBe(404)
  })

  it("refuses an edit to the submitter's own price", async () => {
    asUser('user_submitter')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ floor: 20 }),
    })
    expect(res.status).toBe(404)
  })

  it('still lets the submitter delete their own price', async () => {
    asUser('user_submitter')
    const res = await app.request(`/v1/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test-token' },
    })
    expect(res.status).toBeLessThan(300)
  })
})
