-- Page progress for a triggered re-crawl.
--
-- The triggered re-crawl reports how far through the venue's pages it is, so
-- the admin can watch it move. The admin re-crawl states board
-- (design/design_handoff_admin_redesign/addendum-3/boards/03-venues/re-crawl-states.html)
-- draws "Page 2 of 4" for a running re-crawl and "Starts after the run in
-- progress" for one still queued behind another.
--
-- `crawl_triggers.pages_done` and `pages_total` hold the count; `progress_at`
-- is when the crawler last reported it.
--
-- Expand-only: three nullable columns with no default, so the add touches no
-- existing row and every existing row reads "no progress", which is what it
-- was. Read only by code that ships after this.
--
-- Down:
--   ALTER TABLE crawl_triggers DROP COLUMN IF EXISTS progress_at;
--   ALTER TABLE crawl_triggers DROP COLUMN IF EXISTS pages_total;
--   ALTER TABLE crawl_triggers DROP COLUMN IF EXISTS pages_done;
ALTER TABLE "crawl_triggers" ADD COLUMN IF NOT EXISTS "pages_done" integer;--> statement-breakpoint
ALTER TABLE "crawl_triggers" ADD COLUMN IF NOT EXISTS "pages_total" integer;--> statement-breakpoint
ALTER TABLE "crawl_triggers" ADD COLUMN IF NOT EXISTS "progress_at" timestamp with time zone;
