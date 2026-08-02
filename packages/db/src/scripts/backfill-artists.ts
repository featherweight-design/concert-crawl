/**
 * Backfills the `artists` projection table (#1115) from `events`.
 *
 * One row per distinct `events.canonical_artist` AND per distinct element of
 * `events.canonical_supporting` — an artist that has only ever opened for
 * someone else still gets a page. Display `name` is the most-frequently seen
 * raw spelling for that canonical name.
 *
 * Idempotent by construction: slugs are resolved against everything already
 * stored plus everything derived in this pass, and the insert is
 * `onConflictDoNothing` on `canonical_name`. Safe to re-run against local,
 * staging or prod, and wired into `pnpm db:seed` so no environment needs a
 * manual step.
 */

import { sql } from 'drizzle-orm'
import { artistSlug, resolveSlug } from '@concert-crawl/types'
import { artists } from '../schema/artists.js'
import type { Database } from '../client.js'

export interface BackfillArtistsResult {
  /** Distinct canonical names discovered in `events`. */
  discovered: number
  /** Rows actually inserted this run. Zero on a re-run with no new artists. */
  inserted: number
}

/** How many rows to send per INSERT. Keeps the parameter count well clear of Postgres' 65535 limit. */
const INSERT_CHUNK_SIZE = 500

interface CanonicalRow extends Record<string, unknown> {
  canonical_name: string
  display_name: string
}

/**
 * Runs the backfill against the supplied database handle.
 *
 * The handle is a parameter rather than the module-level `db` singleton so
 * the integration test can drive it against the per-worktree test DB.
 */
export async function backfillArtists(
  database: Database,
): Promise<BackfillArtistsResult> {
  // One pass over `events`: headliners UNION ALL the unnested supporting
  // arrays, grouped to pick the most-frequent raw spelling per canonical
  // name. Supporting artists have no per-name raw spelling stored alongside
  // `canonical_supporting` (the raw `supporting_artists` array is positionally
  // independent of the canonicalized one, which is deduped and sorted), so a
  // support-only artist falls back to its canonical string as the display
  // name. A later crawl that bills them as a headliner does not overwrite it —
  // the insert is conflict-do-nothing by design, and PR-C's admin surface is
  // where a human corrects a name.
  const rows = await database.execute<CanonicalRow>(sql`
    WITH names AS (
      SELECT canonical_artist AS canonical_name, artist AS display_name
      FROM events
      WHERE canonical_artist IS NOT NULL AND canonical_artist <> ''
      UNION ALL
      SELECT supporting.value AS canonical_name, supporting.value AS display_name
      FROM events
      CROSS JOIN LATERAL unnest(COALESCE(canonical_supporting, ARRAY[]::text[])) AS supporting(value)
      WHERE supporting.value IS NOT NULL AND supporting.value <> ''
    ),
    ranked AS (
      SELECT
        canonical_name,
        display_name,
        COUNT(*) AS seen_count,
        ROW_NUMBER() OVER (
          PARTITION BY canonical_name
          ORDER BY COUNT(*) DESC, display_name ASC
        ) AS rank
      FROM names
      GROUP BY canonical_name, display_name
    )
    SELECT canonical_name, display_name
    FROM ranked
    WHERE rank = 1
    ORDER BY canonical_name ASC
  `)

  const candidates = [...rows]
  if (candidates.length === 0) {
    return { discovered: 0, inserted: 0 }
  }

  // Slugs already stored — a re-run must not hand an existing slug to a new
  // artist, and must not renumber an artist that already has a URL.
  const stored = await database
    .select({ canonicalName: artists.canonicalName, slug: artists.slug })
    .from(artists)
  const taken = new Set(stored.map((row) => row.slug))
  const alreadyProjected = new Set(stored.map((row) => row.canonicalName))

  const values: (typeof artists.$inferInsert)[] = []
  for (const candidate of candidates) {
    if (alreadyProjected.has(candidate.canonical_name)) continue

    const slug = resolveSlug(
      artistSlug(candidate.canonical_name),
      taken,
      candidate.canonical_name,
    )
    taken.add(slug)
    values.push({
      name: candidate.display_name,
      canonicalName: candidate.canonical_name,
      slug,
    })
  }

  let inserted = 0
  for (let i = 0; i < values.length; i += INSERT_CHUNK_SIZE) {
    const chunk = values.slice(i, i + INSERT_CHUNK_SIZE)
    const insertedRows = await database
      .insert(artists)
      .values(chunk)
      // A concurrent crawl write-through may have claimed the same canonical
      // name between the SELECT above and this INSERT. Do nothing rather than
      // fail the whole backfill.
      .onConflictDoNothing()
      .returning({ id: artists.id })
    inserted += insertedRows.length
  }

  return { discovered: candidates.length, inserted }
}
