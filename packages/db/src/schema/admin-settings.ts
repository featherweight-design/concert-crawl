import {
  boolean,
  check,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// The one row of admin-wide settings (id is always 1). No row means every
// setting is at its default: the API reads and upserts through id = 1.
export const adminSettings = pgTable(
  'admin_settings',
  {
    id: smallint('id').primaryKey().default(1),
    // Monthly LLM budget in USD; NULL means no budget is set.
    llmMonthlyBudgetUsd: numeric('llm_monthly_budget_usd', {
      precision: 8,
      scale: 2,
    }),
    // When true, community prices wait for an admin instead of promoting on
    // corroboration.
    approvePricesMyself: boolean('approve_prices_myself')
      .notNull()
      .default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text('updated_by'),
  },
  (table) => [check('admin_settings_single_row', sql`${table.id} = 1`)],
);

export type AdminSettingsRow = typeof adminSettings.$inferSelect;
