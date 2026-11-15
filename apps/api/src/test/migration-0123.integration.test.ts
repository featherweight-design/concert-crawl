import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';

// Migration 0123 (who set the crawl mode): venues.crawl_mode_source, 'admin'
// or 'auto', NULL when not recorded. Expand-only, so every check here is
// "added, nullable, constrained, and nothing existing changed shape".

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0123_crawl_mode_source.sql',
);

describe('migration 0123: crawl mode source', () => {
  it('adds a nullable crawl_mode_source to venues with no default', async () => {
    const rows = await db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(sql`
      SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_name = 'venues'
         AND column_name = 'crawl_mode_source'
    `);
    expect([...rows]).toEqual([
      {
        column_name: 'crawl_mode_source',
        data_type: 'text',
        is_nullable: 'YES',
        column_default: null,
      },
    ]);
  });

  it('constrains it to admin or auto', async () => {
    const rows = await db.execute<{ def: string }>(sql`
      SELECT pg_get_constraintdef(oid) AS def
        FROM pg_constraint
       WHERE conname = 'venues_crawl_mode_source_check'
    `);
    const [row] = [...rows];
    expect(row?.def).toContain("'admin'");
    expect(row?.def).toContain("'auto'");
  });

  it('is expand-only and safe to re-run', async () => {
    const file = await readFile(migrationPath, 'utf8');
    const statements = file
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim());
    expect(statements).toHaveLength(2);
    // The Down recipe lives in comments; the executable SQL drops nothing.
    const executable = file
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');
    expect(executable).not.toMatch(/\bDROP\b/i);
    expect(statements[0]).toMatch(/ADD COLUMN IF NOT EXISTS/);
    expect(statements[1]).toMatch(/EXCEPTION WHEN duplicate_object/);
    // Every statement re-runs cleanly against the already-migrated schema.
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
  });
});
