-- #1311: replay protection for the watch and contest notification writers.
--
-- A writer that must not duplicate sets `dedupe_key` to a natural key for the
-- one committed transition it is announcing, and inserts with
-- ON CONFLICT ("dedupe_key") DO NOTHING RETURNING. The row IS the claim, so a
-- claim can never exist without its notification or the reverse, and a replay
-- (a concurrent confirm, a retried request) inserts nothing and pushes nothing.
--
-- Nullable on purpose: admin alerts, spotify-fanout (which has its own
-- spotify_alert_log ledger) and crew rows leave it NULL, and Postgres treats
-- NULLs as distinct under a unique index, so they are unaffected.
--
-- Expand-only: a nullable column, no backfill, plus a unique index over a
-- column that is NULL on every existing row.
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "dedupe_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_key_idx" ON "notifications" ("dedupe_key");
