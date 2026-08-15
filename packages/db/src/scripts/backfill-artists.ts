/**
 * Backfills the `artists` projection table (#1115) from `events`.
 *
 * One row per distinct element of `events.canonical_headliners` AND of
 * `events.canonical_supporting` — an artist that has only ever opened for
 * someone else still gets a page, and a co-headliner gets their own rather than
 * being folded into the primary act (#1203). Display `name` is the
 * most-frequently seen raw spelling available for that canonical name.
 *
 * The headliner set is the derivation ladder's answer, so an event it resolved
 * to NO artist projects nothing at all. `canonical_artist` seeds the projection
 * only for rows the ladder has never seen; see the query for why.
 *
 * Idempotent by construction: slugs are resolved against everything already
 * stored plus everything derived in this pass, and the insert is an untargeted
 * `onConflictDoNothing` — a row is skipped on a `canonical_name` collision (the
 * expected re-run case) and equally on a `slug` collision, which is what a
 * concurrent crawl write-through produces. Safe to re-run against local,
 * staging or prod.
 *
 * `pnpm db:seed` calls this, which covers local only — deployed environments
 * run migrations but never the seed, so they need the one-shot in
 * `run-backfill-artists.ts` once, after 0069 lands.
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
  // The headliner branch reads `canonical_headliners` — the derivation ladder's
  // answer — and falls back to `canonical_artist` ONLY when that column is
  // NULL. The NULL-vs-empty distinction is the whole correctness of this query:
  // NULL means the derivation stage has never seen the row (a pre-migration
  // event), while an EMPTY array is a verdict, the ladder having read the
  // listing and concluded nobody was billed. Falling back on empty would
  // reinstate exactly the bug this replaced — `canonical_artist` is the display
  // string and the dedup key, and projecting it put 222 event titles into the
  // artists table.
  //
  // One pass over `events`: headliners UNION ALL the unnested supporting
  // arrays, grouped to pick the most-frequent raw spelling per canonical
  // name. Supporting artists have no per-name raw spelling stored alongside
  // `canonical_supporting` (the raw `supporting_artists` array is positionally
  // independent of the canonicalized one, which is deduped and sorted), so a
  // support-only artist falls back to its canonical string as the display
  // name. A later crawl that bills them as a headliner does not overwrite it —
  // the insert is conflict-do-nothing by design, and PR-C's admin surface is
  // where a human corrects a name.
  //
  // `hidden_from_consumer` rows are skipped on both branches (#1343). An admin
  // hides an event because it is not a concert — a bingo night, a yoga class, a
  // festival shuttle pickup — and projecting its billing string creates an
  // artist page for something that was never an artist. `/artists/:slug`
  // applies the same filter when it counts shows, so a row discovered here
  // would render an empty page anyway.
  const rows = await database.execute<CanonicalRow>(sql`
    WITH names AS (
      SELECT
        headliner.value AS canonical_name,
        -- canonical_headliners is deduped and sorted, so it is NOT
        -- positionally aligned with the raw headliners array and the two
        -- cannot be paired by ordinality. The one raw spelling we can attach
        -- safely is the primary act's, which the artist column already holds
        -- under a known canonical key. Every other co-headliner takes its
        -- canonical string, exactly as a support-only artist does.
        CASE WHEN headliner.value = canonical_artist THEN artist
             ELSE headliner.value END AS display_name
      FROM events
      CROSS JOIN LATERAL unnest(canonical_headliners) AS headliner(value)
      WHERE canonical_headliners IS NOT NULL
        AND headliner.value IS NOT NULL AND headliner.value <> ''
        AND hidden_from_consumer = false
      UNION ALL
      -- The legacy fallback. NULL is ambiguous by construction: it is both a
      -- row the derivation ladder has never touched AND the ladder reaching no
      -- verdict during an adjudicator outage. Only the first deserves this
      -- arm, and nothing on the row separates them.
      --
      -- The residual exposure is one narrow case — an event first INSERTed
      -- while the adjudicator was down, whose title-derived canonical_artist
      -- gets projected here. It self-heals on the next successful crawl.
      -- Rows that already carry a bill are never affected: the upsert COALESCEs
      -- a NULL verdict back to the stored value rather than clearing it.
      --
      -- Dropping the arm outright is worse than the exposure: it would
      -- de-project every artist on the back catalogue until a re-crawl reached
      -- each row. The one-off re-derivation pass is what retires it.
      SELECT canonical_artist AS canonical_name, artist AS display_name
      FROM events
      WHERE canonical_headliners IS NULL
        AND canonical_artist IS NOT NULL AND canonical_artist <> ''
        AND hidden_from_consumer = false
      UNION ALL
      SELECT supporting.value AS canonical_name, supporting.value AS display_name
      FROM events
      CROSS JOIN LATERAL unnest(COALESCE(canonical_supporting, ARRAY[]::text[])) AS supporting(value)
      WHERE supporting.value IS NOT NULL AND supporting.value <> ''
        AND hidden_from_consumer = false
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
