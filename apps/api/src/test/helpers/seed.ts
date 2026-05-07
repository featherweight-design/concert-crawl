import { sql } from 'drizzle-orm'
import { events, venues } from '@concert-crawl/db'
import { testDb } from './db.js'

export async function clearTables(): Promise<void> {
  await testDb.execute(
    sql`TRUNCATE events, venues, crawl_runs, audit_log, invite_codes, user_roles RESTART IDENTITY CASCADE`,
  )
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
