import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { priceSubmissions, events, venues } from '@concert-crawl/db'
import { testDb as db } from '../../test/helpers/db.js'
import { clearTables } from '../../test/helpers/seed.js'

// Migration 0041 — admin contest review. Verifies the schema produced by the
// migration directly (rather than through an API route) so structural
// regressions are caught even if the contest API surface routes around the new
// columns. Mirrors the pattern in apps/api/src/test/migration-0040.integration.test.ts.

describe('migration 0041 — admin contest review', () => {
  // Truncate between tests so the unique-slug venue seed in the 4th case
  // doesn't collide with leftovers from earlier failed runs in the same
  // shared concert_crawl_test database.
  beforeEach(async () => {
    await clearTables()
  })

  it('adds the archived status value to price_submission_status', async () => {
    const rows = await db.execute<{ enumlabel: string }>(sql`
      SELECT enumlabel FROM pg_enum
       WHERE enumtypid = 'price_submission_status'::regtype
       ORDER BY enumsortorder
    `)
    const labels = rows.map((row) => row.enumlabel)
    expect(labels).toContain('archived')
  })

  it('adds archived_reason, last_admin_action_at, last_admin_action_kind columns', async () => {
    const rows = await db.execute<{
      column_name: string
      data_type: string
    }>(sql`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'price_submissions'
         AND column_name IN ('archived_reason', 'last_admin_action_at', 'last_admin_action_kind')
       ORDER BY column_name
    `)
    const names = rows.map((row) => row.column_name)
    expect(names).toEqual([
      'archived_reason',
      'last_admin_action_at',
      'last_admin_action_kind',
    ])
  })

  it('creates the four contest-queue indexes', async () => {
    const rows = await db.execute<{ indexname: string }>(sql`
      SELECT indexname FROM pg_indexes
       WHERE tablename = 'price_submissions'
         AND indexname IN (
           'price_submissions_disputed_status_idx',
           'price_submissions_pending_counters_idx',
           'price_submissions_pending_counters_by_filed_idx',
           'price_submissions_pending_counter_unique_idx'
         )
       ORDER BY indexname
    `)
    const names = rows.map((row) => row.indexname)
    expect(names).toEqual([
      'price_submissions_disputed_status_idx',
      'price_submissions_pending_counter_unique_idx',
      'price_submissions_pending_counters_by_filed_idx',
      'price_submissions_pending_counters_idx',
    ])
  })

  it('unique index rejects a 2nd pending counter against the same parent', async () => {
    // Seed a venue + event + parent submission so we can attach counters.
    // venues.websiteUrl, events.title, events.artist are notNull — must be
    // provided explicitly to avoid runtime + type errors. canonicalArtist is
    // forced unique-per-(venueId, date) so we set it explicitly to dodge the
    // partial unique index from migration 0035 when tests run in parallel.
    const [venue] = await db
      .insert(venues)
      .values({
        name: 'Contest Test Venue',
        slug: 'contest-mig-test',
        websiteUrl: 'https://contest-mig-test.example.com',
      })
      .returning({ id: venues.id })
    const [event] = await db
      .insert(events)
      .values({
        venueId: venue!.id,
        title: 'Contest Mig Test Show',
        artist: 'Contest Mig Test Artist',
        canonicalArtist: 'contest mig test artist',
        date: '2027-12-01',
        verified: true,
      })
      .returning({ id: events.id })
    const [parent] = await db
      .insert(priceSubmissions)
      .values({
        eventId: event!.id,
        userId: 'parent-user',
        priceMin: '40',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
        status: 'corroborated',
      })
      .returning({ id: priceSubmissions.id })

    // First pending counter — accepted.
    await db.insert(priceSubmissions).values({
      eventId: event!.id,
      userId: 'challenger-1',
      priceMin: '50',
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'saw_listing',
      sourceCategory: 'standard',
      status: 'pending',
      disputedSubmissionId: parent!.id,
    })

    // Second pending counter against the SAME parent — rejected by unique idx.
    // Drizzle wraps the underlying Postgres error in "Failed query: ..."; the
    // original error (with the constraint name) is on `.cause`. Mirror the
    // pattern in apps/api/src/test/migration-0040.integration.test.ts and
    // assert against `cause.message` so the constraint name is verified.
    let caught: unknown
    try {
      await db.insert(priceSubmissions).values({
        eventId: event!.id,
        userId: 'challenger-2',
        priceMin: '60',
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'saw_listing',
        sourceCategory: 'standard',
        status: 'pending',
        disputedSubmissionId: parent!.id,
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeDefined()
    const causeMessage =
      caught instanceof Error && caught.cause instanceof Error
        ? caught.cause.message
        : ''
    expect(causeMessage).toMatch(/price_submissions_pending_counter_unique_idx/)
  })
})
