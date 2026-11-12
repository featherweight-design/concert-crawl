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
    // "Warn me at" on the LLM budget panel: a percent of the monthly budget,
    // one of 50, 75 or 90 (the board's three chips; 75 is drawn selected).
    llmBudgetWarnAtPercent: smallint('llm_budget_warn_at_percent')
      .notNull()
      .default(75),
    // "If it runs out": on means keep crawling with HTML and JSON-LD only, and
    // tell the admin. The board draws it on.
    llmBudgetFallbackToStructured: boolean('llm_budget_fallback_to_structured')
      .notNull()
      .default(true),
    // The admin's "approve every price myself" choice. Stored here and read
    // back by the settings API; the price hold that acts on it ships with 2a.
    approvePricesMyself: boolean('approve_prices_myself')
      .notNull()
      .default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text('updated_by'),
  },
  (table) => [
    check('admin_settings_single_row', sql`${table.id} = 1`),
    check(
      'admin_settings_llm_budget_warn_at_percent_check',
      sql`${table.llmBudgetWarnAtPercent} IN (50, 75, 90)`,
    ),
  ],
);

export type AdminSettingsRow = typeof adminSettings.$inferSelect;
