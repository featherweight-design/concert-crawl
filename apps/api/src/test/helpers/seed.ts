import { sql } from 'drizzle-orm'
import {
  crawlRuns,
  events,
  priceSubmissions,
  submissionConfirms,
  userEvents,
  userProfiles,
  venues,
} from '@concert-crawl/db'
import { testDb } from './db.js'

export async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE submission_confirms, price_submissions, user_events, events, venues, crawl_runs, audit_log, invite_codes, user_roles, price_retrieval_log, user_profiles, feedback RESTART IDENTITY CASCADE`,
  )
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
  const [event] = await testDb
    .insert(events)
    .values({
      venueId,
      title: 'Test Show',
      artist: 'Test Artist',
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
  const [submission] = await testDb
    .insert(priceSubmissions)
    .values({
      eventId,
      userId,
      priceMin: '35',
      tier: 'GA',
      vendor: 'Ticketmaster',
      howFound: 'bought_myself',
      status: 'pending',
      corroborationCount: 0,
      ...overrides,
    })
    .returning()
  if (!submission)
    throw new Error('seedPriceSubmission: insert returned no rows')
  return submission
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
