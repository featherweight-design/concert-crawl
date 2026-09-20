/**
 * Concert Crawl — sync artists from prod to staging.
 *
 * Reads all artist rows from prod (via ProdReadonlyClient) and upserts them
 * into staging on the unique `slug` column.
 *
 * No id map is returned: `artists` is a projection table and nothing
 * references it by foreign key (see packages/db/src/schema/artists.ts), so a
 * missing row degrades to "no artist page" rather than to a broken event.
 * That is also why this step can run in any position after venues.
 *
 * Upsert target is `slug` rather than `canonical_name` even though both are
 * unique: `slug` is the URL identity staging pages are walked by. Both columns
 * are derived from the same source string by the same artistSlug() code path on
 * both databases, so a canonical-name collision under a new slug would mean the
 * two databases disagree about canonicalization — an error worth surfacing, not
 * swallowing.
 */

import { artists } from '../../packages/db/src/schema/index.js'
import type { ProdReadonlyClient } from './prod-readonly-client.js'
import type { DrizzleWriteDb } from './sync-venues.js'

export async function syncArtists(deps: {
  prod: ProdReadonlyClient
  staging: DrizzleWriteDb
  dryRun: boolean
}): Promise<{ scanned: number; processed: number }> {
  const { prod, staging, dryRun } = deps

  const prodRows = await prod.select((db) => db.select().from(artists))

  const scanned = prodRows.length
  // `processed` counts rows we attempted to upsert (or, in dry-run, would
  // attempt) — not rows that actually changed. ON CONFLICT UPDATE fires even
  // when incoming values match stored ones. Same naming rationale as
  // sync-venues.ts.
  let processed = 0

  for (const row of prodRows) {
    if (!dryRun) {
      const { id: _prodId, ...rowWithoutId } = row
      await staging
        .insert(artists)
        .values(rowWithoutId)
        .onConflictDoUpdate({
          target: artists.slug,
          set: {
            name: row.name,
            canonicalName: row.canonicalName,
            spotifyArtistId: row.spotifyArtistId,
            matchStatus: row.matchStatus,
            matchConfidence: row.matchConfidence,
            photoUrl: row.photoUrl,
            photoFetchedAt: row.photoFetchedAt,
            hidden: row.hidden,
            matchCheckedAt: row.matchCheckedAt,
            matchAttempts: row.matchAttempts,
            spotifyCandidates: row.spotifyCandidates,
            spotifyCandidatesFetchedAt: row.spotifyCandidatesFetchedAt,
            updatedAt: row.updatedAt,
          },
        })
    }
    processed++
  }

  return { scanned, processed }
}
