-- Admin redesign 1b: the single row of admin-wide settings.
--
-- Expand-only: a new table. No row means defaults (no budget, the toggle off);
-- the API upserts id = 1 on the first PATCH.
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
  "llm_monthly_budget_usd" numeric(8, 2),
  "approve_prices_myself" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text,
  CONSTRAINT "admin_settings_single_row" CHECK ("id" = 1)
);
