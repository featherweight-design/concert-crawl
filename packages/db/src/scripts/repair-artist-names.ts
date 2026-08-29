/**
 * Rewrites `artists.name` where the event billing already contradicts it.
 *
 * The projection is insert-only: `backfillArtists` writes with
 * `onConflictDoNothing`, so the display name a row was born with is the display
 * name it keeps. That was fine while the only writer was the backfill, but the
 * derivation ladder has since learned to split a title into `canonical_artist`
 * plus `canonical_headliners`, and rows created before it landed carry a `name`
 * taken from the whole title — `Dogstar: ALL IN NOW TOUR`, `Baby Keem - The
 * Ca$ino Tour`. Their `canonical_name` is already correct (`dogstar`,
 * `baby keem`); only the string a human reads is stale.
 *
 * So this is not a new naming rule. It is the backfill's own rule for a
 * single-act bill — "`headliners[1]` is that name's raw spelling" — applied to
 * the rows the conflict-do-nothing insert could never revise.
 *
 * `canonical_name` is deliberately NOT touched. It is uniquely indexed and is
 * the join key against `events`, and `slug` is derived from it, so rewriting it
 * would risk a collision and break a live `/artists/:slug` URL. Every candidate
 * here already has the canonical name it should have; the repair is cosmetic by
 * construction, which is also why it cannot change any match outcome — the
 * Spotify search reads `canonical_name`.
 *
 * A separate concern this does NOT address: a row whose *canonical* name is
 * itself a tour title (`dogstar: all in now tour`) exists as its own artist
 * beside the real one. Those are unreferenced and belong to the reaper, not
 * here — see `prune-artists`.
 */

import { sql } from 'drizzle-orm'
import type { Database } from '../client.js'

export interface RepairArtistNamesResult {
  /** Rows whose billing contradicts their stored name, as of the read. */
  candidates: number
  /**
   * Rows actually rewritten. Zero on a dry run. The write re-derives the
   * predicate rather than replaying the ids it read, so a concurrent crawl can
   * leave this below `candidates`.
   */
  repaired: number
  /** Up to 25 candidates, for eyeballing before an apply run. */
  sample: { slug: string; from: string; to: string; kind: RepairKind }[]
  /** Candidates by repair kind, so an apply decision can weigh the two classes separately. */
  byKind: Record<string, number>
}

/**
 * `recase` is a pure casing disagreement; `shorten` strips a trailing tour or
 * support billing. Reported separately because they carry different risk: a
 * shorten is corroborated by the venue naming the act on its own, while a
 * recase is only ever as good as the venue's shift key.
 */
type RepairKind = 'recase' | 'shorten'

interface RepairRow extends Record<string, unknown> {
  id: string
  slug: string
  current_name: string
  billed_name: string
  kind: RepairKind
}

const SAMPLE_SIZE = 25

/**
 * The billing is only usable when the event names exactly one act.
 *
 * `canonical_headliners` is deduped and sorted, so it is NOT positionally
 * aligned with the raw `headliners` array and the two cannot be paired by index
 * in general. At cardinality one there is no ordering to get wrong. Both arrays
 * are checked because `headliners` is not deduped: `['Kokoroko', 'Kokoroko']`
 * canonicalizes to a single element while the raw array still holds two.
 */
const SINGLE_ACT_BILL = sql`
  cardinality(events.canonical_headliners) = 1
  AND cardinality(events.headliners) = 1
  AND events.headliners[1] IS NOT NULL
  AND btrim(events.headliners[1]) <> ''
`

/**
 * `true` when the stored name is the billed name with a suffix on the end.
 *
 * `left(...) = ...` rather than `LIKE billed || '%'` because the billing is raw
 * venue data: `Just_Graham` carries a LIKE wildcard and would match names it
 * has no business matching. A plain prefix comparison has no pattern language
 * to escape. Same reasoning as `strpos` in `prune-artists`.
 */
const NAME_EXTENDS_BILLING = sql`
  left(lower(artists.name), length(lower(btrim(events.headliners[1]))))
    = lower(btrim(events.headliners[1]))
`

/**
 * The safety property: the repair only ever shortens or re-cases, never
 * lengthens.
 *
 * A longer name is how the bad rows were made in the first place, so adopting
 * one would be the bug rather than the fix. Anything that is neither a pure
 * casing change nor a suffix strip — a genuinely different spelling, an
 * abbreviation, a co-headliner the ladder folded in — is left for a human. The
 * cost of skipping one is a name that stays slightly wrong; the cost of taking
 * one is a name that gets actively worse.
 */
const CORROBORATED = sql`
  btrim(events.headliners[1]) <> artists.name
  AND (
    lower(btrim(events.headliners[1])) = lower(artists.name)
    OR ${NAME_EXTENDS_BILLING}
  )
`

/**
 * One billing per artist, chosen the way `backfillArtists` chooses one: most
 * frequently seen, ties broken alphabetically so two runs agree.
 *
 * Nothing guarantees a single answer — an act can be billed two ways across two
 * events — and picking arbitrarily would make the script's output depend on
 * scan order.
 */
const CANDIDATES = sql`
  WITH billings AS (
    SELECT
      artists.id,
      artists.slug,
      artists.name AS current_name,
      btrim(events.headliners[1]) AS billed_name,
      CASE
        WHEN lower(btrim(events.headliners[1])) = lower(artists.name) THEN 'recase'
        ELSE 'shorten'
      END AS kind,
      COUNT(*) AS seen_count
    FROM artists
    JOIN events
      ON events.canonical_headliners[1] = artists.canonical_name
      AND events.hidden_from_consumer = false
      AND ${SINGLE_ACT_BILL}
    WHERE ${CORROBORATED}
    GROUP BY artists.id, artists.slug, artists.name, btrim(events.headliners[1])
  ),
  ranked AS (
    SELECT
      id, slug, current_name, billed_name, kind,
      ROW_NUMBER() OVER (
        PARTITION BY id
        ORDER BY seen_count DESC, billed_name ASC
      ) AS rank
    FROM billings
  )
  SELECT id, slug, current_name, billed_name, kind
  FROM ranked
  WHERE rank = 1
`

export async function repairArtistNames(
  database: Database,
  options: { dryRun: boolean },
): Promise<RepairArtistNamesResult> {
  const found = await database.execute<RepairRow>(sql`
    ${CANDIDATES}
    ORDER BY current_name ASC
  `)

  const rows = [...found]
  const sample = rows.slice(0, SAMPLE_SIZE).map((row) => ({
    slug: row.slug,
    from: row.current_name,
    to: row.billed_name,
    kind: row.kind,
  }))

  const byKind = rows.reduce<Record<string, number>>((tally, row) => {
    tally[row.kind] = (tally[row.kind] ?? 0) + 1
    return tally
  }, {})

  if (options.dryRun || rows.length === 0) {
    return { candidates: rows.length, repaired: 0, sample, byKind }
  }

  // Re-derived rather than written from the ids read above: a concurrent crawl
  // may have changed a billing between the two statements, and the predicate
  // above is the one that decides. The `<> name` guard makes the write a no-op
  // for any row that has since been repaired by hand.
  const written = await database.execute<{ id: string }>(sql`
    UPDATE artists
    SET name = repair.billed_name, updated_at = NOW()
    FROM (${CANDIDATES}) AS repair
    WHERE artists.id = repair.id
      AND artists.name <> repair.billed_name
    RETURNING artists.id
  `)

  return {
    candidates: rows.length,
    repaired: [...written].length,
    sample,
    byKind,
  }
}
