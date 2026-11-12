import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { testDb as db } from './helpers/db.js';
import { clearTables } from './helpers/seed.js';

// Migration 0112: "If it runs out" (llm_budget_fallback_to_structured)
// defaults to off, and the singleton row is turned off unless the audit log
// shows an admin ever moved the field. The UPDATE is READ FROM THE MIGRATION
// FILE, so this pins the SQL that actually runs, including its JSON path into
// the settings.update audit metadata.

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/db/migrations/0112_admin_settings_llm_runout_default_off.sql',
);

const updateStatement = async (): Promise<string> => {
  const file = await readFile(migrationPath, 'utf8');
  const statements = file.split('--> statement-breakpoint');
  expect(statements).toHaveLength(2);
  const update = statements[1] ?? '';
  expect(update).toContain('UPDATE "admin_settings"');
  return update;
};

const runUpdate = async (): Promise<void> => {
  await db.execute(sql.raw(await updateStatement()));
};

const seedRow = async (fallbackToStructured: boolean): Promise<void> => {
  await db.execute(sql`
    INSERT INTO admin_settings (id, llm_budget_fallback_to_structured)
    VALUES (1, ${fallbackToStructured})
  `);
};

const readSwitch = async (): Promise<boolean | undefined> => {
  const rows = await db.execute<{ value: boolean }>(sql`
    SELECT llm_budget_fallback_to_structured AS value
      FROM admin_settings WHERE id = 1
  `);
  return rows[0]?.value;
};

// The shape apps/api/src/routes/admin/settings.ts writes on every save.
const seedSettingsAudit = async (
  before: boolean,
  after: boolean,
): Promise<void> => {
  const settings = (value: boolean) => ({
    llmMonthlyBudgetUsd: null,
    llmBudgetWarnAtPercent: 75,
    llmBudgetFallbackToStructured: value,
    approvePricesMyself: false,
  });
  const metadata = JSON.stringify({
    before: settings(before),
    after: settings(after),
  });
  await db.execute(sql`
    INSERT INTO audit_log (actor_id, action, target_id, metadata)
    VALUES ('user_m112_admin', 'settings.update', 'admin_settings', ${metadata}::jsonb)
  `);
};

describe('migration 0112: "If it runs out" defaults to off', () => {
  beforeEach(async () => {
    await clearTables();
  });

  it('sets the column default to false', async () => {
    const rows = await db.execute<{ column_default: string | null }>(sql`
      SELECT column_default
        FROM information_schema.columns
       WHERE table_name = 'admin_settings'
         AND column_name = 'llm_budget_fallback_to_structured'
    `);
    expect(rows[0]?.column_default).toBe('false');
  });

  it('turns off a row still on the old default with no audit history', async () => {
    await seedRow(true);
    await runUpdate();
    expect(await readSwitch()).toBe(false);
  });

  it('keeps on a row an admin switched off and back on', async () => {
    await seedRow(true);
    await seedSettingsAudit(true, false);
    await seedSettingsAudit(false, true);
    await runUpdate();
    expect(await readSwitch()).toBe(true);
  });

  it('ignores saves that never moved this field', async () => {
    // The one indistinguishable case: a save that sent true while it was
    // already true looks exactly like the untouched default.
    await seedRow(true);
    await seedSettingsAudit(true, true);
    await runUpdate();
    expect(await readSwitch()).toBe(false);
  });

  it('is a no-op with no row, and on a second run', async () => {
    await runUpdate();
    expect(await readSwitch()).toBeUndefined();
    await seedRow(false);
    await runUpdate();
    await runUpdate();
    expect(await readSwitch()).toBe(false);
  });
});
