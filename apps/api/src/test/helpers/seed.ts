import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import {
  USER_DATA_REGISTRY,
  artists,
  auditLog,
  crawlRuns,
  crewInvites,
  crewMembers,
  crewMutes,
  crews,
  emailSendLog,
  eventReportConfirms,
  eventReports,
  events,
  feedback,
  giftedComps,
  inviteCodes,
  notifications,
  priceRetrievalLog,
  priceSubmissions,
  pushSubscriptions,
  spotifyAlertLog,
  submissionConfirms,
  subscriptionEvents,
  subscriptions,
  userArtistFollows,
  userBilling,
  userCred,
  userEvents,
  userNotificationPreferences,
  userProfiles,
  userRoles,
  userSpotifyConnections,
  venueGuideChips,
  venues,
} from '@concert-crawl/db'
import type { GuideChipKey } from '@concert-crawl/types'
import { artistSlug, deriveSourceCategory } from '@concert-crawl/types'
import { clearFeatureFlagCache } from '../../lib/feature-flags.js'
import { testDb } from './db.js'

export async function clearTables(): Promise<void> {
  // pg_advisory_xact_lock serializes concurrent TRUNCATE calls so SELECT FOR UPDATE
  // locks from in-flight test transactions can't deadlock with the AccessExclusiveLock
  // that TRUNCATE acquires. The advisory lock is released automatically at transaction end.
  await testDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(7777)`)
    await tx.execute(
      // `subscriptions` is in the list because entitlement-gated routes now
      // read it: a premium row left behind makes a later 403 test pass or fail
      // purely on file order. `feature_flags` is there for the same reason —
      // a leftover enabled row silently satisfies a later suite's release gate.
      sql`TRUNCATE notifications, event_report_confirms, event_reports, submission_confirms, price_submissions, user_events, events, artists, venues, crawl_runs, audit_log, invite_codes, user_roles, user_cred, price_retrieval_log, user_profiles, feedback, user_artist_follows, user_spotify_connections, spotify_alert_log, cost_tracking, crews, subscriptions, user_notification_preferences, feature_flags RESTART IDENTITY CASCADE`,
    )
  })
  // The loader memoizes for 30s in-process, and integration tests share one
  // process, so truncating the table alone leaves the old answer live.
  clearFeatureFlagCache()
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

export async function seedArtist(
  // `slug` is deliberately not overridable — it is always derived below, and
  // accepting one the helper then ignores is how a test ends up asserting
  // against an artist it never seeded.
  overrides: Omit<Partial<typeof artists.$inferInsert>, 'slug'> = {},
): Promise<typeof artists.$inferSelect> {
  const name = overrides.name ?? 'Test Artist'
  // The slug follows the canonical name, not the display name — seeding a row
  // whose slug disagrees with its identity makes a test pass on the wrong
  // artist.
  const canonicalName = overrides.canonicalName ?? name.toLowerCase().trim()
  const [artist] = await testDb
    .insert(artists)
    .values({
      ...overrides,
      name,
      canonicalName,
      // Derived last so an override can't seed a row whose slug disagrees with
      // its own canonical name.
      slug: artistSlug(canonicalName),
    })
    .returning()

  if (!artist) throw new Error('seedArtist: insert returned no rows')
  return artist
}

// #764 — one row per authored or placeholder guide chip. Callers pass chips in
// whatever order they like; the route owns display ordering.
export async function seedVenueGuideChips(
  venueId: string,
  chips: Array<{
    chipType: GuideChipKey
    body: string
    isPlaceholder?: boolean
  }>,
): Promise<void> {
  if (chips.length === 0) return
  await testDb.insert(venueGuideChips).values(
    chips.map((chip) => ({
      venueId,
      chipType: chip.chipType,
      body: chip.body,
      isPlaceholder: chip.isPlaceholder ?? false,
    })),
  )
}

export async function seedEvent(
  venueId: string,
  overrides: Partial<typeof events.$inferInsert> = {},
): Promise<typeof events.$inferSelect> {
  const artist = overrides.artist ?? 'Test Artist'
  // Default title derives from artist so seedEvent calls only overriding
  // artist still get distinct rows. The partial UNIQUE index is on
  // (venue, date, canonical_artist, show_time) (#1053), so callers seeding
  // multiple upcoming events for the same headliner on the same date must
  // pass distinct show_time values to avoid a collision.
  const title = overrides.title ?? `Test Show — ${artist}`
  // Derive canonical_artist + canonical_title from artist/title when not
  // explicitly provided. Production code does the canonicalization in the
  // crawler; here a simple lowercase + trim suffices for test isolation
  // since the tests only care that distinct artist/title strings produce
  // distinct canonical values.
  const canonicalArtist =
    overrides.canonicalArtist ?? artist.toLowerCase().trim()
  const canonicalTitle = overrides.canonicalTitle ?? title.toLowerCase().trim()
  const [event] = await testDb
    .insert(events)
    .values({
      venueId,
      title,
      artist,
      canonicalArtist,
      canonicalTitle,
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

export async function seedUserCred(
  userId: string,
  priceCredScore = 0,
): Promise<typeof userCred.$inferSelect> {
  const [row] = await testDb
    .insert(userCred)
    .values({ userId, priceCredScore })
    .returning()
  if (!row) throw new Error('seedUserCred: insert returned no rows')
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

export async function seedNotification(
  overrides: Partial<typeof notifications.$inferInsert> = {},
): Promise<typeof notifications.$inferSelect> {
  const [row] = await testDb
    .insert(notifications)
    .values({
      type: 'admin_alert',
      category: 'crawl.failed',
      title: 'Crawl failed',
      body: 'A venue crawl failed three times in a row',
      ...overrides,
    })
    .returning()
  if (!row) throw new Error('seedNotification: insert returned no rows')
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

// Every table USER_DATA_REGISTRY says holds data about a user — i.e. every
// entry whose disposition is not 'none'. The deletion and export tests both
// scope on this list.
const USER_OWNED_ENTRIES = USER_DATA_REGISTRY.filter(
  (entry) => entry.disposition !== 'none',
)

// Seeds exactly one row for a brand-new user in EVERY table that
// USER_DATA_REGISTRY classifies as holding user data, then proves it did.
//
// The self-check at the end is the whole point of this helper. A deletion test
// asserting "no rows remain for this user in table X" passes trivially when X
// never got a row, so a table this helper silently skips is a hole in the
// cascade that no test can see. The check is driven off the registry rather
// than a hardcoded list so a table added there later fails loudly here instead
// of being quietly untested.
//
// Exactly one row per table matters too: the export tests assert a length of 1
// to prove a query didn't pick up another user's rows.
export const seedUserWithDataEverywhere = async (): Promise<string> => {
  const userId = `user_test_${randomUUID()}`
  // Suffix shared by every unique-constrained value below, so repeated calls
  // within one test file don't collide on venue slug, invite code, or push
  // endpoint.
  const nonce = randomUUID()

  // ---- Parent rows the foreign keys require ----
  const venue = await seedVenue({
    name: `Deletion Venue ${nonce}`,
    slug: `deletion-venue-${nonce}`,
  })
  const event = await seedEvent(venue.id, {
    artist: `Deletion Artist ${nonce}`,
  })
  const [crew] = await testDb
    .insert(crews)
    .values({ name: `Deletion Crew ${nonce}`, keeperId: userId })
    .returning()
  if (!crew) throw new Error('seedUserWithDataEverywhere: crew insert failed')

  // ---- Profile and identity ----
  await seedUserProfile(userId, { handle: `deletion-${nonce}` })
  await seedUserRole(userId)
  await seedUserCred(userId)

  // ---- Activity ----
  await seedUserEvent(userId, event.id)
  await testDb.insert(userArtistFollows).values({
    userId,
    artistName: `Deletion Artist ${nonce}`,
    canonicalName: `deletion artist ${nonce}`,
    source: 'manual',
  })
  await testDb.insert(feedback).values({
    userId,
    pageUrl: 'https://concertcrawl.app/browse',
    category: 'bug',
    message: 'Seeded feedback for the account-deletion tests.',
  })

  // ---- Prices ----
  const submission = await seedPriceSubmission(event.id, userId)
  await seedSubmissionConfirm(submission.id, userId)
  const report = await seedEventReport(event.id, userId)
  await seedEventReportConfirm(report.id, userId)

  // ---- Crews ----
  // `crews` itself is covered by the keeper_id above.
  await testDb.insert(crewMembers).values({ crewId: crew.id, userId })
  await testDb.insert(crewInvites).values({
    crewId: crew.id,
    token: `tok_${nonce}`,
    createdBy: userId,
    expiresAt: new Date(Date.now() + 86_400_000),
  })
  await testDb.insert(crewMutes).values({ crewId: crew.id, userId })

  // ---- Notifications and channels ----
  await seedNotification({
    userId,
    type: 'user_notification',
    category: 'price.drop',
    title: 'Price drop',
    body: 'A show you are watching got cheaper',
  })
  await testDb.insert(userNotificationPreferences).values({ userId })
  await testDb.insert(pushSubscriptions).values({
    userId,
    endpoint: `https://push.example.com/${nonce}`,
    p256dh: 'seeded-p256dh-key',
    auth: 'seeded-auth-key',
  })

  // ---- Spotify ----
  await testDb.insert(userSpotifyConnections).values({
    userId,
    spotifyUserId: `spotify_${nonce}`,
    displayName: 'Seeded Listener',
  })
  await testDb
    .insert(spotifyAlertLog)
    .values({ userId, eventId: event.id, kind: 'push' })

  // ---- Billing ----
  await testDb.insert(subscriptions).values({
    userId,
    stripeCustomerId: `cus_${nonce}`,
    stripeSubscriptionId: `sub_${nonce}`,
    tier: 'premium',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
  })
  await testDb.insert(userBilling).values({ userId })
  await testDb
    .insert(subscriptionEvents)
    .values({ userId, type: 'subscription_created' })
  await testDb
    .insert(giftedComps)
    .values({ userId, grantedBy: 'user_test_admin' })
  await testDb.insert(emailSendLog).values({
    userId,
    templateKey: 'welcome_paid',
    dedupeKey: `dedupe_${nonce}`,
    status: 'sent',
  })
  await testDb
    .insert(auditLog)
    .values({ actorId: userId, action: 'user.seeded', targetId: event.id })

  // ---- Invite codes (anonymize, keyed on used_by) ----
  await testDb.insert(inviteCodes).values({
    code: `code_${nonce}`,
    createdBy: 'user_test_admin',
    usedBy: userId,
    usedAt: new Date(),
  })

  // ---- Self-check ----
  const missing: string[] = []
  for (const entry of USER_OWNED_ENTRIES) {
    const column = entry.userIdColumn
    if (column === null) {
      throw new Error(
        `seedUserWithDataEverywhere: registry entry "${entry.tableName}" has ` +
          `disposition "${entry.disposition}" but no userIdColumn — it cannot ` +
          'be seeded or asserted on.',
      )
    }
    // postgres-js returns the row array directly; there is no `.rows` wrapper.
    const rows = await testDb.execute(
      sql`SELECT 1 FROM ${sql.identifier(entry.tableName)} WHERE ${sql.identifier(column)} = ${userId} LIMIT 1`,
    )
    if (rows.length === 0) missing.push(`${entry.tableName}.${column}`)
  }
  if (missing.length > 0) {
    throw new Error(
      'seedUserWithDataEverywhere: no row was seeded for these user-owned ' +
        `tables, so any deletion assertion against them would pass vacuously: ${missing.join(', ')}`,
    )
  }

  return userId
}
