/**
 * Removes `artists` rows no concert event references any more.
 *
 * The projection is insert-only and has never had a reaper, so two classes of
 * dead row accumulated:
 *
 *   - **Orphans.** The event that produced the row was deleted or re-crawled
 *     under a different billing string. Nothing points at the artist now.
 *   - **Non-concerts.** Until the write-through learned to filter on the
 *     `isConcert` verdict, a sports fixture or a tour-package title became an
 *     artist row minutes after the crawl. The nightly backfill would never
 *     have projected them.
 *
 * Both render an empty `/artists/:slug`, and both keep being worked by the
 * Spotify match job, which spends quota searching for a performer that does
 * not exist.
 *
 * The keep-set is exactly what `backfillArtists` discovers: a canonical name
 * billed as headliner or support on at least one event an admin has not
 * hidden. That symmetry is the safety property — this can only delete a row
 * the backfill would decline to create.
 *
 * A delete rather than the `hidden` flag because deletion is now durable: the
 * write-through no longer projects a non-concert, so a reaped row does not
 * reappear on the next crawl. If an admin later unhides the event, the nightly
 * backfill recreates the artist row (it reads `hidden_from_consumer` from the
 * database rather than the extractor's verdict). Its slug is recomputed from
 * scratch, so it usually comes back identical but will pick up a `-<n>` suffix
 * if another artist has claimed the base slug in the meantime. An unhide is a
 * repair, not a URL guarantee.
 */

import { sql } from 'drizzle-orm'
import type { Database } from '../client.js'

export interface PruneArtistsResult {
  /** Rows no unhidden event references. Equals `deleted` unless this was a dry run. */
  candidates: number
  /** Rows actually removed. Zero on a dry run. */
  deleted: number
  /** Up to 25 candidates, for eyeballing before an apply run. */
  sample: { name: string; slug: string; matchStatus: string }[]
}

interface DoomedRow extends Record<string, unknown> {
  name: string
  slug: string
  match_status: string
}

const SAMPLE_SIZE = 25

/**
 * `true` when no unhidden event bills this artist, as headliner or support.
 *
 * Written as NOT EXISTS rather than NOT IN deliberately: a NULL anywhere in a
 * NOT IN subquery makes the whole predicate NULL, which would silently delete
 * nothing and report a clean run.
 */
const UNREFERENCED = sql`
  NOT EXISTS (
    SELECT 1
    FROM events
    WHERE events.hidden_from_consumer = false
      AND (
        events.canonical_artist = artists.canonical_name
        OR artists.canonical_name = ANY(
          COALESCE(events.canonical_supporting, ARRAY[]::text[])
        )
      )
  )
`

export async function pruneArtists(
  database: Database,
  options: { dryRun: boolean },
): Promise<PruneArtistsResult> {
  const doomed = await database.execute<DoomedRow>(sql`
    SELECT name, slug, match_status
    FROM artists
    WHERE ${UNREFERENCED}
    ORDER BY name ASC
  `)

  const rows = [...doomed]
  const sample = rows.slice(0, SAMPLE_SIZE).map((row) => ({
    name: row.name,
    slug: row.slug,
    matchStatus: row.match_status,
  }))

  if (options.dryRun || rows.length === 0) {
    return { candidates: rows.length, deleted: 0, sample }
  }

  // Re-evaluated rather than deleting by the ids read above: a concurrent
  // crawl may have projected a new artist between the two statements, and
  // this predicate is the one that decides.
  const removed = await database.execute<{ id: string }>(sql`
    DELETE FROM artists
    WHERE ${UNREFERENCED}
    RETURNING id
  `)

  return { candidates: rows.length, deleted: [...removed].length, sample }
}
