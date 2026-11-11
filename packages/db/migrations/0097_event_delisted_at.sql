-- B+ A5: No longer listed. The stale sweep marks the shows it cancels.
-- Plan: docs/superpowers/plans/2026-11-11-bplus-a5-no-longer-listed.md
--
-- Expand-only. A nullable marker beside status = 'cancelled': set means the
-- sweep removed the show because the venue stopped listing it, not because
-- anyone confirmed it is off. Old code ignores it and reads 'cancelled'.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "delisted_at" timestamptz;
--> statement-breakpoint
-- Backfill the sweep's past cancellations from its audit rows. Guarded to rows
-- still cancelled, not yet marked, and untouched since the sweep (an admin or
-- report edit bumps updated_at past the audit row). Idempotent; reversible by
-- setting the column back to NULL.
UPDATE "events" AS e
SET "delisted_at" = a."created_at"
FROM "audit_log" AS a
WHERE a."action" = 'event.auto_cancel.stale'
  AND a."target_id" = e."id"::text
  AND e."status" = 'cancelled'
  AND e."delisted_at" IS NULL
  AND e."updated_at" <= a."created_at" + interval '1 minute';
