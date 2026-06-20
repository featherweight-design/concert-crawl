import { sql } from 'drizzle-orm'
import {
  crawlRuns,
  eventReportConfirms,
  eventReports,
  events,
  priceRetrievalLog,
  priceSubmissions,
  submissionConfirms,
  userEvents,
  userProfiles,
  userRoles,
  venues,
} from '@concert-crawl/db'
import { deriveSourceCategory } from '@concert-crawl/types'
import { testDb } from './db.js'

export async function clearTables(): Promise<void> {
  // pg_advisory_xact_lock serializes concurrent TRUNCATE calls so SELECT FOR UPDATE
  // locks from in-flight test transactions can't deadlock with the AccessExclusiveLock
  // that TRUNCATE acquires. The advisory lock is released automatically at transaction end.
  await testDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7777)`)
    await tx.execute(
      sql`TRUNCATE event_report_confirms, event_reports, submission_confirms, price_submissions, user_events, events, venues, crawl_runs, audit_log, invite_codes, user_roles, price_retrieval_log, user_profiles, feedback RESTART IDENTITY CASCADE`,
    )
  })
}

export async function seedUserEvent(
  userId: string,
  eventId: string,
  overrides: Partial<typeof userEvents.$inferInsert> = {},
): Promise<typeof userEvents.$inferSelect> {
  const [row] = await testDb
    .insert(userEvents)
    .values({
      userId,
      eventId,
      status: 'watching',
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('seedUserEvent: insert returned no rows')
  return row
}

export async function seedVenue(
  overrides: Partial<typeof venues.$inferInsert> = {},
): Promise<typeof venues.$inferSelect> {
  const [venue] = await testDb
    .insert(venues)
    .values({
      name: 'Test Venue',
      slug: 'test-venue',
      websiteUrl: 'https://testvenue.example.com',
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      ...overrides,
    })
    .returning()

  if (!venue) throw new Error('seedVenue: insert returned no rows')
  return venue
}

export async function seedEvent(
  venueId: string,
  overrides: Partial<typeof events.$inferInsert> = {},
): Promise<typeof events.$inferSelect> {
  const artist = overrides.artist ?? 'Test Artist'
  // Derive canonical_artist from artist when not explicitly provided. Without
  // this, multiple seedEvent calls inside one test would all collide on the
  // partial UNIQUE index `events_venue_date_canonical_artist_idx` because the
  // schema default for canonical_artist is '' — every (venue_id, date, '')
  // tuple repeats. Production code does the canonicalization in the crawler;
  // here a simple lowercase suffices for test isolation since the tests only
  // care that distinct artist strings produce distinct canonical values.
  const canonicalArtist =
    overrides.canonicalArtist ?? artist.toLowerCase().trim()
  const [event] = await testDb
    .insert(events)
    .values({
      venueId,
      title: 'Test Show',
      artist,
      canonicalArtist,
      date: '2026-06-01',
      status: 'upcoming',
      ...overrides,
    })
    .returning()

  if (!event) throw new Error('seedEvent: insert returned no rows')
  return event
}

export async function seedUserProfile(
  userId: string,
  overrides: Partial<typeof userProfiles.$inferInsert> = {},
): Promise<typeof userProfiles.$inferSelect> {
  const [profile] = await testDb
    .insert(userProfiles)
    .values({
      userId,
      handle: null,
      theme: 'electric',
      ...overrides,
    })
    .returning()
  if (!profile) throw new Error('seedUserProfile: insert returned no rows')
  return profile
}

export async function seedPriceSubmission(
  eventId: string,
  userId: string,
  overrides: Partial<typeof priceSubmissions.$inferInsert> = {},
): Promise<typeof priceSubmissions.$inferSelect> {
  // Default to the same (vendor, howFound) → sourceCategory derivation that
  // the real submit handler does, so test rows match production shape.
  // Tests that explicitly need NULL (legacy backfill scenarios) can override.
  const vendor = overrides.vendor ?? 'Ticketmaster'
  const howFound = overrides.howFound ?? 'bought_myself'

  const [submission] = await testDb
    .insert(priceSubmissions)
    .values({
      eventId,
      userId,
      priceMin: '35',
      tier: 'GA',
      vendor,
      howFound,
      sourceCategory: deriveSourceCategory(vendor, howFound),
      status: 'pending',
      // Submitter counts as observation #1 in the 1/2 confirmation model.
      // Matches the DB default (migration 0040) and the explicit insert in
      // price-submissions.ts. Tests that need 0 (e.g. legacy backfill
      // scenarios) can override.
      corroborationCount: 1,
      ...overrides,
    })
    .returning()
  if (!submission)
    throw new Error('seedPriceSubmission: insert returned no rows')
  return submission
}

export async function seedUserRole(
  userId: string,
  overrides: Partial<typeof userRoles.$inferInsert> = {},
): Promise<typeof userRoles.$inferSelect> {
  const [row] = await testDb
    .insert(userRoles)
    .values({
      userId,
      role: 'user',
      grantedBy: 'system',
      priceCredScore: 0,
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('seedUserRole: insert returned no rows')
  return row
}

export async function seedSubmissionConfirm(
  submissionId: string,
  userId: string,
): Promise<typeof submissionConfirms.$inferSelect> {
  const [row] = await testDb
    .insert(submissionConfirms)
    .values({ submissionId, userId })
    .returning()
  if (!row) throw new Error('seedSubmissionConfirm: insert returned no rows')
  return row
}

export async function seedPriceRetrievalLog(
  eventId: string,
  venueId: string,
  overrides: Partial<typeof priceRetrievalLog.$inferInsert> = {},
): Promise<typeof priceRetrievalLog.$inferSelect> {
  const [row] = await testDb
    .insert(priceRetrievalLog)
    .values({
      eventId,
      venueId,
      source: 'ticketmaster',
      outcome: 'miss',
      latencyMs: 100,
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('seedPriceRetrievalLog: insert returned no rows')
  return row
}

export async function seedEventReport(
  eventId: string,
  reporterId: string,
  overrides: Partial<typeof eventReports.$inferInsert> = {},
): Promise<typeof eventReports.$inferSelect> {
  const [row] = await testDb
    .insert(eventReports)
    .values({
      eventId,
      reporterId,
      status: 'sold-out',
      evidenceMethod: 'saw_listing',
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('seedEventReport: insert returned no rows')
  return row
}

export async function seedEventReportConfirm(
  reportId: string,
  userId: string,
): Promise<typeof eventReportConfirms.$inferSelect> {
  const [row] = await testDb
    .insert(eventReportConfirms)
    .values({ reportId, userId })
    .returning()
  if (!row) throw new Error('seedEventReportConfirm: insert returned no rows')
  return row
}

export async function seedCrawlRun(
  venueId: string,
  overrides: Partial<typeof crawlRuns.$inferInsert> = {},
): Promise<typeof crawlRuns.$inferSelect> {
  const [run] = await testDb
    .insert(crawlRuns)
    .values({
      venueId,
      status: 'success',
      eventsFound: 5,
      eventsInserted: 5,
      eventsUpdated: 0,
      durationMs: 1200,
      ...overrides,
    })
    .returning()
  if (!run) throw new Error('seedCrawlRun: insert returned no rows')
  return run
}
