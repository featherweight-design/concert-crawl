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
 * So this is not a new naming rule. It is the backfill's own pairing — a raw
 * headliner that folds to the canonical name, or `headliners[1]` on a single-act
 * bill — applied to the rows the conflict-do-nothing insert could never revise.
 * The pairing covers co-headline bills too: `Clipse & J.I.D` was the primary
 * act's name on a bill billing `Clipse` and `J.I.D` separately.
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

import { sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { foldedArtistName } from './artist-name-fold.js';

export interface RepairArtistNamesResult {
  /** Rows whose billing contradicts their stored name, as of the read. */
  candidates: number;
  /**
   * Rows actually rewritten. Zero on a dry run. The write re-derives the
   * predicate rather than replaying the ids it read, so a concurrent crawl can
   * leave this below `candidates`.
   */
  repaired: number;
  /** Up to 25 candidates, for eyeballing before an apply run. */
  sample: { slug: string; from: string; to: string; kind: RepairKind }[];
  /** Candidates by repair kind, so an apply decision can weigh the two classes separately. */
  byKind: Record<string, number>;
}

/**
 * `recase` is a pure casing disagreement; `shorten` strips a trailing tour or
 * support billing. Reported separately because they carry different risk: a
 * shorten is corroborated by the venue naming the act on its own, while a
 * recase is only ever as good as the venue's shift key.
 */
type RepairKind = 'recase' | 'shorten';

interface RepairRow extends Record<string, unknown> {
  id: string;
  slug: string;
  current_name: string;
  billed_name: string;
  kind: RepairKind;
}

const SAMPLE_SIZE = 25;

/**
 * The event's own spelling of this artist, paired by value rather than by
 * position: `canonical_headliners` is deduped and sorted, so it is NOT aligned
 * with the raw `headliners` array.
 *
 * Two pairings, the backfill's own. On a single-act bill there is no ordering
 * to get wrong, so its one distinct raw value is the spelling (distinct, because
 * `headliners` is not deduped: `['Kokoroko', 'Kokoroko']` is still one act). On any bill, a raw headliner that folds to exactly the
 * canonical name by case, accents and whitespace alone is that act's spelling, which is
 * what reaches each act on a co-headline bill. The fold has no separator split,
 * so it never pairs a name with a different act's billing.
 */
const BILLINGS = sql`
  SELECT min(btrim(raw.value)) AS billed_name
  FROM unnest(events.headliners) AS raw(value)
  WHERE cardinality(events.canonical_headliners) = 1
    AND btrim(raw.value) <> ''
  HAVING count(DISTINCT btrim(raw.value)) = 1
  UNION
  SELECT btrim(raw.value)
  FROM unnest(events.headliners) AS raw(value)
  WHERE ${foldedArtistName('raw.value')} = artists.canonical_name
`;

/**
 * `true` when the stored name is the billed name with a suffix on the end.
 *
 * `left(...) = ...` rather than `LIKE billed || '%'` because the billing is raw
 * venue data: `Just_Graham` carries a LIKE wildcard and would match names it
 * has no business matching. A plain prefix comparison has no pattern language
 * to escape. Same reasoning as `strpos` in `prune-artists`.
 */
const NAME_EXTENDS_BILLING = sql`
  left(lower(artists.name), length(lower(billing.billed_name)))
    = lower(billing.billed_name)
`;

/**
 * A row still named by its canonical fallback (`beyonce`) takes the billing
 * that folds to exactly that canonical (`Beyoncé`): the fold proves it is the
 * same name with its accents and casing restored, never a longer one.
 */
const RESTORES_FALLBACK_NAME = sql`
  artists.name = artists.canonical_name
  AND ${foldedArtistName('billing.billed_name')} = artists.canonical_name
`;

/** A pure casing change, or a fallback name getting its accents back. */
const IS_RECASE = sql`
  (lower(billing.billed_name) = lower(artists.name) OR ${RESTORES_FALLBACK_NAME})
`;

/**
 * The casing changes the repair refuses: a single-case billing over a name that
 * is already cased. Venues shout (`REZZ`, `MANÁ`, `GRYFFIN`) and sometimes
 * whisper (`ivri`), and a row that reads `Rezz` or `Ivri` was cased by
 * someone, so trading it for either makes it worse. A lowercase name is the
 * canonical fallback and holds no casing worth keeping, so `j.i.d` still
 * becomes `J.I.D`, and a mixed-case billing still fixes an all-caps name.
 *
 * A pure recase only. A shorten still takes a single-case billing: stripping
 * `Dogstar: ALL IN NOW TOUR` to `DOGSTAR` loses casing but removes the tour
 * title, which is the worse error.
 */
const FLATTENS_CASED_NAME = sql`
  billing.billed_name <> artists.name
  AND lower(billing.billed_name) = lower(artists.name)
  AND (billing.billed_name = upper(billing.billed_name)
    OR billing.billed_name = lower(billing.billed_name))
  AND upper(billing.billed_name) <> lower(billing.billed_name)
  AND artists.name <> lower(artists.name)
`;

/**
 * The safety property: the repair only ever shortens or re-cases, never
 * lengthens.
 *
 * A longer name is how the bad rows were made in the first place, so adopting
 * one would be the bug rather than the fix. Anything that is neither a pure
 * casing change nor a suffix strip — a genuinely different spelling, an
 * abbreviation — is left for a human. A co-headliner folded into the name
 * (`Clipse & J.I.D`) is a suffix strip, so it is repaired. The
 * cost of skipping one is a name that stays slightly wrong; the cost of taking
 * one is a name that gets actively worse.
 */
const CORROBORATED = sql`
  (${IS_RECASE} OR ${NAME_EXTENDS_BILLING})
  AND NOT (${FLATTENS_CASED_NAME})
`;

/**
 * One billing per artist: a cased spelling before a single-case one (as the
 * backfill pairs), then most frequently seen, then byte order so two runs and
 * two databases agree.
 *
 * Nothing guarantees a single answer — an act can be billed two ways across two
 * events — and picking arbitrarily would make the script's output depend on
 * scan order. The current name is one of the votes, and a row whose winner is
 * already its name is left alone: otherwise two corroborated spellings would
 * swap places on every run.
 */
const CANDIDATES = sql`
  WITH billings AS (
    SELECT
      artists.id,
      artists.slug,
      artists.name AS current_name,
      billing.billed_name,
      CASE WHEN ${IS_RECASE} THEN 'recase' ELSE 'shorten' END AS kind,
      COUNT(*) AS seen_count
    FROM artists
    JOIN events
      -- Containment rather than = ANY(...): only @> can use the GIN index
      -- events_canonical_headliners_idx (migration 0074).
      ON events.canonical_headliners @> ARRAY[artists.canonical_name]
      AND events.hidden_from_consumer = false
    CROSS JOIN LATERAL (${BILLINGS}) AS billing
    WHERE billing.billed_name IS NOT NULL
      AND billing.billed_name <> ''
      AND ${CORROBORATED}
    GROUP BY artists.id, artists.slug, artists.name, billing.billed_name
  ),
  ranked AS (
    SELECT
      id, slug, current_name, billed_name, kind,
      ROW_NUMBER() OVER (
        PARTITION BY id
        -- A cased spelling outranks a shouted or whispered one, so an all-caps
        -- name the venue mostly shouts is still fixed by a cased billing.
        ORDER BY (billed_name = upper(billed_name)
                  OR billed_name = lower(billed_name)) ASC,
                 seen_count DESC,
                 billed_name COLLATE "C" ASC
      ) AS rank
    FROM billings
  )
  SELECT id, slug, current_name, billed_name, kind
  FROM ranked
  WHERE rank = 1
    AND billed_name <> current_name
`;

export async function repairArtistNames(
  database: Database,
  options: { dryRun: boolean },
): Promise<RepairArtistNamesResult> {
  const found = await database.execute<RepairRow>(sql`
    ${CANDIDATES}
    ORDER BY current_name ASC
  `);

  const rows = [...found];
  const sample = rows.slice(0, SAMPLE_SIZE).map((row) => ({
    slug: row.slug,
    from: row.current_name,
    to: row.billed_name,
    kind: row.kind,
  }));

  const byKind = rows.reduce<Record<string, number>>((tally, row) => {
    tally[row.kind] = (tally[row.kind] ?? 0) + 1;
    return tally;
  }, {});

  if (options.dryRun || rows.length === 0) {
    return { candidates: rows.length, repaired: 0, sample, byKind };
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
  `);

  return {
    candidates: rows.length,
    repaired: [...written].length,
    sample,
    byKind,
  };
}
