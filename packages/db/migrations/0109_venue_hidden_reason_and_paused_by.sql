-- Admin redesign 3a: who paused a venue's crawl, and why and by whom a venue
-- was hidden from the site.
--
-- Expand-only: five nullable columns on venues, NULL everywhere today. A venue
-- hidden before this keeps active = false with no reason ("hidden, reason not
-- recorded"). active stays the switch every public query joins on; these only
-- explain it. crawl_paused_by is NULL for a crawler auto-pause.
--
-- Down:
--   ALTER TABLE venues DROP COLUMN IF EXISTS hidden_note,
--     DROP COLUMN IF EXISTS hidden_reason, DROP COLUMN IF EXISTS hidden_by,
--     DROP COLUMN IF EXISTS hidden_at, DROP COLUMN IF EXISTS crawl_paused_by;
ALTER TABLE "venues"
  ADD COLUMN IF NOT EXISTS "crawl_paused_by" text,
  ADD COLUMN IF NOT EXISTS "hidden_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "hidden_by" text,
  ADD COLUMN IF NOT EXISTS "hidden_reason" text,
  ADD COLUMN IF NOT EXISTS "hidden_note" text;

DO $$ BEGIN
  ALTER TABLE "venues" ADD CONSTRAINT "venues_hidden_reason_check"
    CHECK ("hidden_reason" IS NULL OR "hidden_reason" IN
      ('venue_closed', 'not_music_venue', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
