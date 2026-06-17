-- Stale-event detection (issue #607). Adds two timestamp columns to events
-- so the crawler can flag rows that *should* have appeared in a successful
-- crawl run but didn't — letting admins surface postponed/cancelled/silently-
-- removed shows from the venue side instead of waiting on a user report.
--
-- - last_seen_at: bumped to NOW() on every successful crawl that returns the
--   event. NOT NULL so callers can compare timestamps without null guards.
--   New rows get DEFAULT NOW() (handled at the schema level after the
--   migration). Existing rows are backfilled to created_at so they reflect
--   the actual historical last-known-good timestamp.
-- - first_missing_at: nullable. NULL means the event is currently being seen
--   (or an admin has dismissed a false-positive miss). Set to NOW() on the
--   first crawl that should have returned the event but didn't; preserved
--   across subsequent missing sweeps because Pass 2 in the crawler only
--   updates rows WHERE first_missing_at IS NULL.
--
-- Migration shape — expand/contract (per CLAUDE.md "Architecture Decisions"):
--   1. ADD COLUMN nullable, no default      (metadata-only, fast, no rewrite)
--   2. Backfill via UPDATE to created_at    (writes once, no exclusive lock)
--   3. SET DEFAULT NOW()                    (metadata-only)
--   4. SET NOT NULL                         (validates existing rows, no rewrite)
-- The naive `ADD COLUMN NOT NULL DEFAULT NOW()` would have rewritten the
-- whole table under an exclusive lock (NOW() is volatile, so Postgres can't
-- short-circuit the rewrite).
--
-- No new index — the admin query filter
-- `first_missing_at IS NOT NULL AND status = 'upcoming' AND date >= today`
-- is selective enough at this data volume.
--
-- See packages/crawler-core/src/crawl.ts for the post-upsert update passes
-- and apps/api/src/routes/admin/events.ts for the ?missing=true filter.

-- last_seen_at — expand step 1: add nullable column
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
--> statement-breakpoint

-- last_seen_at — expand step 2: backfill from created_at
UPDATE events SET last_seen_at = created_at WHERE last_seen_at IS NULL;
--> statement-breakpoint

-- last_seen_at — expand step 3: set the default for new rows
ALTER TABLE events
  ALTER COLUMN last_seen_at SET DEFAULT NOW();
--> statement-breakpoint

-- last_seen_at — expand step 4: tighten to NOT NULL (validates only, no rewrite)
ALTER TABLE events
  ALTER COLUMN last_seen_at SET NOT NULL;
--> statement-breakpoint

-- first_missing_at — nullable column, no backfill needed
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS first_missing_at timestamptz;
