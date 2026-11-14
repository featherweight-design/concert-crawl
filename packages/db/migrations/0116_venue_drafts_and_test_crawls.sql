-- Admin redesign 3c: venue drafts, Ask the venue, the hero setting, the venue
-- glyph, and test crawls.
--
-- Expand-only: two new enums, five nullable columns on venues, one defaulted
-- column on crawl_triggers, and one backfill. Nothing reads or writes these
-- yet (3c PR2-4 and 3d do); old readers keep working.
--
-- venues.went_live_at: when the venue went live. NULL means a draft. Every
-- existing venue is live today, so the UPDATE backfills it to created_at; only
-- venues created after this migration can be drafts.
-- venues.permission_asked_at: when we last asked the venue for permission to
-- crawl (Ask the venue, with its 14-day reminder).
-- venues.hero_setting: the setting the venue's hero art draws.
-- venues.glyph_svg: the venue's drawn glyph.
-- crawl_triggers.mode: 'test' runs a crawl without publishing; every existing
-- and every default trigger is a normal 'crawl'.
--
-- Down:
--   ALTER TABLE crawl_triggers DROP COLUMN IF EXISTS mode;
--   ALTER TABLE venues DROP COLUMN IF EXISTS glyph_svg,
--     DROP COLUMN IF EXISTS hero_setting,
--     DROP COLUMN IF EXISTS permission_asked_at,
--     DROP COLUMN IF EXISTS went_live_at;
--   DROP TYPE IF EXISTS crawl_trigger_mode;
--   DROP TYPE IF EXISTS hero_setting;
DO $$ BEGIN
  CREATE TYPE "hero_setting" AS ENUM (
    'street',
    'outdoor',
    'arena',
    'theater',
    'club',
    'gallery'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "crawl_trigger_mode" AS ENUM ('crawl', 'test');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "venues"
  ADD COLUMN IF NOT EXISTS "went_live_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "permission_asked_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "hero_setting" "hero_setting",
  ADD COLUMN IF NOT EXISTS "glyph_svg" text;
--> statement-breakpoint
ALTER TABLE "crawl_triggers"
  ADD COLUMN IF NOT EXISTS "mode" "crawl_trigger_mode" DEFAULT 'crawl' NOT NULL;
--> statement-breakpoint
UPDATE "venues"
SET "went_live_at" = "created_at"
WHERE "went_live_at" IS NULL;
