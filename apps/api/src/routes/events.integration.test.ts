import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import {
  clearTables,
  seedVenue,
  seedEvent,
  seedUserProfile,
  seedPriceSubmission,
} from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/events — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns empty list when no events exist', async () => {
    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[]; total: number; limit: number; offset: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.data).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  it('returns events with joined venue data', async () => {
    const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' })
    await seedEvent(venue.id, { title: 'Rock Night', date: '2027-06-01' })

    const res = await app.request('/v1/events')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        data: { title: string; venue: { name: string } }[]
        total: number
      }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
    expect(body.data.data[0]?.venue.name).toBe('Globe Hall')
  })

  it('filters by venueSlug', async () => {
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a' })
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b' })
    await seedEvent(venueA.id, { title: 'Show at A', date: '2027-06-01' })
    await seedEvent(venueB.id, { title: 'Show at B', date: '2027-06-01' })

    const res = await app.request('/v1/events?venueSlug=venue-a')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Show at A')
  })

  it('filters by from date', async () => {
    const venue = await seedVenue({
      name: 'The Bluebird',
      slug: 'the-bluebird',
    })
    await seedEvent(venue.id, { title: 'Early Show', date: '2027-01-01' })
    await seedEvent(venue.id, { title: 'Late Show', date: '2027-12-01' })

    const res = await app.request('/v1/events?from=2027-06-01')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Late Show')
  })

  it('excludes events with hiddenFromConsumer=true (PR 6)', async () => {
    const venue = await seedVenue({ name: 'Test', slug: 'test-pr6' })
    await seedEvent(venue.id, {
      title: 'Visible Concert',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      title: 'Hidden Non-Concert',
      artist: 'Other Artist',
      date: '2027-06-02',
      hiddenFromConsumer: true,
    })

    const res = await app.request('/v1/events')
    const body = (await res.json()) as {
      data: { data: { title: string }[] }
    }
    const titles = body.data.data.map((row) => row.title)
    expect(titles).toContain('Visible Concert')
    expect(titles).not.toContain('Hidden Non-Concert')
  })

  it('respects limit parameter', async () => {
    const venue = await seedVenue({
      name: 'Ogden Theatre',
      slug: 'ogden-theatre',
    })
    await seedEvent(venue.id, { title: 'Show 1', date: '2027-06-01' })
    await seedEvent(venue.id, { title: 'Show 2', date: '2027-07-01' })
    await seedEvent(venue.id, { title: 'Show 3', date: '2027-08-01' })

    const res = await app.request('/v1/events?limit=2')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[]; total: number; limit: number }
    }
    expect(body.data.data).toHaveLength(2)
    expect(body.data.total).toBeGreaterThanOrEqual(3)
    expect(body.data.limit).toBe(2)
  })

  it('includes priceByTier with per-row headline for each event (closes #787 — browse chip parity)', async () => {
    const venue = await seedVenue({
      name: 'Tier List Venue',
      slug: 'tier-list-venue',
    })
    const event = await seedEvent(venue.id, {
      title: 'Tier Show',
      date: '2027-06-01',
      priceSource: 'community',
    })
    const profile = await seedUserProfile('user-list-tier', {
      handle: 'list-tier',
    })
    // Corroborated GA box-office at $25 (this is what the browse chip
    // should show as `from $25` with kind=boxoffice — even though the
    // event row's ticketPriceMin / priceSource / priceVendor may diverge).
    await seedPriceSubmission(event.id, profile.userId, {
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      priceMin: '25',
      status: 'corroborated',
    })

    const res = await app.request('/v1/events?venueSlug=tier-list-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        data: Array<{
          id: string
          priceByTier: Array<{
            tier: string
            headline: { priceMin: string; sourceCategory: string } | null
          }> | null
        }>
      }
    }
    expect(body.data.data).toHaveLength(1)
    const row = body.data.data[0]
    expect(row?.priceByTier).not.toBeNull()
    expect(row?.priceByTier).toHaveLength(1)
    const gaBlock = row?.priceByTier?.[0]
    expect(gaBlock?.tier).toBe('GA')
    // Postgres `numeric` columns serialize with their precision suffix.
    expect(parseFloat(gaBlock?.headline?.priceMin ?? '0')).toBe(25)
    expect(gaBlock?.headline?.sourceCategory).toBe('boxoffice')
  })

  it('priceByTier on list endpoint is null when event has no corroborated submissions', async () => {
    const venue = await seedVenue({
      name: 'No Subs Venue',
      slug: 'no-subs-venue',
    })
    await seedEvent(venue.id, {
      title: 'No-subs show',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?venueSlug=no-subs-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { data: Array<{ priceByTier: unknown }> }
    }
    expect(body.data.data[0]?.priceByTier).toBeNull()
  })

  it('excludes rows with first_missing_at set so stale dupes do not leak to consumers', async () => {
    // Regression for the BASS BINGO / Olivia Rodrigo duplicate-display issue
    // observed 2026-06-18. The crawler's stale-detection pass flags rows the
    // LLM no longer extracts (firstMissingAt set) but the consumer list used
    // to ignore that flag, producing N visible rows for one physical show
    // whenever the LLM extracted a different "primary artist" string across
    // crawls. See PR for hide-missing-events-from-consumer-api.
    const venue = await seedVenue({
      name: 'Hide Missing Venue',
      slug: 'hide-missing-venue',
    })
    await seedEvent(venue.id, {
      title: 'Active Show',
      artist: 'Active Artist',
      date: '2027-06-01',
      status: 'upcoming',
      firstMissingAt: null,
    })
    await seedEvent(venue.id, {
      title: 'Stale Show',
      artist: 'Stale Artist',
      date: '2027-06-01',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request('/v1/events?venueSlug=hide-missing-venue')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.success).toBe(true)
    expect(body.data.total).toBe(1)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Active Show')
  })
})

describe('GET /v1/events/:id — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('404s when the event is hidden from consumers (PR 6)', async () => {
    const venue = await seedVenue()
    const event = await seedEvent(venue.id, {
      title: 'Hidden Detail',
      date: '2027-06-01',
      hiddenFromConsumer: true,
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(404)
  })

  it('includes priceSource in event detail response', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      priceSource: 'ticketmaster',
      ticketPriceMin: '45',
      ticketPriceMax: '90',
      date: '2027-06-01',
    })

    const eventsRes = await app.request('/v1/events')
    const listBody = (await eventsRes.json()) as {
      success: boolean
      data: { data: Array<{ id: string }> }
    }
    const eventId = listBody.data.data[0]?.id
    expect(eventId).toBeDefined()

    const res = await app.request(`/v1/events/${eventId}`)
    const body = (await res.json()) as {
      success: boolean
      data: { priceSource: string | null }
    }
    expect(body.success).toBe(true)
    expect(body.data.priceSource).toBe('ticketmaster')
  })

  it('returns event with venue data', async () => {
    const venue = await seedVenue({
      name: 'Fillmore Auditorium',
      slug: 'fillmore-auditorium',
    })
    const event = await seedEvent(venue.id, {
      title: 'Jazz Festival',
      date: '2027-06-01',
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { title: string; venue: { name: string } }
    }
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('Jazz Festival')
    expect(body.data.venue.name).toBe('Fillmore Auditorium')
  })

  it('returns 404 for unknown event id', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })

  it('returns 404 when the event is flagged first_missing_at so direct-link traffic does not see stale data', async () => {
    const venue = await seedVenue({
      name: 'Detail Missing Venue',
      slug: 'detail-missing-venue',
    })
    const evt = await seedEvent(venue.id, {
      title: 'Stale Detail',
      artist: 'Stale Detail Artist',
      date: '2027-06-01',
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })

    const res = await app.request(`/v1/events/${evt.id}`)
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })

  it('includes priceByTier with per-tier headline + alternates + pending', async () => {
    const venue = await seedVenue({
      name: 'Globe Hall',
      slug: 'globe-hall-pbt',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      priceSource: 'community',
    })

    const profileA = await seedUserProfile('user-a', {
      handle: 'price-watcher',
    })
    const profileB = await seedUserProfile('user-b', { handle: 'fan-two' })

    // Corroborated GA box-office at $40
    await seedPriceSubmission(event.id, profileA.userId, {
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      priceMin: '40',
      status: 'corroborated',
    })
    // Corroborated GA standard alternate at $50
    await seedPriceSubmission(event.id, profileB.userId, {
      tier: 'GA',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '50',
      status: 'corroborated',
    })
    // Pending VIP at $120
    await seedPriceSubmission(event.id, profileA.userId, {
      tier: 'VIP',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '120',
      status: 'pending',
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        priceByTier: Array<{
          tier: string
          headline: { submissionId: string; priceMin: string } | null
          alternates: Array<{ priceMin: string }>
          pending: Array<{ priceMin: string }>
          reports: number
        }>
      }
    }

    expect(body.data.priceByTier).toHaveLength(2)
    const [gaBlock, vipBlock] = body.data.priceByTier
    expect(gaBlock?.tier).toBe('GA')
    expect(parseFloat(gaBlock?.headline?.priceMin ?? '0')).toBe(40)
    expect(gaBlock?.alternates).toHaveLength(1)
    expect(parseFloat(gaBlock?.alternates[0]?.priceMin ?? '0')).toBe(50)
    expect(gaBlock?.reports).toBe(2)
    expect(vipBlock?.tier).toBe('VIP')
    expect(vipBlock?.headline).toBeNull()
    expect(vipBlock?.pending).toHaveLength(1)
    expect(parseFloat(vipBlock?.pending[0]?.priceMin ?? '0')).toBe(120)
    expect(vipBlock?.reports).toBe(1)
  })

  it('priceByTier is empty array when event has no submissions', async () => {
    const venue = await seedVenue({ name: 'Empty Venue', slug: 'empty-venue' })
    const event = await seedEvent(venue.id, { date: '2027-06-01' })

    const res = await app.request(`/v1/events/${event.id}`)
    const body = (await res.json()) as {
      data: { priceByTier: unknown[] }
    }
    expect(body.data.priceByTier).toEqual([])
  })

  it('pendingSubmissions excludes counter rows (counters surface only via counterSubmission / priceByTier.counterSubmission)', async () => {
    const venue = await seedVenue({
      name: 'Counter Test',
      slug: 'counter-test',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      priceSource: 'community',
    })

    const submitter = await seedUserProfile('counter-parent', {
      handle: 'parent-fan',
    })
    const challenger = await seedUserProfile('counter-challenger', {
      handle: 'challenger-fan',
    })

    // Corroborated parent submission
    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })

    // Pending counter against the corroborated parent — should appear in
    // counterSubmission only, NOT in pendingSubmissions.
    await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '30',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })

    const res = await app.request(`/v1/events/${event.id}`)
    const body = (await res.json()) as {
      data: {
        pendingSubmissions: Array<{ id: string }> | null
        counterSubmission: { id: string } | null
        priceByTier: Array<{
          counterSubmission: { id: string } | null
        }>
      }
    }
    // counterSubmission is set (via the flat path AND priceByTier)
    expect(body.data.counterSubmission).not.toBeNull()
    expect(body.data.priceByTier[0]?.counterSubmission).not.toBeNull()
    // pendingSubmissions does NOT include the counter row — it should be null
    // or omit the counter's id.
    if (body.data.pendingSubmissions !== null) {
      const counterId = body.data.counterSubmission?.id
      expect(
        body.data.pendingSubmissions.find((sub) => sub.id === counterId),
      ).toBeUndefined()
    }
  })

  it('pendingSubmissions is populated even when a corroborated price exists', async () => {
    const venue = await seedVenue({
      name: 'Pending Always',
      slug: 'pending-always',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      ticketPriceMin: '30',
      priceSource: 'community',
    })

    const profileA = await seedUserProfile('user-corrob', {
      handle: 'corrob-fan',
    })
    const profileB = await seedUserProfile('user-pending', {
      handle: 'pending-fan',
    })

    // Corroborated GA at $30 — historically suppressed pendingSubmissions when a
    // corroborated price already existed for the event.
    await seedPriceSubmission(event.id, profileA.userId, {
      tier: 'GA',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '30',
      status: 'corroborated',
    })
    // Pending VIP at $90 — a different tier; the gate hid it because the event
    // had any corroborated price. PR 3 always surfaces pending rows.
    await seedPriceSubmission(event.id, profileB.userId, {
      tier: 'VIP',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '90',
      status: 'pending',
    })

    const res = await app.request(`/v1/events/${event.id}`)
    const body = (await res.json()) as {
      data: {
        pendingSubmissions: Array<{ tier: string; priceMin: string }> | null
      }
    }
    expect(body.data.pendingSubmissions).not.toBeNull()
    expect(body.data.pendingSubmissions).toHaveLength(1)
    expect(body.data.pendingSubmissions?.[0]?.tier).toBe('VIP')
  })

  it('counterSubmission carries lastAdminActionAt + lastAdminActionKind as null when never deferred', async () => {
    const venue = await seedVenue({
      name: 'Counter No Defer',
      slug: 'counter-no-defer',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      priceSource: 'community',
    })

    const submitter = await seedUserProfile('cnd-parent', { handle: 'p-cnd' })
    const challenger = await seedUserProfile('cnd-chal', { handle: 'c-cnd' })

    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })
    await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'Ticketmaster',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        counterSubmission: {
          lastAdminActionAt: string | null
          lastAdminActionKind: string | null
        } | null
        priceByTier: Array<{
          tier: string
          counterSubmission: {
            lastAdminActionAt: string | null
            lastAdminActionKind: string | null
          } | null
        }>
      }
    }

    // Flat counterSubmission carries both fields as null.
    expect(body.data.counterSubmission?.lastAdminActionAt).toBeNull()
    expect(body.data.counterSubmission?.lastAdminActionKind).toBeNull()

    // priceByTier counterSubmission carries both fields as null too — the two
    // surfaces stay lock-step during PR 4's migration window.
    const gaBlock = body.data.priceByTier.find((block) => block.tier === 'GA')
    expect(gaBlock?.counterSubmission?.lastAdminActionAt).toBeNull()
    expect(gaBlock?.counterSubmission?.lastAdminActionKind).toBeNull()
  })

  it('priceByTier counterSubmission surfaces lastAdminActionKind="defer" after a defer', async () => {
    const venue = await seedVenue({
      name: 'Defer surfacing',
      slug: 'defer-surface',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      ticketPriceMin: '40',
      priceSource: 'community',
    })

    const submitter = await seedUserProfile('parent-u-d', { handle: 'p-d' })
    const challenger = await seedUserProfile('chal-u-d', { handle: 'c-d' })

    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      // Defer doesn't change parent status, but tests seed both states the
      // contest naturally lands in (corroborated parent + pending counter,
      // then admin marks defer on the counter).
      status: 'corroborated',
    })
    // The defer endpoint writes these two fields to the counter; the seed
    // helper writes them directly so this test verifies only the projection.
    // Task 9 covers end-to-end via the defer endpoint.
    const deferredAt = new Date('2026-06-21T18:00:00Z')
    await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
      lastAdminActionKind: 'defer',
      lastAdminActionAt: deferredAt,
    })

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        counterSubmission: {
          lastAdminActionAt: string | null
          lastAdminActionKind: string | null
        } | null
        priceByTier: Array<{
          tier: string
          counterSubmission: {
            lastAdminActionAt: string | null
            lastAdminActionKind: string | null
          } | null
        }>
      }
    }

    // priceByTier surfaces the defer signal on the right tier's counter.
    const gaBlock = body.data.priceByTier.find((block) => block.tier === 'GA')
    expect(gaBlock?.counterSubmission?.lastAdminActionKind).toBe('defer')
    expect(gaBlock?.counterSubmission?.lastAdminActionAt).toBe(
      deferredAt.toISOString(),
    )

    // The flat counterSubmission stays in lock-step (PR 4 migration window).
    expect(body.data.counterSubmission?.lastAdminActionKind).toBe('defer')
    expect(body.data.counterSubmission?.lastAdminActionAt).toBe(
      deferredAt.toISOString(),
    )
  })

  // R16: counterSubmission emits paired (kind=null, at=null) when the DB
  // text column carries an unrecognized kind. Without the paired narrow
  // both the flat and the per-tier surfaces would leak the timestamp.
  it('counterSubmission pairs lastAdminActionKind + lastAdminActionAt to null for unrecognized DB kinds (flat + per-tier)', async () => {
    const venue = await seedVenue({
      name: 'Unrecognized kind venue',
      slug: 'unrecognized-kind-venue',
    })
    const event = await seedEvent(venue.id, {
      date: '2027-06-01',
      priceSource: 'community',
    })

    const submitter = await seedUserProfile('uk-parent', { handle: 'p-uk' })
    const challenger = await seedUserProfile('uk-chal', { handle: 'c-uk' })

    const parent = await seedPriceSubmission(event.id, submitter.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '40',
      status: 'corroborated',
    })
    const counter = await seedPriceSubmission(event.id, challenger.userId, {
      tier: 'GA',
      vendor: 'AXS',
      sourceCategory: 'standard',
      priceMin: '55',
      status: 'pending',
      disputedSubmissionId: parent.id,
      // Real timestamp paired with a future kind that the narrowing
      // union doesn't yet recognize — the projection must drop both.
      lastAdminActionAt: new Date('2027-05-15T12:00:00Z'),
    })

    // Direct SQL write: simulate an unrecognized internal kind landing in
    // the column. Bypass the typed Drizzle insert path so we can write a
    // value the type system wouldn't normally allow.
    await testDb.execute(
      sql`UPDATE price_submissions
          SET last_admin_action_kind = 'some_future_kind'
          WHERE id = ${counter.id}`,
    )

    const res = await app.request(`/v1/events/${event.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: {
        counterSubmission: {
          lastAdminActionAt: string | null
          lastAdminActionKind: string | null
        } | null
        priceByTier: Array<{
          tier: string
          counterSubmission: {
            lastAdminActionAt: string | null
            lastAdminActionKind: string | null
          } | null
        }>
      }
    }

    // Flat counterSubmission must pair both fields to null.
    expect(body.data.counterSubmission?.lastAdminActionKind).toBeNull()
    expect(body.data.counterSubmission?.lastAdminActionAt).toBeNull()

    // Per-tier counterSubmission must too — the two surfaces stay lock-step.
    const gaBlock = body.data.priceByTier.find((block) => block.tier === 'GA')
    expect(gaBlock?.counterSubmission?.lastAdminActionKind).toBeNull()
    expect(gaBlock?.counterSubmission?.lastAdminActionAt).toBeNull()
  })
})

describe('GET /v1/events — filterPrice', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('under-25 returns only events with price < 25', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Cheap Show',
      ticketPriceMin: '15',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Pricey Show',
      ticketPriceMin: '60',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'No Price',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=under-25')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Cheap Show')
  })

  it('25-50 returns events with 25 <= price < 50', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Low Show',
      ticketPriceMin: '10',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Mid Show',
      ticketPriceMin: '35',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Boundary Show',
      ticketPriceMin: '25',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 4',
      title: 'High Show',
      ticketPriceMin: '75',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=25-50')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Boundary Show', 'Mid Show'])
  })

  it('50-plus returns events with price >= 50', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Cheap Show',
      ticketPriceMin: '20',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Boundary Show',
      ticketPriceMin: '50',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Pricey Show',
      ticketPriceMin: '120',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=50-plus')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Boundary Show', 'Pricey Show'])
  })

  it('tbd returns only events with no price data', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Priced Show',
      ticketPriceMin: '45',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'TBD Show',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterPrice=tbd')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('TBD Show')
  })

  it('returns 400 for an invalid filterPrice value', async () => {
    const res = await app.request('/v1/events?filterPrice=invalid')
    expect(res.status).toBe(400)
  })
})

describe('GET /v1/events — search', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('searches by venue name', async () => {
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
    })
    await seedEvent(venue.id, {
      title: 'Rock Night',
      artist: 'Test Band',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?search=Bluebird')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[]; total: number }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
    expect(body.data.total).toBe(1)
  })
})

describe('GET /v1/events — filterVibe', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns only events whose genre array contains the selected vibe', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Rock Night',
      genre: ['rock', 'indie'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Jazz Evening',
      genre: ['jazz'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'No Genre',
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterVibe=rock')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Rock Night')
  })

  it('matches events that have the vibe among multiple genres', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Indie Rock Show',
      genre: ['indie', 'rock'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Pure Indie',
      genre: ['indie'],
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Pop Show',
      genre: ['pop'],
      date: '2027-06-01',
    })

    const res = await app.request('/v1/events?filterVibe=indie')
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(2)
    const titles = body.data.data.map((ev) => ev.title).sort()
    expect(titles).toEqual(['Indie Rock Show', 'Pure Indie'])
  })

  it('returns 400 for a filterVibe value exceeding 100 characters', async () => {
    const longGenre = 'a'.repeat(101)
    const res = await app.request(`/v1/events?filterVibe=${longGenre}`)
    expect(res.status).toBe(400)
  })

  it('combines filterPrice and filterVibe', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist 1',
      title: 'Cheap Rock',
      genre: ['rock'],
      ticketPriceMin: '20',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 2',
      title: 'Pricey Rock',
      genre: ['rock'],
      ticketPriceMin: '80',
      date: '2027-06-01',
    })
    await seedEvent(venue.id, {
      artist: 'Artist 3',
      title: 'Cheap Jazz',
      genre: ['jazz'],
      ticketPriceMin: '15',
      date: '2027-06-01',
    })

    const res = await app.request(
      '/v1/events?filterVibe=rock&filterPrice=under-25',
    )
    const body = (await res.json()) as {
      success: boolean
      data: { data: { title: string }[] }
    }
    expect(res.status).toBe(200)
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.title).toBe('Cheap Rock')
  })
})

describe('GET /v1/events — beta auth gate', () => {
  it('returns 401 without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { eventsRouter: freshRouter } = await import('./events.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request('/v1/events')
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })

  it('returns 401 on GET /:id without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { eventsRouter: freshRouter } = await import('./events.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request(
        '/v1/events/00000000-0000-0000-0000-000000000001',
      )
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })

  it('returns 401 on GET /genres without auth when REQUIRE_BETA_AUTH is true', async () => {
    const original = process.env.REQUIRE_BETA_AUTH
    try {
      process.env.REQUIRE_BETA_AUTH = 'true'
      vi.resetModules()
      const { eventsRouter: freshRouter } = await import('./events.js')
      const { Hono } = await import('hono')
      const testApp = new Hono()
      testApp.route('/v1/events', freshRouter)
      const res = await testApp.request('/v1/events/genres')
      expect(res.status).toBe(401)
    } finally {
      process.env.REQUIRE_BETA_AUTH = original
    }
  })
})

describe('GET /v1/events/genres', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns empty array when no upcoming events exist', async () => {
    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it('returns distinct genres from upcoming events sorted alphabetically', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Artist One',
      genre: ['rock', 'indie'],
      status: 'upcoming',
    })
    await seedEvent(venue.id, {
      artist: 'Artist Two',
      genre: ['r&b', 'rock'],
      status: 'upcoming',
    })

    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.data).toEqual(['indie', 'r&b', 'rock'])
  })

  it('excludes genres from non-upcoming events', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Jazz Act',
      genre: ['jazz'],
      status: 'cancelled',
    })
    await seedEvent(venue.id, {
      artist: 'Rock Act',
      genre: ['rock'],
      status: 'upcoming',
    })

    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.data).toEqual(['rock'])
  })

  it('omits genres that only appear on first_missing_at rows', async () => {
    const venue = await seedVenue()
    await seedEvent(venue.id, {
      artist: 'Stale Genre Artist',
      genre: ['ghost-genre-do-not-show'],
      status: 'upcoming',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })
    await seedEvent(venue.id, {
      artist: 'Active Genre Artist',
      genre: ['rock'],
      status: 'upcoming',
    })

    const res = await app.request('/v1/events/genres')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: string[] }
    expect(body.data).not.toContain('ghost-genre-do-not-show')
    expect(body.data).toContain('rock')
  })
})

describe('GET /v1/events/:id/related — integration (#833)', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns up to 3 other upcoming events at the same venue, excluding source', async () => {
    const venue = await seedVenue({ name: 'Red Rocks', slug: 'red-rocks' })
    const source = await seedEvent(venue.id, {
      artist: 'Source Artist',
      date: '2027-06-15',
    })
    await seedEvent(venue.id, { artist: 'Sibling One', date: '2027-06-16' })
    await seedEvent(venue.id, { artist: 'Sibling Two', date: '2027-06-17' })
    await seedEvent(venue.id, { artist: 'Sibling Three', date: '2027-06-18' })
    await seedEvent(venue.id, { artist: 'Sibling Four', date: '2027-06-19' })

    const res = await app.request(`/v1/events/${source.id}/related`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: Array<{ id: string; artist: string }> }
    }
    expect(body.success).toBe(true)
    expect(body.data.data).toHaveLength(3)
    const ids = body.data.data.map((row) => row.id)
    expect(ids).not.toContain(source.id)
  })

  it('does not include events from other venues', async () => {
    const venueA = await seedVenue({ name: 'Venue A', slug: 'venue-a-rel' })
    const venueB = await seedVenue({ name: 'Venue B', slug: 'venue-b-rel' })
    const source = await seedEvent(venueA.id, {
      artist: 'Source Artist',
      date: '2027-06-15',
    })
    await seedEvent(venueA.id, { artist: 'Same Venue', date: '2027-06-16' })
    await seedEvent(venueB.id, { artist: 'Other Venue', date: '2027-06-17' })

    const res = await app.request(`/v1/events/${source.id}/related`)
    const body = (await res.json()) as {
      success: boolean
      data: { data: Array<{ artist: string }> }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.artist).toBe('Same Venue')
  })

  it('returns a slim payload (no priceByTier aggregation, no enrichment)', async () => {
    const venue = await seedVenue({ name: 'Slim Venue', slug: 'slim-venue' })
    const source = await seedEvent(venue.id, {
      artist: 'Source Artist',
      date: '2027-06-15',
      priceSource: 'community',
    })
    const sibling = await seedEvent(venue.id, {
      artist: 'Sibling',
      date: '2027-06-16',
      priceSource: 'community',
    })
    const profile = await seedUserProfile('user-slim', { handle: 'fan' })
    // Seed a corroborated submission on the sibling — the list endpoint
    // would surface this via priceByTier. The related endpoint must NOT.
    await seedPriceSubmission(sibling.id, profile.userId, {
      tier: 'GA',
      vendor: 'VenueBoxOffice',
      howFound: 'at_the_venue',
      sourceCategory: 'boxoffice',
      priceMin: '40',
      status: 'corroborated',
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    const body = (await res.json()) as {
      success: boolean
      data: {
        data: Array<{
          id: string
          artist: string
          title: string
          date: string
          imageUrl: string | null
          venue: { slug: string; name: string }
          priceByTier?: unknown
          priceVendor?: unknown
        }>
      }
    }
    expect(body.data.data).toHaveLength(1)
    const row = body.data.data[0]
    expect(row?.artist).toBe('Sibling')
    expect(row?.venue.slug).toBe('slim-venue')
    expect(row?.venue.name).toBe('Slim Venue')
    // Slim payload — priceByTier and priceVendor must NOT be present.
    expect(row?.priceByTier).toBeUndefined()
    expect(row?.priceVendor).toBeUndefined()
  })

  it('excludes hiddenFromConsumer events from the related list', async () => {
    const venue = await seedVenue({ name: 'Hide Venue', slug: 'hide-venue' })
    const source = await seedEvent(venue.id, {
      artist: 'Source',
      date: '2027-06-15',
    })
    await seedEvent(venue.id, {
      artist: 'Hidden Sibling',
      date: '2027-06-16',
      hiddenFromConsumer: true,
    })
    await seedEvent(venue.id, {
      artist: 'Visible Sibling',
      date: '2027-06-17',
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    const body = (await res.json()) as {
      success: boolean
      data: { data: Array<{ artist: string }> }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.artist).toBe('Visible Sibling')
  })

  it('excludes events flagged first_missing_at from the related list', async () => {
    const venue = await seedVenue({
      name: 'Missing Venue',
      slug: 'missing-venue',
    })
    const source = await seedEvent(venue.id, {
      artist: 'Source',
      date: '2027-06-15',
    })
    await seedEvent(venue.id, {
      artist: 'Stale Sibling',
      date: '2027-06-16',
      firstMissingAt: new Date('2026-06-17T09:00:00Z'),
    })
    await seedEvent(venue.id, {
      artist: 'Visible Sibling',
      date: '2027-06-17',
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    const body = (await res.json()) as {
      success: boolean
      data: { data: Array<{ artist: string }> }
    }
    expect(body.data.data).toHaveLength(1)
    expect(body.data.data[0]?.artist).toBe('Visible Sibling')
  })

  it('returns 404 for an unknown event id', async () => {
    const res = await app.request(
      '/v1/events/00000000-0000-0000-0000-000000000000/related',
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })

  it('returns 404 for a non-UUID id', async () => {
    const res = await app.request('/v1/events/not-a-uuid/related')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
    expect(body.error).toBe('Event not found')
  })

  it('returns 404 when the source event is hidden from consumers', async () => {
    const venue = await seedVenue({
      name: 'Hidden Source Venue',
      slug: 'hidden-source-venue',
    })
    const source = await seedEvent(venue.id, {
      artist: 'Hidden Source',
      date: '2027-06-15',
      hiddenFromConsumer: true,
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    expect(res.status).toBe(404)
  })

  it('returns an empty list when the venue has no other upcoming events', async () => {
    const venue = await seedVenue({ name: 'Solo Venue', slug: 'solo-venue' })
    const source = await seedEvent(venue.id, {
      artist: 'Only Show',
      date: '2027-06-15',
    })

    const res = await app.request(`/v1/events/${source.id}/related`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: { data: unknown[] }
    }
    expect(body.success).toBe(true)
    expect(body.data.data).toHaveLength(0)
  })
})
