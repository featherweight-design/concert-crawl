import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';
import { clearTables, seedVenue } from './helpers/seed.js';

// Migration 0116 (admin redesign 3c): venue drafts, Ask the venue, the hero
// setting, the glyph, and test crawls. Expand-only. The went_live_at backfill
// is READ FROM THE MIGRATION FILE, so this pins the SQL that actually runs.

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0116_venue_drafts_and_test_crawls.sql',
);

const backfillStatement = async (): Promise<string> => {
  const file = await readFile(migrationPath, 'utf8');
  const statements = file.split('--> statement-breakpoint');
  expect(statements).toHaveLength(5);
  const update = statements[4] ?? '';
  expect(update).toContain('UPDATE "venues"');
  return update;
};

const runBackfill = async (): Promise<void> => {
  await db.execute(sql.raw(await backfillStatement()));
};

type ColumnInfo = {
  column_name: string;
  is_nullable: string;
  column_default: string | null;
  udt_name: string;
};

const columnsOf = async (
  table: string,
  names: string[],
): Promise<Map<string, ColumnInfo>> => {
  const rows = await db.execute<ColumnInfo>(sql`
    SELECT column_name, is_nullable, column_default, udt_name
      FROM information_schema.columns
     WHERE table_name = ${table}
       AND column_name IN (${sql.join(
         names.map((name) => sql`${name}`),
         sql`, `,
       )})
  `);
  return new Map(rows.map((row) => [row.column_name, row]));
};

const enumValues = async (typeName: string): Promise<string[]> => {
  const rows = await db.execute<{ value: string }>(sql`
    SELECT e.enumlabel AS value
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = ${typeName}
     ORDER BY e.enumsortorder
  `);
  return rows.map((row) => row.value);
};

const wentLiveAt = async (venueId: string): Promise<Date | null> => {
  const rows = await db.execute<{ went_live_at: Date | string | null }>(sql`
    SELECT went_live_at FROM venues WHERE id = ${venueId}
  `);
  const value = rows[0]?.went_live_at ?? null;
  return value === null ? null : new Date(value);
};

describe('migration 0116: venue drafts and test crawls', () => {
  beforeEach(async () => {
    await clearTables();
  });

  it('adds four nullable venue columns', async () => {
    const columns = await columnsOf('venues', [
      'went_live_at',
      'permission_asked_at',
      'hero_setting',
      'glyph_svg',
    ]);
    expect(columns.get('went_live_at')?.udt_name).toBe('timestamptz');
    expect(columns.get('permission_asked_at')?.udt_name).toBe('timestamptz');
    expect(columns.get('hero_setting')?.udt_name).toBe('hero_setting');
    expect(columns.get('glyph_svg')?.udt_name).toBe('text');
    for (const column of columns.values()) {
      expect(column.is_nullable).toBe('YES');
      expect(column.column_default).toBeNull();
    }
    expect(columns.size).toBe(4);
  });

  it('creates the hero_setting enum with the six drawn settings', async () => {
    expect(await enumValues('hero_setting')).toEqual([
      'street',
      'outdoor',
      'arena',
      'theater',
      'club',
      'gallery',
    ]);
  });

  it("adds crawl_triggers.mode, NOT NULL and defaulting to 'crawl'", async () => {
    const columns = await columnsOf('crawl_triggers', ['mode']);
    const mode = columns.get('mode');
    expect(mode?.udt_name).toBe('crawl_trigger_mode');
    expect(mode?.is_nullable).toBe('NO');
    expect(mode?.column_default).toBe("'crawl'::crawl_trigger_mode");
    expect(await enumValues('crawl_trigger_mode')).toEqual(['crawl', 'test']);
  });

  it("gives a trigger inserted without a mode 'crawl'", async () => {
    const venue = await seedVenue();
    const rows = await db.execute<{ mode: string }>(sql`
      INSERT INTO crawl_triggers (venue_id) VALUES (${venue.id})
      RETURNING mode
    `);
    expect(rows[0]?.mode).toBe('crawl');
  });

  it('backfills went_live_at to created_at and leaves a set value alone', async () => {
    const createdAt = new Date('2026-01-02T03:04:05Z');
    const liveAt = new Date('2026-05-06T07:08:09Z');
    const draft = await seedVenue({ slug: 'm116-draft', createdAt });
    const live = await seedVenue({
      slug: 'm116-live',
      createdAt,
      wentLiveAt: liveAt,
    });
    expect(await wentLiveAt(draft.id)).toBeNull();

    await runBackfill();
    expect(await wentLiveAt(draft.id)).toEqual(createdAt);
    expect(await wentLiveAt(live.id)).toEqual(liveAt);

    // A second run changes nothing.
    await runBackfill();
    expect(await wentLiveAt(draft.id)).toEqual(createdAt);
  });
});
