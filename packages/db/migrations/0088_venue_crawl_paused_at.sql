-- An admin pause that stops every crawl of a venue while its shows stay
-- published. Separate from blocked_at, which the crawler sets on a 403/429 and
-- a single manual trigger clears: a pause is only ever lifted by an admin.
-- Expand-only: a nullable column, no backfill.
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "crawl_paused_at" timestamp with time zone;
