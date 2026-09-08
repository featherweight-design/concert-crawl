// Who is actually on an event's bill, and which of them owns its portrait.
//
// `canonical_artist` is not a derived artist identity — it is
// `canonicalizeArtist()` applied to whatever string the venue put in the title,
// and that function splits on billing separators (` & `, ` feat. `, ` - `) but
// not on a colon. So a night billed "Son Little: CityFolk Tour 2026" stores
// `son little: cityfolk tour 2026`, and every surface that matched an artist by
// equality on that column manufactured a second, tour-shaped artist beside the
// real one: its own page, its own follow button, its own slot on the bill.
//
// `canonical_headliners` / `canonical_supporting` are the derivation ladder's
// answer to the same question and are right where the raw column is wrong
// ("bassrush presents midnight tyrannosaurus" resolves to "midnight
// tyrannosaurus"; "the cure, the smiths, siouxsie" resolves to "the cure
// tribute", which is the act that is actually playing). So the arrays decide the
// bill and the raw column is a fallback for rows the ladder has never seen.

import {
  and,
  arrayOverlaps,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm'
import { events } from '@concert-crawl/db'

/**
 * Whether the event bills `canonicalName` — a column reference or a literal.
 *
 * Three ORed arms rather than one expression over a computed array, because
 * each arm stays independently indexable: both array arms use `&&` (not
 * `= ANY`) so they can use the GIN indexes, and the equality arm uses the btree
 * on `canonical_artist`.
 *
 * ⚠️ The equality arm is gated on `canonical_headliners IS NULL`, and that gate
 * is the whole fix. NULL means the ladder has never run on the row; an EMPTY
 * array means it ran and reported no act at all, which is the recurring-event
 * case (bar bingo, karaoke, club nights). Falling back to the raw title on
 * empty is what made "bass bingo" a followable artist. `genre-tagger.ts` draws
 * the same NULL/empty distinction — keep them in agreement.
 */
export const billsCanonicalName = (
  canonicalName: SQLWrapper | string,
): SQL<boolean> => {
  const oneElement = sql`ARRAY[${canonicalName}]::text[]`

  return sql`(
    ${events.canonicalHeadliners} && ${oneElement}
    OR ${events.canonicalSupporting} && ${oneElement}
    OR (
      ${events.canonicalHeadliners} IS NULL
      AND ${events.canonicalArtist} = ${canonicalName}
    )
  )`
}

/**
 * The same predicate against a whole list of names at once, for the routes that
 * resolve a batch of follows or search candidates in one query.
 *
 * Callers must not pass an empty list — `arrayOverlaps` against `ARRAY[]` is a
 * type error in Postgres, and every caller already returns early on an empty
 * candidate set.
 */
export const billsAnyCanonicalName = (canonicalNames: string[]): SQL => {
  const condition = or(
    arrayOverlaps(events.canonicalHeadliners, canonicalNames),
    arrayOverlaps(events.canonicalSupporting, canonicalNames),
    and(
      isNull(events.canonicalHeadliners),
      inArray(events.canonicalArtist, canonicalNames),
    ),
  )
  if (condition === undefined) {
    throw new Error('billsAnyCanonicalName requires a non-empty name list')
  }
  return condition
}

/**
 * The JS-side twin of `billsCanonicalName`, for code that has already read the
 * three columns and is bucketing rows by act.
 *
 * Kept beside the SQL so the NULL/empty gate cannot drift between the query that
 * selects the rows and the loop that attributes them.
 *
 * Top of the bill first, supports after. Several callers resolve a tie by taking
 * the first name that matches, and "the headliner won" is the answer they want.
 *
 * Only the headliner half falls back to the raw column, mirroring the SQL: the
 * supporting arm is unconditional there, so dropping supports on a ladder-less
 * row would attribute fewer acts than the query that selected it.
 */
export const billedCanonicalNames = (row: {
  canonicalArtist: string | null
  canonicalHeadliners: string[] | null
  canonicalSupporting: string[] | null
}): Set<string> => {
  const headliners =
    row.canonicalHeadliners ??
    (row.canonicalArtist === null ? [] : [row.canonicalArtist])

  return new Set([...headliners, ...(row.canonicalSupporting ?? [])])
}

/**
 * The one canonical name an event's own imagery should resolve through, for the
 * `artists.photoUrl` portrait join.
 *
 * Only a sole headliner is used. `canonicalizeSupporting` dedupes and SORTS, so
 * on a co-headline bill `canonical_headliners[1]` is merely alphabetically
 * first, not the act on top — picking it would put the wrong face on the row.
 * Those bills keep resolving through `canonical_artist` exactly as before; the
 * locked imagery rule already prefers the event's own artwork over any portrait,
 * so the ambiguity mostly does not surface.
 *
 * Built per call rather than once at module scope, so importing this module runs
 * no drizzle template. A module-scope `sql` tag executes at import time and
 * throws under the partial `vi.mock('drizzle-orm')` several route suites use,
 * which fails the whole file at collection. `crew-shows.ts` avoids the same trap
 * the same way.
 */
export const portraitCanonicalName = (): SQL<string> => sql<string>`CASE
  WHEN cardinality(${events.canonicalHeadliners}) = 1
    THEN ${events.canonicalHeadliners}[1]
  ELSE ${events.canonicalArtist}
END`

/**
 * The name a consumer surface should print as the event's headliner, and the
 * name it should resolve to an artist page.
 *
 * `events.artist` is the string the venue billed the night under, and the
 * derivation ladder deliberately leaves it alone: `canonical_artist` is derived
 * from it and is the dedup key `(venue_id, date, canonical_artist, show_time)`,
 * so rewriting it to the real act would fracture live rows. `events.headliners` is where the ladder puts
 * the answer, in the venue's own spelling. A night billed "Son Little: CityFolk
 * Tour 2026" carries `headliners = ['Son Little']`, and printing the raw column
 * is what left the tour name in the title block and cost the bill its
 * headliner: the tour-shaped name has no artist row to link to, so the follow
 * row was dropped as unfollowable.
 *
 * Only a sole headliner is taken, for the same reason `portraitCanonicalName`
 * does: `headliners` is written from the ladder wholesale and a co-headline
 * bill has an ordering we do not trust, whereas `events.artist` on those rows
 * already reads "A & B". A NULL array (ladder never ran) and an empty one
 * (ladder ran, found no act) both fall through to the raw column — the same
 * two-way fallback, since neither offers a better name.
 *
 * Built per call, not at module scope — see `portraitCanonicalName`.
 */
export const displayHeadliner = (): SQL<string> => sql<string>`CASE
  WHEN cardinality(${events.headliners}) = 1 THEN ${events.headliners}[1]
  ELSE ${events.artist}
END`
