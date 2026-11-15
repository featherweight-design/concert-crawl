-- When the crawler claimed a triggered re-crawl, and an index for the queue.
--
-- The admin re-crawl states board
-- (design/design_handoff_admin_redesign/addendum-3/boards/03-venues/re-crawl-states.html)
-- draws "Starts after the run in progress · about 2 min" for a queued
-- re-crawl. Working out that wait needs how long the run ahead has been going,
-- and `updated_at` cannot say: progress writes move it.
--
-- `crawl_triggers.started_at` is set when the crawler claims the trigger
-- (status 'pending' to 'processing'; apps/crawler/src/run.ts
-- claimPendingTriggers). The partial index serves the queue reads, which count
-- and walk the pending triggers oldest `created_at` first.
--
-- Expand-only: one nullable column with no default, so the add touches no
-- existing row and every existing row reads "start time unknown", which is
-- what it is. The index is small (pending rows only). Read only by code that
-- ships after this.
--
-- Down:
--   DROP INDEX IF EXISTS crawl_triggers_pending_created_idx;
--   ALTER TABLE crawl_triggers DROP COLUMN IF EXISTS started_at;
ALTER TABLE "crawl_triggers" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_triggers_pending_created_idx"
  ON "crawl_triggers" ("created_at")
  WHERE "status" = 'pending';
