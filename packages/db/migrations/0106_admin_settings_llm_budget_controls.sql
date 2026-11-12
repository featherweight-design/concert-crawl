-- Admin redesign 1c: the LLM budget panel's two controls.
--
-- Expand-only: two new columns with constant defaults, so existing rows (and
-- "no row") read the values the board draws selected: warn at 75%, and keep
-- crawling with HTML and JSON-LD only when the budget runs out. Nothing reads
-- them outside the settings API yet.
--
-- Down:
--   ALTER TABLE admin_settings DROP CONSTRAINT IF EXISTS admin_settings_llm_budget_warn_at_percent_check;
--   ALTER TABLE admin_settings DROP COLUMN IF EXISTS llm_budget_warn_at_percent;
--   ALTER TABLE admin_settings DROP COLUMN IF EXISTS llm_budget_fallback_to_structured;
ALTER TABLE "admin_settings"
  ADD COLUMN IF NOT EXISTS "llm_budget_warn_at_percent" smallint DEFAULT 75 NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_settings"
  ADD COLUMN IF NOT EXISTS "llm_budget_fallback_to_structured" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_settings"
    ADD CONSTRAINT "admin_settings_llm_budget_warn_at_percent_check"
    CHECK ("llm_budget_warn_at_percent" IN (50, 75, 90));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
-- Admin redesign 1c: the Health tile's email delivery counts. Both of its
-- queries lead on created_at (a window of status counts, and the newest
-- 'sent' row), so created_at leads and status rides along. Expand-only.
-- Down: DROP INDEX IF EXISTS email_send_log_created_at_status_idx;
CREATE INDEX IF NOT EXISTS "email_send_log_created_at_status_idx"
  ON "email_send_log" ("created_at", "status");
