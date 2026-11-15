import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';

// Migration 0120 (triggered re-crawl page progress): crawl_triggers.pages_done,
// pages_total and progress_at. Expand-only, so every check here is "added,
// nullable, and nothing existing changed shape".

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0120_crawl_trigger_progress.sql',
);

describe('migration 0120: crawl trigger progress', () => {
  it('adds nullable pages_done, pages_total and progress_at to crawl_triggers', async () => {
    const rows = await db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(sql`
      SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_name = 'crawl_triggers'
         AND column_name IN ('pages_done', 'pages_total', 'progress_at')
       ORDER BY column_name
    `);
    expect([...rows]).toEqual([
      {
        column_name: 'pages_done',
        data_type: 'integer',
        is_nullable: 'YES',
        column_default: null,
      },
      {
        column_name: 'pages_total',
        data_type: 'integer',
        is_nullable: 'YES',
        column_default: null,
      },
      {
        column_name: 'progress_at',
        data_type: 'timestamp with time zone',
        is_nullable: 'YES',
        column_default: null,
      },
    ]);
  });

  it('is expand-only and safe to re-run', async () => {
    const file = await readFile(migrationPath, 'utf8');
    const statements = file
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim());
    expect(statements).toHaveLength(3);
    // The Down recipe lives in comments; the executable SQL drops nothing.
    const executable = file
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');
    expect(executable).not.toMatch(/\bDROP\b/i);
    for (const statement of statements) {
      expect(statement).toMatch(/IF NOT EXISTS/);
    }
    // Every statement re-runs cleanly against the already-migrated schema.
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
  });
});
