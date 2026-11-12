-- Admin redesign 3a: why a venue is paused and when it resumes by itself.
--
-- Expand-only: three nullable columns on venues. crawl_paused_at stays the one
-- switch every crawl path reads; these only explain it and schedule its end.
-- NULL everywhere today. A pause with no resume date waits for an admin
-- ("When I say"); crawl_resume_on is a Mountain Time calendar date, resumed by
-- a job that runs before that morning's 3 AM crawl.
--
-- Down:
--   ALTER TABLE venues DROP COLUMN IF EXISTS crawl_resume_on,
--     DROP COLUMN IF EXISTS crawl_pause_note,
--     DROP COLUMN IF EXISTS crawl_pause_reason;
ALTER TABLE "venues"
  ADD COLUMN IF NOT EXISTS "crawl_pause_reason" text,
  ADD COLUMN IF NOT EXISTS "crawl_pause_note" text,
  ADD COLUMN IF NOT EXISTS "crawl_resume_on" date;

DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_crawl_pause_reason_check"
    CHECK ("crawl_pause_reason" IS NULL OR "crawl_pause_reason" IN
      ('waiting_on_permission', 'site_broken_or_moved', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
