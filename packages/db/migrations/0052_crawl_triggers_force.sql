-- Force flag on crawl_triggers (reprocess legacy events).
-- Expand-only: one non-null boolean with a default, so existing rows and any
-- in-flight inserts that omit the column backfill to false. When true, the
-- crawler ignores both hash-skip short-circuits and re-extracts + re-upserts
-- every event for the venue — used to backfill data (e.g. supportingArtists)
-- on listings that haven't changed. Normal and scheduled crawls stay false.

ALTER TABLE "crawl_triggers" ADD COLUMN "force" boolean DEFAULT false NOT NULL;
