/**
 * Replaces `mb_artists` with a fresh load, through a shadow table (artist
 * search plan, PR 2: docs/superpowers/plans/2026-11-22-artist-search-musicbrainz.md).
 *
 * 1. Drop any `mb_artists_next` a failed earlier run left behind, then create
 *    it with `mb_artists`' columns, defaults and NOT NULLs.
 * 2. COPY every row into it. The table has no indexes yet, so the load is one
 *    sequential write.
 * 3. Refuse the swap when the new load is too small to be a whole dump,
 *    before paying for the index build.
 * 4. Add the primary key and build the four search indexes on the loaded rows,
 *    under `_next` names. The definitions are migration 0128's, byte for byte
 *    once the names change; the integration test pins that.
 * 5. In one transaction: drop the old table, rename the shadow into place, and
 *    rename its key and indexes to the canonical names.
 *
 * Until step 5 commits, readers see the old table untouched, so a run that
 * fails anywhere before it leaves last week's copy serving. Nothing references
 * `mb_artists` by foreign key or view, so the drop in step 5 takes nothing
 * else with it. The new table is owned by the loading role, which is the same
 * owner role the migrations use on Neon (checked on staging, 2026-11-22).
 */

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Sql } from 'postgres';
import {
  MB_ARTIST_COPY_COLUMNS,
  toCopyLine,
  type MbArtistRow,
} from './mb-dump.js';

export const MB_ARTISTS_TABLE = 'mb_artists';
export const MB_ARTISTS_SHADOW = 'mb_artists_next';

/** The canonical index names (migration 0128), without the table prefix. */
const INDEX_SUFFIXES = [
  'name_trgm_idx',
  'aliases_trgm_idx',
  'name_fts_idx',
  'aliases_fts_idx',
] as const;

export type LoadMbArtistsOptions = {
  /** Refuse the swap below this many rows. The weekly job passes 1,000,000. */
  minRows: number;
  /**
   * Refuse the swap when the new load holds less than this share of the rows
   * already serving (0.9 = a 10% drop). MusicBrainz grows week on week, so a
   * big drop means a truncated or wrong dump, not a real change.
   */
  minShareOfCurrent: number;
};

export type LoadMbArtistsResult = {
  previousRows: number;
  loadedRows: number;
  copyMs: number;
  indexMs: number;
  swapMs: number;
};

export class MbArtistsSwapRefused extends Error {
  constructor(detail: string) {
    super(`mb_artists swap refused, the old table is still serving: ${detail}`);
    this.name = 'MbArtistsSwapRefused';
  }
}

async function* copyLines(
  rows: AsyncIterable<MbArtistRow>,
): AsyncGenerator<string> {
  for await (const row of rows) yield toCopyLine(row);
}

/**
 * Loads `rows` into the shadow table and swaps it in. `sql` must be a client
 * that can hold one connection for a long COPY and index build (the runner
 * opens one with no lifetime cap).
 */
export async function loadMbArtists(
  sql: Sql,
  rows: AsyncIterable<MbArtistRow>,
  { minRows, minShareOfCurrent }: LoadMbArtistsOptions,
): Promise<LoadMbArtistsResult> {
  const shadow = sql(MB_ARTISTS_SHADOW);

  await sql`DROP TABLE IF EXISTS ${shadow}`;
  await sql`CREATE TABLE ${shadow} (LIKE ${sql(MB_ARTISTS_TABLE)} INCLUDING DEFAULTS)`;

  // Any failure before the swap drops the shadow, so a failed run leaves
  // nothing behind but the table that was already serving.
  let copyMs: number, indexMs: number, loadedRows: number, previousRows: number;
  try {
    const copyStarted = Date.now();
    const writable = await sql`
      COPY ${shadow} (${sql([...MB_ARTIST_COPY_COLUMNS])}) FROM STDIN
    `.writable();
    await pipeline(Readable.from(copyLines(rows)), writable);
    copyMs = Date.now() - copyStarted;

    // Refuse a short load before paying for the index build.
    const [loaded] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM ${shadow}
    `;
    const [current] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM ${sql(MB_ARTISTS_TABLE)}
    `;
    loadedRows = loaded?.count ?? 0;
    previousRows = current?.count ?? 0;

    if (loadedRows < minRows) {
      throw new MbArtistsSwapRefused(
        `loaded ${loadedRows} rows, the floor is ${minRows}`,
      );
    }
    if (loadedRows < previousRows * minShareOfCurrent) {
      throw new MbArtistsSwapRefused(
        `loaded ${loadedRows} rows against ${previousRows} serving, below the ${minShareOfCurrent} share`,
      );
    }

    const indexStarted = Date.now();
    await sql`
      ALTER TABLE ${shadow}
      ADD CONSTRAINT ${sql(`${MB_ARTISTS_SHADOW}_pkey`)} PRIMARY KEY ("mbid")
    `;
    // Migration 0128's four definitions, with only the names changed.
    const index = (suffix: (typeof INDEX_SUFFIXES)[number]) =>
      sql(`${MB_ARTISTS_SHADOW}_${suffix}`);
    await sql`CREATE INDEX ${index('name_trgm_idx')} ON ${shadow} USING gin ("name" gin_trgm_ops)`;
    await sql`
      CREATE INDEX ${index('aliases_trgm_idx')} ON ${shadow}
      USING gin ("public"."mb_artist_aliases_text"("aliases") gin_trgm_ops)
    `;
    await sql`
      CREATE INDEX ${index('name_fts_idx')} ON ${shadow}
      USING gin (to_tsvector('simple', "name"))
    `;
    await sql`
      CREATE INDEX ${index('aliases_fts_idx')} ON ${shadow}
      USING gin (to_tsvector('simple', "public"."mb_artist_aliases_text"("aliases")))
    `;
    indexMs = Date.now() - indexStarted;
  } catch (err) {
    await sql`DROP TABLE IF EXISTS ${shadow}`.catch(() => undefined);
    throw err;
  }

  const swapStarted = Date.now();
  // A failed swap rolls back with the old table intact; drop the shadow so a
  // multi-GB copy does not sit on disk until next week's run.
  await sql
    .begin(async (tx) => {
      // DROP waits for every reader of the old table, and every later reader
      // queues behind the DROP. Give up rather than stall search: the run fails,
      // the old table keeps serving, and next week's run retries.
      await tx`SET LOCAL lock_timeout = '10s'`;
      await tx`DROP TABLE ${tx(MB_ARTISTS_TABLE)}`;
      await tx`ALTER TABLE ${tx(MB_ARTISTS_SHADOW)} RENAME TO ${tx(MB_ARTISTS_TABLE)}`;
      await tx`
      ALTER TABLE ${tx(MB_ARTISTS_TABLE)}
      RENAME CONSTRAINT ${tx(`${MB_ARTISTS_SHADOW}_pkey`)} TO ${tx(`${MB_ARTISTS_TABLE}_pkey`)}
    `;
      for (const suffix of INDEX_SUFFIXES) {
        await tx`
        ALTER INDEX ${tx(`${MB_ARTISTS_SHADOW}_${suffix}`)}
        RENAME TO ${tx(`${MB_ARTISTS_TABLE}_${suffix}`)}
      `;
      }
    })
    .catch(async (err: unknown) => {
      await sql`DROP TABLE IF EXISTS ${shadow}`.catch(() => undefined);
      throw err;
    });
  const swapMs = Date.now() - swapStarted;

  return { previousRows, loadedRows, copyMs, indexMs, swapMs };
}

export type MbArtistsSize = {
  tableBytes: number;
  indexBytes: number;
  totalBytes: number;
};

/** The plan's storage measurement: heap plus TOAST, and all indexes. */
export async function measureMbArtists(sql: Sql): Promise<MbArtistsSize> {
  const [size] = await sql<MbArtistsSize[]>`
    SELECT
      pg_table_size(${MB_ARTISTS_TABLE}::regclass)::bigint::float8 AS "tableBytes",
      pg_indexes_size(${MB_ARTISTS_TABLE}::regclass)::bigint::float8 AS "indexBytes",
      pg_total_relation_size(${MB_ARTISTS_TABLE}::regclass)::bigint::float8 AS "totalBytes"
  `;
  return size ?? { tableBytes: 0, indexBytes: 0, totalBytes: 0 };
}
