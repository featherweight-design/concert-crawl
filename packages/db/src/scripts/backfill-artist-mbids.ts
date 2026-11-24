/**
 * Fills `artists.mbid` from the slim MusicBrainz copy (`mb_artists`), PR 3 of
 * docs/superpowers/plans/2026-11-22-artist-search-musicbrainz.md.
 *
 * Two buckets, tried in this order, and only on rows whose `mbid` is still null:
 *
 *   1. **Spotify.** A Spotify-matched artist (`match_status = 'matched'`, the
 *      only status whose Spotify id is trusted) takes the MBID of the one
 *      MusicBrainz act whose Spotify relation is our `spotify_artist_id`. When
 *      several MB acts carry that Spotify id, the row stays null.
 *   2. **Name.** An artist with no Spotify id takes the MBID of the one MB act
 *      whose name or one of whose aliases folds to the same string as our
 *      display name (`foldedArtistName`: case, accents and whitespace). Two or
 *      more MB acts with that name leave the row null. The one act must also
 *      pass the area rule (`name-match-area.ts`: US, Colorado or blank), or the
 *      row stays null as `name:out-of-area`.
 *
 * A Spotify-matched artist never reaches the name bucket. Plan decision 7
 * accepts an MB answer for such a row only when its Spotify relation agrees
 * with ours, and the Spotify bucket already covers every row where it does.
 * Rows a human ruled `not_an_artist` are skipped: there is no act to identify.
 *
 * `artists_mbid_idx` lets one MBID belong to one row. An MBID another row
 * already holds, or one two rows would claim in the same run, is left unfilled
 * on every row that wanted it. A Spotify claim beats a name claim: a name row
 * never takes an MBID a Spotify row matched, even one the Spotify row lost.
 *
 * Everything is decided and written in one statement, so a dry run reports
 * exactly what an apply would write, and an apply can never half-finish. It is
 * safe to re-run: filled rows are not reconsidered and nothing is ever cleared.
 */

import { sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { foldedArtistName } from './artist-name-fold.js';
import { nameMatchAreaSql } from './name-match-area.js';

export const MBID_OUTCOMES = [
  'spotify:filled',
  'spotify:several-acts',
  'spotify:no-hit',
  'spotify:act-taken',
  'name:filled',
  'name:several-acts',
  'name:no-hit',
  'name:out-of-area',
  'name:act-taken',
] as const;

export type MbidOutcome = (typeof MBID_OUTCOMES)[number];

export interface MbidFill {
  name: string;
  mbid: string;
  mbName: string;
  area: string | null;
  disambiguation: string | null;
}

export interface BackfillArtistMbidsResult {
  dryRun: boolean;
  /** Rows considered, by outcome. Every outcome is present, zero or not. */
  outcomes: Record<MbidOutcome, number>;
  /**
   * Rows written. Zero on a dry run. Can be below the `filled` outcomes when a
   * row changed while the run was deciding, and so was not written.
   */
  updated: number;
  /** Name-bucket fills, name-ordered, so a dry run can be read before an apply. */
  nameFills: MbidFill[];
}

interface DecidedRow extends Record<string, unknown> {
  outcome: string;
  name: string;
  mbid: string | null;
  mb_name: string | null;
  area: string | null;
  disambiguation: string | null;
  updated: number;
}

const isOutcome = (value: string): value is MbidOutcome =>
  (MBID_OUTCOMES as readonly string[]).includes(value);

export async function backfillArtistMbids(
  database: Database,
  options: { dryRun: boolean },
): Promise<BackfillArtistMbidsResult> {
  const apply = !options.dryRun;

  const rows = await database.execute<DecidedRow>(sql`
    WITH held AS (
      SELECT mbid FROM artists WHERE mbid IS NOT NULL
    ),
    spotify_acts AS (
      SELECT spotify_id, count(*) AS acts, min(mbid::text)::uuid AS mbid
      FROM mb_artists
      WHERE spotify_id IS NOT NULL
      GROUP BY spotify_id
    ),
    by_spotify AS (
      SELECT
        artists.id,
        artists.spotify_artist_id AS spotify_id,
        CASE
          WHEN spotify_acts.acts IS NULL THEN 'spotify:no-hit'
          WHEN spotify_acts.acts > 1 THEN 'spotify:several-acts'
          ELSE 'spotify:hit'
        END AS outcome,
        CASE WHEN spotify_acts.acts = 1 THEN spotify_acts.mbid END AS mbid
      FROM artists
      LEFT JOIN spotify_acts ON spotify_acts.spotify_id = artists.spotify_artist_id
      WHERE artists.mbid IS NULL
        AND artists.spotify_artist_id IS NOT NULL
        AND artists.match_status = 'matched'
    ),
    spotify_claims AS (
      SELECT mbid, count(*) AS claims
      FROM by_spotify WHERE outcome = 'spotify:hit'
      GROUP BY mbid
    ),
    spotify_decided AS (
      SELECT
        by_spotify.id,
        by_spotify.spotify_id,
        by_spotify.mbid,
        CASE
          WHEN by_spotify.outcome <> 'spotify:hit' THEN by_spotify.outcome
          WHEN by_spotify.mbid IN (SELECT mbid FROM held)
            OR spotify_claims.claims > 1 THEN 'spotify:act-taken'
          ELSE 'spotify:filled'
        END AS outcome
      FROM by_spotify
      LEFT JOIN spotify_claims ON spotify_claims.mbid = by_spotify.mbid
    ),
    pool AS (
      SELECT artists.id, ${foldedArtistName('artists.name')} AS folded
      FROM artists
      WHERE artists.mbid IS NULL
        AND artists.spotify_artist_id IS NULL
        AND artists.match_status <> 'not_an_artist'
    ),
    mb_names AS (
      SELECT mb.mbid, mb.area, ${foldedArtistName('mb.name')} AS folded
      FROM mb_artists AS mb
      UNION
      SELECT mb.mbid, mb.area, ${foldedArtistName('alias.value')} AS folded
      FROM mb_artists AS mb, unnest(mb.aliases) AS alias(value)
    ),
    name_hits AS (
      SELECT
        pool.id,
        count(DISTINCT mb_names.mbid) AS acts,
        min(mb_names.mbid::text)::uuid AS mbid,
        -- Read only when acts = 1, so it is that one act's area. Every other
        -- act that shares the name still counts toward several-acts above.
        coalesce(bool_or(${nameMatchAreaSql('mb_names.area')}), false) AS in_area
      FROM pool
      LEFT JOIN mb_names ON mb_names.folded = pool.folded AND pool.folded <> ''
      GROUP BY pool.id
    ),
    name_claims AS (
      SELECT mbid, count(*) AS claims
      FROM name_hits WHERE acts = 1 AND in_area
      GROUP BY mbid
    ),
    name_decided AS (
      SELECT
        name_hits.id,
        CASE WHEN name_hits.acts = 1 AND name_hits.in_area THEN name_hits.mbid END AS mbid,
        CASE
          WHEN name_hits.acts = 0 THEN 'name:no-hit'
          WHEN name_hits.acts > 1 THEN 'name:several-acts'
          WHEN NOT name_hits.in_area THEN 'name:out-of-area'
          WHEN name_hits.mbid IN (SELECT mbid FROM held)
            OR name_hits.mbid IN (
              SELECT mbid FROM by_spotify WHERE outcome = 'spotify:hit'
            )
            OR name_claims.claims > 1 THEN 'name:act-taken'
          ELSE 'name:filled'
        END AS outcome
      FROM name_hits
      LEFT JOIN name_claims ON name_claims.mbid = name_hits.mbid
    ),
    decided AS (
      SELECT id, spotify_id, mbid, outcome FROM spotify_decided
      UNION ALL
      SELECT id, NULL::text, mbid, outcome FROM name_decided
    ),
    filled AS (
      UPDATE artists
      SET mbid = decided.mbid, updated_at = now()
      FROM decided
      WHERE ${apply}::boolean
        AND decided.id = artists.id
        AND decided.outcome IN ('spotify:filled', 'name:filled')
        -- Re-checked on the row as it is now: the decision reads a snapshot
        -- minutes old, and the matcher or an admin may have moved the row.
        AND artists.mbid IS NULL
        AND artists.spotify_artist_id IS NOT DISTINCT FROM decided.spotify_id
        AND (
          artists.match_status = 'matched'
          OR (decided.spotify_id IS NULL AND artists.match_status <> 'not_an_artist')
        )
      RETURNING artists.id
    )
    SELECT
      decided.outcome,
      artists.name,
      decided.mbid::text AS mbid,
      mb.name AS mb_name,
      mb.area,
      mb.disambiguation,
      (SELECT count(*) FROM filled)::int AS updated
    FROM decided
    JOIN artists ON artists.id = decided.id
    LEFT JOIN mb_artists AS mb ON mb.mbid = decided.mbid
    ORDER BY artists.name ASC
  `);

  const outcomes: Record<MbidOutcome, number> = {
    'spotify:filled': 0,
    'spotify:several-acts': 0,
    'spotify:no-hit': 0,
    'spotify:act-taken': 0,
    'name:filled': 0,
    'name:several-acts': 0,
    'name:no-hit': 0,
    'name:out-of-area': 0,
    'name:act-taken': 0,
  };
  const nameFills: MbidFill[] = [];
  // The scalar subquery repeats the same count on every row.
  const updated = Number(rows[0]?.updated ?? 0);

  for (const row of rows) {
    if (!isOutcome(row.outcome)) {
      throw new Error(`[mbid-backfill] unexpected outcome "${row.outcome}"`);
    }
    outcomes[row.outcome] += 1;
    if (row.outcome === 'name:filled' && row.mbid && row.mb_name) {
      nameFills.push({
        name: row.name,
        mbid: row.mbid,
        mbName: row.mb_name,
        area: row.area,
        disambiguation: row.disambiguation,
      });
    }
  }

  return { dryRun: options.dryRun, outcomes, updated, nameFills };
}
