import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';

// Migration 0124: the weekly digest becomes opt-in. The column default flips
// to false and every existing row is set false once, because every true in the
// table was the old default rather than a choice.
//
// The set-false statement is READ FROM THE MIGRATION FILE rather than retyped,
// so the test exercises the SQL that actually ships.

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0124_digest_opt_in.sql',
);

const setFalseStatement = async (): Promise<string> => {
  const file = await readFile(migrationPath, 'utf8');
  const statements = file.split('--> statement-breakpoint');
  expect(statements).toHaveLength(2);
  const update = statements[1] ?? '';
  expect(update).toContain('UPDATE "user_notification_preferences"');
  return update;
};

interface PrefsRow {
  user_id: string;
  weekly_digest_enabled: boolean;
  product_emails_enabled: boolean;
}

const readPrefs = async (userId: string): Promise<PrefsRow | undefined> => {
  const rows = await db.execute<PrefsRow>(sql`
    SELECT user_id, weekly_digest_enabled, product_emails_enabled
      FROM user_notification_preferences
     WHERE user_id = ${userId}
  `);
  return rows[0];
};

describe('migration 0124 — weekly digest opt-in', () => {
  beforeEach(async () => {
    await db.execute(
      sql`DELETE FROM user_notification_preferences WHERE user_id LIKE 'user_m124_%'`,
    );
  });

  it('defaults weekly_digest_enabled to false', async () => {
    const rows = await db.execute<{
      is_nullable: string;
      column_default: string | null;
    }>(sql`
      SELECT is_nullable, column_default
        FROM information_schema.columns
       WHERE table_name = 'user_notification_preferences'
         AND column_name = 'weekly_digest_enabled'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.is_nullable).toBe('NO');
    expect(rows[0]?.column_default).toBe('false');
  });

  it('starts a new preferences row opted out', async () => {
    await db.execute(sql`
      INSERT INTO user_notification_preferences (user_id)
      VALUES ('user_m124_new')
    `);
    expect((await readPrefs('user_m124_new'))?.weekly_digest_enabled).toBe(
      false,
    );
  });

  it('sets every existing row false and leaves the other preferences alone', async () => {
    await db.execute(sql`
      INSERT INTO user_notification_preferences
        (user_id, weekly_digest_enabled, product_emails_enabled)
      VALUES ('user_m124_on', true, false),
             ('user_m124_off', false, true)
    `);

    await db.execute(sql.raw(await setFalseStatement()));

    const on = await readPrefs('user_m124_on');
    expect(on?.weekly_digest_enabled).toBe(false);
    expect(on?.product_emails_enabled).toBe(false);
    const off = await readPrefs('user_m124_off');
    expect(off?.weekly_digest_enabled).toBe(false);
    expect(off?.product_emails_enabled).toBe(true);
  });
});
