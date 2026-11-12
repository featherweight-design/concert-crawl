import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { adminSettings, db } from '@concert-crawl/db';
import type { AdminSettingsRow } from '@concert-crawl/db';
import type { AdminSettings } from '@concert-crawl/types';
import { getAuthUser } from '../../middleware/auth.js';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';

// The one row of admin-wide settings. No row means the defaults, and the
// first PATCH creates it. Every change is audited with its before and after.

export const settingsAdminRouter = new Hono<AdminVariables>();

const SETTINGS_ROW_ID = 1;
export const MAX_LLM_MONTHLY_BUDGET_USD = 1000;

const patchSchema = z
  .object({
    // null clears the budget.
    llmMonthlyBudgetUsd: z
      .number()
      .gt(0)
      .max(MAX_LLM_MONTHLY_BUDGET_USD)
      .nullable(),
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
      ...(patch.approvePricesMyself === undefined
        ? {}
        : { approvePricesMyself: patch.approvePricesMyself }),
      updatedAt,
      updatedBy: userId,
    };

    // One transaction so the audited "before" is the row this write replaced,
    // even when two admins save at once: the second waits on the row lock.
    const saved = await db.transaction(async (tx) => {
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
        approvePricesMyself: before.approvePricesMyself,
      },
      after: {
        llmMonthlyBudgetUsd: after.llmMonthlyBudgetUsd,
        approvePricesMyself: after.approvePricesMyself,
      },
    });

    return ctx.json({ success: true, data: after });
  },
);
