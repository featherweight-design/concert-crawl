import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';

// Migration 0117 (admin redesign 5d): two feedback_category values and the
// nullable resolved_by / resolved_at pair. Expand-only, so every check here is
// "added, and nothing existing changed shape".

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0117_feedback_kinds_and_resolved.sql',
);

describe('migration 0117: feedback kinds and resolved', () => {
  it('adds error_report and venue_suggestion after the original four', async () => {
    const rows = await db.execute<{ enumlabel: string }>(sql`
      SELECT enumlabel FROM pg_enum
       WHERE enumtypid = 'feedback_category'::regtype
       ORDER BY enumsortorder
    `);
    expect(rows.map((row) => row.enumlabel)).toEqual([
      'bug',
      'idea',
      'praise',
      'other',
      'error_report',
      'venue_suggestion',
    ]);
  });

  it('adds resolved_by text and resolved_at timestamptz, both nullable', async () => {
    const rows = await db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(sql`
      SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
       WHERE table_name = 'feedback'
         AND column_name IN ('resolved_by', 'resolved_at')
       ORDER BY column_name
    `);
    expect([...rows]).toEqual([
      {
        column_name: 'resolved_at',
        data_type: 'timestamp with time zone',
        is_nullable: 'YES',
      },
      { column_name: 'resolved_by', data_type: 'text', is_nullable: 'YES' },
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
