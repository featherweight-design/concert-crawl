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

function isLlmBudgetWarnAtPercent(
  value: unknown,
): value is LlmBudgetWarnAtPercent {
  return LLM_BUDGET_WARN_AT_PERCENTS.some((percent) => percent === value);
}

const patchSchema = z
  .object({
    // null clears the budget.
    llmMonthlyBudgetUsd: z
      .number()
      .gt(0)
      .max(MAX_LLM_MONTHLY_BUDGET_USD)
      .nullable(),
    llmBudgetWarnAtPercent: z.number().refine(isLlmBudgetWarnAtPercent, {
      message: 'Pick 50, 75 or 90',
    }),
    llmBudgetFallbackToStructured: z.boolean(),
    approvePricesMyself: z.boolean(),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one setting',
  });

// The column's CHECK keeps it to the three choices; the guard only narrows.
const warnAtPercentOf = (
  row: AdminSettingsRow | undefined,
): LlmBudgetWarnAtPercent => {
  const stored = row?.llmBudgetWarnAtPercent;
  return isLlmBudgetWarnAtPercent(stored)
    ? stored
    : DEFAULT_LLM_BUDGET_WARN_AT_PERCENT;
};

const toSettings = (row: AdminSettingsRow | undefined): AdminSettings => ({
  llmMonthlyBudgetUsd:
    row?.llmMonthlyBudgetUsd == null ? null : Number(row.llmMonthlyBudgetUsd),
  llmBudgetWarnAtPercent: warnAtPercentOf(row),
  llmBudgetFallbackToStructured: row?.llmBudgetFallbackToStructured ?? true,
  approvePricesMyself: row?.approvePricesMyself ?? false,
  updatedAt: row?.updatedAt.toISOString() ?? null,
  updatedBy: row?.updatedBy ?? null,
});

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

    const values = {
      ...(patch.llmMonthlyBudgetUsd === undefined
        ? {}
        : {
            llmMonthlyBudgetUsd:
              patch.llmMonthlyBudgetUsd === null
                ? null
                : patch.llmMonthlyBudgetUsd.toFixed(2),
          }),
      ...(patch.llmBudgetWarnAtPercent === undefined
        ? {}
        : { llmBudgetWarnAtPercent: patch.llmBudgetWarnAtPercent }),
      ...(patch.llmBudgetFallbackToStructured === undefined
        ? {}
        : {
            llmBudgetFallbackToStructured: patch.llmBudgetFallbackToStructured,
          }),
      ...(patch.approvePricesMyself === undefined
        ? {}
        : { approvePricesMyself: patch.approvePricesMyself }),
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
      before: {
        llmMonthlyBudgetUsd: before.llmMonthlyBudgetUsd,
        llmBudgetWarnAtPercent: before.llmBudgetWarnAtPercent,
        llmBudgetFallbackToStructured: before.llmBudgetFallbackToStructured,
        approvePricesMyself: before.approvePricesMyself,
      },
      after: {
        llmMonthlyBudgetUsd: after.llmMonthlyBudgetUsd,
        llmBudgetWarnAtPercent: after.llmBudgetWarnAtPercent,
        llmBudgetFallbackToStructured: after.llmBudgetFallbackToStructured,
        approvePricesMyself: after.approvePricesMyself,
      },
    });

    return ctx.json({ success: true, data: after });
  },
);
