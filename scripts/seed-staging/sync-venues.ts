/**
 * Concert Crawl — sync venues from prod to staging.
 *
 * Reads all venue rows from prod (via ProdReadonlyClient), upserts them into
 * staging on the unique `slug` column, then re-selects the staging ids to
 * build a prod-uuid → staging-uuid map.
 *
 * The venueIdMap is built in BOTH commit and dry-run modes: it is a read-only
 * SELECT against staging, so it does not count as a write. In dry-run the map
 * reflects venues that already exist in staging BEFORE this sync — a fresh
 * staging DB will therefore return an empty map and downstream steps will
 * legitimately report every prod row as skipped for missing FK parent. After
 * at least one commit-mode run of the venue sync, subsequent dry-runs return a
 * populated map and downstream FK counts become realistic.
 */

import { inArray } from 'drizzle-orm'
import { venues } from '../../packages/db/src/schema/index.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'

import type { Database as DrizzleWriteDb } from '@concert-crawl/db'

// Re-export the staging write-client type so downstream tasks can import it
// from a single shared location.
export type { DrizzleWriteDb }

/**
 * A read-only map from prod venue uuid → staging venue uuid.
 * Exported so Tasks 3–5 can import the type:
 *   import type { IdMap } from './sync-venues.js'
 */
export type IdMap = ReadonlyMap<string, string>

export async function syncVenues(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
}): Promise<{ scanned: number; processed: number; venueIdMap: IdMap }> {
  const { prod, staging, dryRun } = deps

  // 1. Read all venues from prod.
  const prodRows = await prod.select((db) => db.select().from(venues))

  const scanned = prodRows.length
  // `processed` counts rows we attempted to upsert (or, in dry-run, would attempt).
  // Not the same as rows that actually changed in staging — Drizzle's ON CONFLICT
  // UPDATE fires even when incoming values match stored ones. Naming this
  // `upserted` misleads operators into reading it as a change count.
  let processed = 0

  for (const row of prodRows) {
    if (!dryRun) {
      const { id: _prodId, ...rowWithoutId } = row
      await staging
        .insert(venues)
        .values(rowWithoutId)
        .onConflictDoUpdate({
          target: venues.slug,
          set: {
            name: row.name,
            websiteUrl: row.websiteUrl,
            city: row.city,
            timezone: row.timezone,
            active: row.active,
            verified: row.verified,
            verifiedBy: row.verifiedBy,
            verifiedAt: row.verifiedAt,
            lastCrawledAt: row.lastCrawledAt,
            crawlNotes: row.crawlNotes,
            crawlDelayMs: row.crawlDelayMs,
            robotsTxtAllowed: row.robotsTxtAllowed,
            robotsTxtCheckedAt: row.robotsTxtCheckedAt,
            consecutiveFailures: row.consecutiveFailures,
            blockedAt: row.blockedAt,
            lastEventCountAlertAt: row.lastEventCountAlertAt,
            platform: row.platform,
            platformVenueId: row.platformVenueId,
            extractionStrategy: row.extractionStrategy,
            crawlWaitUntil: row.crawlWaitUntil,
            crawlWaitForSelector: row.crawlWaitForSelector,
            crawlMode: row.crawlMode,
            address: row.address,
            capacity: row.capacity,
            venueType: row.venueType,
            about: row.about,
            neighborhood: row.neighborhood,
            featured: row.featured,
            lat: row.lat,
            lng: row.lng,
            contactEmail: row.contactEmail,
            priceUrl: row.priceUrl,
            ticketVendor: row.ticketVendor,
            debugCaptureHtml: row.debugCaptureHtml,
            updatedAt: row.updatedAt,
          },
        })
    }
    processed++
  }

  // 2. Re-select staging ids keyed by slug to build the venueIdMap.
  //    This is a read-only SELECT — safe in both commit and dry-run modes.
  const prodSlugs = prodRows.map((row) => row.slug)
  const stagingRows =
    prodSlugs.length > 0
      ? await staging
          .select({ id: venues.id, slug: venues.slug })
          .from(venues)
          .where(inArray(venues.slug, prodSlugs))
      : []

  // Build a slug → staging-id lookup.
  const slugToStagingId = new Map<string, string>()
  for (const stagingRow of stagingRows) {
    slugToStagingId.set(stagingRow.slug, stagingRow.id)
  }

  // Map prod-uuid → staging-uuid.
  const venueIdMap = new Map<string, string>()
  for (const prodRow of prodRows) {
    const stagingId = slugToStagingId.get(prodRow.slug)
    if (stagingId !== undefined) {
      venueIdMap.set(prodRow.id, stagingId)
    }
  }

  return { scanned, processed, venueIdMap }
}
