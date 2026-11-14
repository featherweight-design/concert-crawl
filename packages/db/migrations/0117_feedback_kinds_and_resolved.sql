-- Admin redesign 5d: two new feedback kinds, and who moved an item to Done.
--
-- Expand-only. Two enum values nothing writes yet (the fan modal that sends
-- them ships in Phase 6), and two nullable columns NULL on every existing row.
-- An item already in Done before this keeps resolved_by and resolved_at NULL,
-- which the admin screen reads as "done, by whom not recorded".
--
-- resolved_by is a Clerk user id, as text with no foreign key, the same shape
-- as venues.hidden_by and venues.crawl_paused_by: identity lives in Clerk and
-- there is no users table to reference. It is declared in USER_DATA_REGISTRY.
--
-- ALTER TYPE ... ADD VALUE runs inside drizzle's migration transaction (fine on
-- Postgres 12+), but a value added there cannot be USED until that transaction
-- commits, so nothing in this file, or in any migration applied in the same
-- run, may reference 'error_report' or 'venue_suggestion'. IF NOT EXISTS makes
-- a retried run safe.
--
-- Down (the enum values cannot be dropped without recreating the type; they
-- are harmless left in place):
--   ALTER TABLE feedback DROP COLUMN IF EXISTS resolved_at,
--     DROP COLUMN IF EXISTS resolved_by;
ALTER TYPE feedback_category ADD VALUE IF NOT EXISTS 'error_report';
--> statement-breakpoint
ALTER TYPE feedback_category ADD VALUE IF NOT EXISTS 'venue_suggestion';
--> statement-breakpoint
ALTER TABLE "feedback"
  ADD COLUMN IF NOT EXISTS "resolved_by" text,
  ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
