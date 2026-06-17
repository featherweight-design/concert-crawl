-- Stale-event detection (issue #607). Adds two timestamp columns to events
-- so the crawler can flag rows that *should* have appeared in a successful
-- crawl run but didn't — letting admins surface postponed/cancelled/silently-
-- removed shows from the venue side instead of waiting on a user report.
--
-- - last_seen_at: bumped to NOW() on every successful crawl that returns the
--   event. NOT NULL with default NOW() so freshly inserted rows start in the
--   "currently seen" state. Existing rows are backfilled to created_at so
--   they reflect the actual historical last-known-good timestamp instead of
--   pretending the column was set when the migration ran.
-- - first_missing_at: nullable. NULL means the event is currently being seen
--   (or an admin has dismissed a false-positive miss). Set to NOW() on the
--   first crawl that should have returned the event but didn't; preserved
--   across subsequent missing sweeps via COALESCE in the crawler update.
--
-- No new index — the admin query filter
-- `first_missing_at IS NOT NULL AND status = 'upcoming' AND date >= CURRENT_DATE`
-- is selective enough at this data volume.
--
-- See packages/crawler-core/src/crawl.ts for the post-upsert update passes
-- and apps/api/src/routes/admin/events.ts for the ?missing=true filter.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT NOW();
--> statement-breakpoint

-- Backfill existing rows so last_seen_at reflects the historical "last we
-- knew about it" timestamp (created_at) rather than the migration time.
-- The DEFAULT NOW() above stamped every existing row identically; this
-- corrects them before the crawler starts updating the column on each run.
UPDATE events SET last_seen_at = created_at;
--> statement-breakpoint

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS first_missing_at timestamptz;
