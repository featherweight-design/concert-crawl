import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';

// Migration 0119 (test re-crawl on a paused venue): crawl_triggers.trial and
// crawl_runs.trial. Expand-only, so every check here is "added, and nothing
// existing changed shape".

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0119_crawl_trial.sql',
);

describe('migration 0119: crawl trial', () => {
  it('adds trial boolean NOT NULL DEFAULT false to crawl_triggers and crawl_runs', async () => {
    const rows = await db.execute<{
      table_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(sql`
      SELECT table_name, data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE column_name = 'trial'
         AND table_name IN ('crawl_triggers', 'crawl_runs')
       ORDER BY table_name
    `);
    expect([...rows]).toEqual([
      {
        table_name: 'crawl_runs',
        data_type: 'boolean',
        is_nullable: 'NO',
        column_default: 'false',
      },
      {
        table_name: 'crawl_triggers',
        data_type: 'boolean',
        is_nullable: 'NO',
        column_default: 'false',
      },
    ]);
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
    for (const statement of statements) {
      expect(statement).toMatch(/IF NOT EXISTS/);
    }
    // Every statement re-runs cleanly against the already-migrated schema.
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
  });
});
