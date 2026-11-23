import { describe, expect, it } from 'vitest';
import {
  MbArtistsSwapRefused,
  loadMbArtists,
} from '@concert-crawl/db/scripts/load-mb-artists';
import type { MbArtistRow } from '@concert-crawl/db/scripts/mb-dump';
import { testDb } from './helpers/db.js';

const sql = testDb.$client;

const row = (
  mbid: string,
  name: string,
  aliases: string[] = [],
): MbArtistRow => ({
  mbid,
  name,
  sortName: name,
  aliases,
  type: 'Group',
  area: 'United Kingdom',
  disambiguation: null,
  spotifyId: null,
  wikidataId: null,
});

async function* rowsOf(...rows: MbArtistRow[]): AsyncGenerator<MbArtistRow> {
  yield* rows;
}

const RADIOHEAD = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
const THE_THE = 'f8c5a9b8-6f0a-4c8e-9a4e-2f1d6c3b9e10';
const OPTIONS = { minRows: 0, minShareOfCurrent: 0.9 };

const indexDefinitions = () =>
  sql<{ indexname: string; indexdef: string }[]>`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'mb_artists'
    ORDER BY indexname
  `;

const shadowExists = async () => {
  const [found] = await sql<{ exists: boolean }[]>`
    SELECT to_regclass('public.mb_artists_next') IS NOT NULL AS exists
  `;
  return found?.exists;
};

describe('load-mb-artists integration', () => {
  it('swaps in a fresh load with the migration’s key and indexes', async () => {
    // Migration 0128's definitions, read before the loader has ever replaced the table.
    const before = await indexDefinitions();
    expect(before.map((index) => index.indexname)).toEqual([
      'mb_artists_aliases_fts_idx',
      'mb_artists_aliases_trgm_idx',
      'mb_artists_name_fts_idx',
      'mb_artists_name_trgm_idx',
      'mb_artists_pkey',
    ]);

    const result = await loadMbArtists(
      sql,
      rowsOf(
        row(RADIOHEAD, 'Radiohead', ['On a Friday', 'Say "hi"']),
        row(THE_THE, 'The The'),
      ),
      OPTIONS,
    );
    expect(result.loadedRows).toBe(2);

    expect(await indexDefinitions()).toEqual(before);
    expect(await shadowExists()).toBe(false);

    const rows = await sql<
      { name: string; aliases: string[]; refreshed: boolean }[]
    >`
      SELECT name, aliases, refreshed_at IS NOT NULL AS refreshed
      FROM mb_artists ORDER BY name
    `;
    expect(rows).toEqual([
      {
        name: 'Radiohead',
        aliases: ['On a Friday', 'Say "hi"'],
        refreshed: true,
      },
      { name: 'The The', aliases: [], refreshed: true },
    ]);

    // The alias trigram index is usable through the shared function.
    const [hit] = await sql<{ name: string }[]>`
      SELECT name FROM mb_artists
      WHERE public.mb_artist_aliases_text(aliases) % 'On a Friday'
    `;
    expect(hit?.name).toBe('Radiohead');

    // A second load replaces the rows rather than adding to them.
    await loadMbArtists(
      sql,
      rowsOf(row(RADIOHEAD, 'Radiohead'), row(THE_THE, 'The The')),
      OPTIONS,
    );
    const [count] = await sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM mb_artists`;
    expect(count?.count).toBe(2);
  });

  it('refuses a load that shrinks the table too far, keeping the old rows and no shadow', async () => {
    await loadMbArtists(
      sql,
      rowsOf(row(RADIOHEAD, 'Radiohead'), row(THE_THE, 'The The')),
      OPTIONS,
    );

    await expect(
      loadMbArtists(sql, rowsOf(row(RADIOHEAD, 'Radiohead')), OPTIONS),
    ).rejects.toBeInstanceOf(MbArtistsSwapRefused);

    const [count] = await sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM mb_artists`;
    expect(count?.count).toBe(2);
    expect(await shadowExists()).toBe(false);
  });

  it('refuses a load under the row floor', async () => {
    await expect(
      loadMbArtists(sql, rowsOf(row(RADIOHEAD, 'Radiohead')), {
        minRows: 5,
        minShareOfCurrent: 0,
      }),
    ).rejects.toThrow(/the floor is 5/);
    expect(await shadowExists()).toBe(false);
  });

  it('keeps the old table serving when the row stream fails mid-copy', async () => {
    await loadMbArtists(
      sql,
      rowsOf(row(RADIOHEAD, 'Radiohead'), row(THE_THE, 'The The')),
      OPTIONS,
    );

    async function* failing(): AsyncGenerator<MbArtistRow> {
      yield row(RADIOHEAD, 'Radiohead');
      throw new Error('dump truncated');
    }
    await expect(loadMbArtists(sql, failing(), OPTIONS)).rejects.toThrow(
      'dump truncated',
    );

    const [count] = await sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM mb_artists`;
    expect(count?.count).toBe(2);
    expect(await shadowExists()).toBe(false);
  });

  it('drops the shadow and keeps the old table when the swap cannot get its lock', async () => {
    await loadMbArtists(
      sql,
      rowsOf(row(RADIOHEAD, 'Radiohead'), row(THE_THE, 'The The')),
      OPTIONS,
    );

    // A reader holding mb_artists blocks the swap's DROP past its lock_timeout.
    const reader = await sql.reserve();
    try {
      await reader`BEGIN`;
      await reader`LOCK TABLE mb_artists IN ACCESS SHARE MODE`;
      await expect(
        loadMbArtists(
          sql,
          rowsOf(row(RADIOHEAD, 'Radiohead'), row(THE_THE, 'The The')),
          OPTIONS,
        ),
      ).rejects.toThrow(/lock timeout/);
    } finally {
      await reader`ROLLBACK`;
      reader.release();
    }

    const [count] = await sql<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM mb_artists`;
    expect(count?.count).toBe(2);
    expect(await shadowExists()).toBe(false);
  }, 30_000);
});
