import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { adminSettings, db } from '@concert-crawl/db';
import type { AdminSettingsRow } from '@concert-crawl/db';
import {
  LLM_BUDGET_WARN_AT_PERCENTS,
  type AdminSettings,
  type LlmBudgetWarnAtPercent,
} from '@concert-crawl/types';
import { getAuthUser } from '../../middleware/auth.js';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';

// The one row of admin-wide settings. No row means the defaults, and the
// first PATCH creates it. Every change is audited with its before and after.

export const settingsAdminRouter = new Hono<AdminVariables>();

const SETTINGS_ROW_ID = 1;
export const MAX_LLM_MONTHLY_BUDGET_USD = 1000;
// The board draws 75% selected; the column defaults to it too.
const DEFAULT_LLM_BUDGET_WARN_AT_PERCENT: LlmBudgetWarnAtPercent = 75;

const patchSchema = z
  .object({
    // null clears the budget.
    llmMonthlyBudgetUsd: z
      .number()
      .gt(0)
      .max(MAX_LLM_MONTHLY_BUDGET_USD)
      .nullable(),
    llmBudgetWarnAtPercent: z.literal(LLM_BUDGET_WARN_AT_PERCENTS, {
      error: 'Pick 50, 75 or 90',
    }),
    llmBudgetFallbackToStructured: z.boolean(),
    approvePricesMyself: z.boolean(),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one setting',
  });

const toSettings = (row: AdminSettingsRow | undefined): AdminSettings => ({
  llmMonthlyBudgetUsd:
    row?.llmMonthlyBudgetUsd == null ? null : Number(row.llmMonthlyBudgetUsd),
  // The column's CHECK holds it to the three choices, and its Drizzle type
  // says so; the default is only for "no row yet".
  llmBudgetWarnAtPercent:
    row?.llmBudgetWarnAtPercent ?? DEFAULT_LLM_BUDGET_WARN_AT_PERCENT,
  llmBudgetFallbackToStructured: row?.llmBudgetFallbackToStructured ?? true,
  approvePricesMyself: row?.approvePricesMyself ?? false,
  updatedAt: row?.updatedAt.toISOString() ?? null,
  updatedBy: row?.updatedBy ?? null,
});

// What the settings.update audit row records: every setting toSettings
// returns, minus the row's own bookkeeping. Built by subtraction, so a new
// setting joins the audit without anyone remembering to add it.
type AuditedSettings = Omit<AdminSettings, 'updatedAt' | 'updatedBy'>;
const toAuditedSettings = ({
  updatedAt: _updatedAt,
  updatedBy: _updatedBy,
  ...settings
}: AdminSettings): AuditedSettings => settings;

const readRow = async (): Promise<AdminSettingsRow | undefined> => {
  const [row] = await db.select().from(adminSettings).limit(1);
  return row;
};

settingsAdminRouter.get('/', async (ctx) => {
  return ctx.json({ success: true, data: toSettings(await readRow()) });
});

settingsAdminRouter.patch(
  '/',
  zValidator('json', patchSchema, validationHook),
  async (ctx) => {
    const patch = ctx.req.valid('json');
    const { userId } = getAuthUser(ctx);
    const updatedAt = new Date();

    // The parsed patch carries only the keys that were sent, so it spreads
    // straight in; only the budget needs reshaping, into the numeric column's
    // string.
    const { llmMonthlyBudgetUsd, ...sentSettings } = patch;
    const values = {
      ...sentSettings,
      ...(llmMonthlyBudgetUsd === undefined
        ? {}
        : {
            llmMonthlyBudgetUsd:
              llmMonthlyBudgetUsd === null
                ? null
                : llmMonthlyBudgetUsd.toFixed(2),
          }),
      updatedAt,
      updatedBy: userId,
    };

    // One transaction so the audited "before" is the row this write replaced,
    // even when two admins save at once: the second waits on the row lock.
    const saved = await db.transaction(async (tx) => {
      // Make sure row 1 exists so the lock below has something to hold, even
      // for the very first save.
      await tx
        .insert(adminSettings)
        .values({ id: SETTINGS_ROW_ID, updatedAt: new Date(0) })
        .onConflictDoNothing();
      const [previous] = await tx
        .select()
        .from(adminSettings)
        .for('update')
        .limit(1);
      const [next] = await tx
        .insert(adminSettings)
        .values({ id: SETTINGS_ROW_ID, ...values })
        .onConflictDoUpdate({ target: adminSettings.id, set: values })
        .returning();
      return { before: toSettings(previous), row: next };
    });
    const { before, row } = saved;
    if (!row) {
      return ctx.json({ success: false, error: 'Failed to save' }, 500);
    }

    const after = toSettings(row);
    ctx.set('auditAction', 'settings.update');
    ctx.set('auditTargetId', 'admin_settings');
    ctx.set('auditActorId', userId);
    ctx.set('auditMeta', {
      before: toAuditedSettings(before),
      after: toAuditedSettings(after),
    });

    return ctx.json({ success: true, data: after });
  },
);
