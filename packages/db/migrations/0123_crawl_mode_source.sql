-- Who set a venue's crawl mode: an admin by hand, or the crawler on its first
-- automatic pick.
--
-- venues.crawl_mode is written two ways. The crawler fills it on a venue's
-- first crawl when it is NULL (packages/crawler-core/src/crawl.ts), and an
-- admin can set it by hand (PATCH /v1/admin/venues/:id). The admin UI needs to
-- tell those apart so a hand-set "Page loading" reads as forced.
--
-- 'admin' = set by an admin; 'auto' = picked by the crawler. NULL = not
-- recorded (every row before this, and any venue whose mode an admin cleared);
-- the UI reads NULL as Automatic.
--
-- Expand-only: one nullable column with no default, so the add touches no
-- existing row, plus a CHECK that every existing row (NULL) already passes.
-- Read only by code that ships after this.
--
-- Down:
--   ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_crawl_mode_source_check;
--   ALTER TABLE venues DROP COLUMN IF EXISTS crawl_mode_source;
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "crawl_mode_source" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_crawl_mode_source_check"
    CHECK ("crawl_mode_source" IS NULL OR "crawl_mode_source" IN ('admin', 'auto'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
