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
 * The keep-set starts from what `backfillArtists` discovers: a canonical name
 * billed as headliner or support on at least one event an admin has not
 * hidden. Symmetry with the backfill was the original safety property — this
 * can only delete a row the backfill would decline to create.
 *
 * Symmetry turned out not to be enough, because the backfill had a blind spot
 * of its own. It read `canonical_artist` and `canonical_supporting`, and a
 * co-headliner billed only in the title ("Knocked Loose & Denzel Curry") landed
 * in neither. A dry run against production found 50 such rows among 272
 * candidates — Denzel Curry, Ministry, Sleater-Kinney and The Black Dahlia
 * Murder all had upcoming Denver shows and were all set to be deleted. So the
 * keep-set is widened by `BILLED_IN_LIVE_TITLE` below.
 *
 * The derivation ladder now splits co-headliners into `canonical_headliners`,
 * which closes that blind spot — but only for rows it has actually re-derived.
 * An event crawled before it existed still carries a NULL headliner set and
 * still needs the title widening, so the widening stays until the re-derivation
 * pass has run everywhere and no NULL headliner sets remain.
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
  /** Rows the predicate condemns. Equals `deleted` unless this was a dry run. */
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
 * The headliner half mirrors `backfillArtists` clause for clause, because
 * symmetry with the backfill is the safety property: this can only delete a row
 * the backfill would decline to create. So it reads `canonical_headliners` and
 * falls back to `canonical_artist` only where that column IS NULL. Reading
 * `canonical_artist` unconditionally would keep every junk row the derivation
 * ladder just retired, and reading only `canonical_headliners` would reap the
 * co-headliners the backfill now projects.
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
        (
          events.canonical_headliners IS NOT NULL
          AND artists.canonical_name = ANY(events.canonical_headliners)
        )
        OR (
          events.canonical_headliners IS NULL
          AND events.canonical_artist = artists.canonical_name
        )
        OR artists.canonical_name = ANY(
          COALESCE(events.canonical_supporting, ARRAY[]::text[])
        )
      )
  )
`

/**
 * Shorter than this, a name is a substring of half the corpus rather than
 * evidence of a booking. Four characters clears the initialisms that caused
 * trouble in the production sample without sparing anything real.
 */
const MIN_BILLING_NAME_LENGTH = 4

/**
 * `events.date` is the show's local calendar date, so "today" has to be
 * Denver's. Bare `CURRENT_DATE` resolves in the session timezone, which is UTC
 * on hosted Postgres, and every Denver evening falls on the following UTC day.
 * A show playing tonight would read as past for those hours, which is exactly
 * when someone is most likely to be running this by hand. Matches
 * `DENVER_TODAY` in crawler-core and `reconcile-drift-duplicates`.
 */
const DENVER_TODAY = sql`(NOW() AT TIME ZONE 'America/Denver')::date`

/**
 * `artists.canonical_name` rewritten into the same form `events.canonical_title`
 * already holds, so the two can be compared directly.
 *
 * Both columns come from the same NFD + Latin-Extended + lowercase pipeline, so
 * they agree on `Sigur Rós` → `sigur ros` without any help here. They disagree
 * on exactly one rule: `canonicalizeTitle` strips every apostrophe variant so
 * "Zed's Dead" and "Zeds Dead" collapse, and `canonicalizeArtist` does not. So
 * the name gets that one pass applied to it and the two forms line up.
 */
const APOSTROPHE_STRIPPED_NAME = sql`regexp_replace(artists.canonical_name, '[''‘’‛]', '', 'g')`

/**
 * `true` when some live upcoming event names this artist in its title, even
 * though canonicalisation never recorded them as headliner or support.
 *
 * Matched against `canonical_title` rather than the raw `title` so the two
 * sides have been through the same normalisation. Against the raw title a name
 * carrying a diacritic could never match: the artist row holds `sigur ros`
 * while the title still reads "Sigur Rós", so the substring search misses and
 * the band gets reaped.
 *
 * `strpos` rather than `LIKE` or a regex because canonical names are raw user
 * data: `Just_Graham` carries a LIKE wildcard and `$UICIDEBOY$` carries regex
 * metacharacters, and neither pattern language can be handed a name without
 * escaping it first. A plain substring search has no such syntax to get wrong.
 *
 * Deliberately coarse, and deliberately biased. A substring hit is weak
 * evidence — "pants" matches "DJ Housepants" — so this spares some rows that
 * are genuinely dead. That is the direction to be wrong in: sparing junk costs
 * one more cleanup pass, while deleting a band playing next month costs an
 * empty artist page and the Spotify match that took quota to earn.
 */
const BILLED_IN_LIVE_TITLE = sql`
  EXISTS (
    SELECT 1
    FROM events
    WHERE events.hidden_from_consumer = false
      AND events.status = 'upcoming'
      AND events.date >= ${DENVER_TODAY}
      AND length(${APOSTROPHE_STRIPPED_NAME}) >= ${MIN_BILLING_NAME_LENGTH}
      AND strpos(events.canonical_title, ${APOSTROPHE_STRIPPED_NAME}) > 0
  )
`

/** Unreferenced by the backfill's reckoning, and not billed in a live title. */
const DOOMED = sql`${UNREFERENCED} AND NOT ${BILLED_IN_LIVE_TITLE}`

export async function pruneArtists(
  database: Database,
  options: { dryRun: boolean },
): Promise<PruneArtistsResult> {
  const doomed = await database.execute<DoomedRow>(sql`
    SELECT name, slug, match_status
    FROM artists
    WHERE ${DOOMED}
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
    WHERE ${DOOMED}
    RETURNING id
  `)

  return { candidates: rows.length, deleted: [...removed].length, sample }
}
