-- Admin redesign 1e: keep the fetched HTML of a crawl run's pages for a while,
-- so an admin can inspect what the crawler saw.
--
-- Expand-only: three columns, all nullable or with a constant default, so
-- nothing is rewritten and existing rows read as "no body". html_gz is the
-- gzipped body; body_expires_at is fetched_at plus the retention window (14
-- days). A daily sweep nulls html_gz once it expires and never drops the row.
-- body_truncated marks a page whose body was over the size cap and so was not
-- kept. The crawler stores nothing until CRAWL_PAGE_BODIES=on.
--
-- Down:
--   DROP INDEX IF EXISTS crawl_run_pages_body_expires_at_idx;
--   ALTER TABLE crawl_run_pages DROP COLUMN IF EXISTS body_truncated,
--     DROP COLUMN IF EXISTS body_expires_at, DROP COLUMN IF EXISTS html_gz;
ALTER TABLE "crawl_run_pages"
  ADD COLUMN IF NOT EXISTS "html_gz" bytea,
  ADD COLUMN IF NOT EXISTS "body_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "body_truncated" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "crawl_run_pages_body_expires_at_idx"
  ON "crawl_run_pages" ("body_expires_at")
  WHERE "html_gz" IS NOT NULL;
