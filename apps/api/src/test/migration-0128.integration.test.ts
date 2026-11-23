import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';

// Migration 0128: the artist search schema expand. pg_trgm, the slim
// MusicBrainz table and its four GIN indexes, the IMMUTABLE alias wrapper the
// alias indexes are built on, and nullable mbid columns on artists (with a
// partial unique index) and user_artist_follows.
//
// Reads the migrated test database, so it fails if the shipped SQL drifts from
// what the Drizzle schema declares.

const MBID_A = '0a3b9f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';

afterEach(async () => {
  await db.execute(sql`DELETE FROM artists WHERE slug LIKE 'm128-%'`);
});

const insertArtist = (suffix: string, mbid: string | null) =>
  db.execute(sql`
    INSERT INTO artists (name, canonical_name, slug, mbid)
    VALUES (${`M128 ${suffix}`}, ${`m128 ${suffix}`}, ${`m128-${suffix}`}, ${mbid})
  `);

describe('migration 0128 — artist search schema expand', () => {
  it('installs pg_trgm', async () => {
    const rows = await db.execute<{ extname: string }>(
      sql`SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('declares the alias wrapper IMMUTABLE and joins aliases with a space', async () => {
    const volatility = await db.execute<{ provolatile: string }>(sql`
      SELECT p.provolatile
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'mb_artist_aliases_text'
    `);
    expect(volatility.map((row) => row.provolatile)).toEqual(['i']);

    const joined = await db.execute<{ text: string }>(
      sql`SELECT public.mb_artist_aliases_text(ARRAY['Prince', 'TAFKAP']) AS text`,
    );
    expect(joined[0]?.text).toBe('Prince TAFKAP');
  });

  it('builds the four mb_artists search indexes as GIN', async () => {
    const rows = await db.execute<{ indexname: string; indexdef: string }>(sql`
      SELECT indexname, indexdef
        FROM pg_indexes
       WHERE tablename = 'mb_artists' AND indexname <> 'mb_artists_pkey'
       ORDER BY indexname
    `);
    expect(rows.map((row) => row.indexname)).toEqual([
      'mb_artists_aliases_fts_idx',
      'mb_artists_aliases_trgm_idx',
      'mb_artists_name_fts_idx',
      'mb_artists_name_trgm_idx',
    ]);
    for (const row of rows) {
      expect(row.indexdef).toContain('USING gin');
    }
    const byName = new Map(rows.map((row) => [row.indexname, row.indexdef]));
    expect(byName.get('mb_artists_name_trgm_idx')).toContain('gin_trgm_ops');
    expect(byName.get('mb_artists_aliases_trgm_idx')).toContain(
      'mb_artist_aliases_text',
    );
    expect(byName.get('mb_artists_name_fts_idx')).toContain('to_tsvector');
  });

  it('adds both mbid columns as nullable uuid with no default', async () => {
    const rows = await db.execute<{
      table_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(sql`
      SELECT table_name, data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE column_name = 'mbid'
         AND table_name IN ('artists', 'user_artist_follows')
       ORDER BY table_name
    `);
    expect(rows).toEqual([
      {
        table_name: 'artists',
        data_type: 'uuid',
        is_nullable: 'YES',
        column_default: null,
      },
      {
        table_name: 'user_artist_follows',
        data_type: 'uuid',
        is_nullable: 'YES',
        column_default: null,
      },
    ]);
  });

  it('lets many artists have no mbid but only one claim each mbid', async () => {
    await insertArtist('null-a', null);
    await insertArtist('null-b', null);
    await insertArtist('claim-a', MBID_A);
    await expect(insertArtist('claim-b', MBID_A)).rejects.toThrow();
  });
});
