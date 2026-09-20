/**
 * Concert Crawl — sync artists from prod to staging.
 *
 * Reads all artist rows from prod (via ProdReadonlyClient) and upserts them
 * into staging on the unique `canonical_name` column.
 *
 * No id map is returned: `artists` is a projection table and nothing
 * references it by foreign key (see packages/db/src/schema/artists.ts), so a
 * missing row degrades to "no artist page" rather than to a broken event.
 * That is also why this step can run in any position after venues.
 *
 * `canonical_name` is the identity, not `slug`, even though both are unique and
 * `slug` is the URL the staging pages are walked by. A slug is derived from the
 * canonical name and then de-collided against whatever slugs THAT database
 * already holds (`resolveSlug`, packages/types/src/artist-slug.ts): "m.i.a."
 * and "mia" both slug to `mia`, so whichever was inserted second holds `mia-2`.
 * Insertion order differs between the two databases, so prod's slug is not a
 * stable cross-database identity — upserting on it would pair a prod row with
 * whichever staging artist happened to win that race, and the DO UPDATE would
 * then violate staging's `canonical_name` unique index.
 *
 * So the prod `slug` is discarded for the same reason the prod `id` is:
 * staging derives its own. New rows get a slug resolved against staging's taken
 * set, and rows that already exist keep the slug their URLs already use.
 *
 * That is also why an existing row is UPDATEd rather than upserted: an
 * `onConflictDoUpdate` keyed on `canonical_name` still has to name a `slug` in
 * its INSERT values, and Postgres checks every unique index on that tuple
 * before the conflict target decides anything — so a prod slug belonging to a
 * different staging artist would abort the whole step. Splitting the two writes
 * keeps `slug` out of the update path completely.
 */

import { eq } from 'drizzle-orm'
import { artistSlug, resolveSlug } from '@concert-crawl/types'
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

  const stagingRows = await staging
    .select({ canonicalName: artists.canonicalName, slug: artists.slug })
    .from(artists)
  const takenSlugs = new Set(stagingRows.map((row) => row.slug))
  const existingCanonical = new Set(stagingRows.map((row) => row.canonicalName))

  const scanned = prodRows.length
  // `processed` counts rows we attempted to upsert (or, in dry-run, would
  // attempt) — not rows that actually changed. ON CONFLICT UPDATE fires even
  // when incoming values match stored ones. Same naming rationale as
  // sync-venues.ts.
  let processed = 0

  for (const row of prodRows) {
    // Every mutable column except `slug`, which staging owns. Shared by both
    // arms so an insert and an update can never drift apart.
    const mutable = {
      name: row.name,
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
    }

    if (existingCanonical.has(row.canonicalName)) {
      if (!dryRun) {
        await staging
          .update(artists)
          .set(mutable)
          .where(eq(artists.canonicalName, row.canonicalName))
      }
    } else {
      const slug = resolveSlug(
        artistSlug(row.canonicalName),
        takenSlugs,
        row.canonicalName,
      )
      takenSlugs.add(slug)
      existingCanonical.add(row.canonicalName)

      if (!dryRun) {
        await staging.insert(artists).values({
          ...mutable,
          canonicalName: row.canonicalName,
          slug,
        })
      }
    }
    processed++
  }

  return { scanned, processed }
}
