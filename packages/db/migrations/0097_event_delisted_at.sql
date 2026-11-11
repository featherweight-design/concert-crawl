-- B+ A5: No longer listed. The stale sweep marks the shows it cancels.
-- Plan: docs/superpowers/plans/2026-11-11-bplus-a5-no-longer-listed.md
--
-- Expand-only. A nullable marker beside status = 'cancelled': set means the
-- sweep removed the show because the venue stopped listing it, not because
-- anyone confirmed it is off. Old code ignores it and reads 'cancelled'.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "delisted_at" timestamptz;
--> statement-breakpoint
-- Backfill the sweep's past cancellations from its audit rows: every row the
-- sweep cancelled that is still cancelled, marked at the sweep's first run on
-- it. A row someone has since moved off cancelled is skipped by the status
-- check, and one an admin edited after the sweep (it may have been restored
-- and re-cancelled by hand) is skipped too. Idempotent; reversible by setting
-- the column back to NULL.
UPDATE "events" AS e
SET "delisted_at" = a."swept_at"
FROM (
  SELECT "target_id", min("created_at") AS "swept_at"
  FROM "audit_log"
  WHERE "action" = 'event.auto_cancel.stale'
  GROUP BY "target_id"
) AS a
WHERE a."target_id" = e."id"::text
  AND e."status" = 'cancelled'
  AND e."delisted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "audit_log" AS h
    WHERE h."target_id" = e."id"::text
      AND h."action" IN ('event.update', 'event.report.resolve')
      AND h."created_at" > a."swept_at"
  );
