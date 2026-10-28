-- Set when an admin honours a venue's removal request (/bot promises one within
-- 30 days). Deactivation alone keeps a venue's past shows on artist pages
-- (#1299); a removed venue's past shows leave those too. Cleared when the venue
-- is activated again.
-- Expand-only: a nullable column, no backfill.
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "removed_at" timestamp with time zone;
