-- Price-source discoverability schema (issue #641 + #644, PR 1 of 4).
--
-- Expand-only. This migration:
--   1. Adds the `source_category` pgEnum + nullable column on price_submissions
--   2. Adds a `ticket_links` jsonb column on events (typed array of TicketLink)
--   3. Backfills source_category from existing (vendor, how_found) rows
--   4. Backfills ticket_links from existing ticket_url + venues.ticket_vendor
--   5. Flips price_submissions.corroboration_count default 0 -> 1
--      (submitter counts as observation #1 for the new 1/2 confirmation model)
--   6. Backfills existing rows' corroboration_count by +1 (submitter inclusion)
--   7. Adds partial unique index pinning corroborated box-office prices to one
--      row per (event, tier).
--
-- howFound, the VenueBoxOffice enum value, and ticket_url stay in place. A
-- separate contract PR drops them once nothing reads them.

-- 1. source_category pgEnum (idempotent — Drizzle pattern)
DO $$ BEGIN
 CREATE TYPE "public"."source_category" AS ENUM('boxoffice', 'standard', 'resale');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Nullable column on price_submissions
ALTER TABLE "price_submissions"
  ADD COLUMN IF NOT EXISTS "source_category" "source_category";
--> statement-breakpoint

-- 3. ticket_links jsonb on events
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "ticket_links" jsonb;
--> statement-breakpoint

-- 4. Backfill source_category for legacy rows.
--    Heuristic:
--      vendor = 'VenueBoxOffice'        -> boxoffice
--      how_found = 'at_the_venue'       -> boxoffice (face-value-at-the-door)
--      everything else                  -> standard
--    Legacy resale cannot be reliably identified from existing data — none of
--    the captured fields signal it — so legacy rows are bucketed boxoffice or
--    standard only. New submissions (post-PR 4) write source_category directly
--    from the submit form.
UPDATE "price_submissions"
   SET "source_category" = 'boxoffice'
 WHERE "source_category" IS NULL
   AND ("vendor" = 'VenueBoxOffice' OR "how_found" = 'at_the_venue');
--> statement-breakpoint

UPDATE "price_submissions"
   SET "source_category" = 'standard'
 WHERE "source_category" IS NULL;
--> statement-breakpoint

-- 5. Backfill ticket_links from existing ticket_url.
--    kind heuristic: if venue.ticket_vendor = 'venue_box_office' -> boxoffice;
--                    else -> primary.
--    Resale links are not present in current crawl output; PR 2 (crawler) adds
--    them when source URL hosts indicate resale.
UPDATE "events" e
   SET "ticket_links" = jsonb_build_array(
         jsonb_build_object(
           'kind',
             CASE
               WHEN v."ticket_vendor" = 'venue_box_office' THEN 'boxoffice'
               ELSE 'primary'
             END,
           'vendor', v."ticket_vendor",
           'url', e."ticket_url"
         )
       )
  FROM "venues" v
 WHERE e."venue_id" = v."id"
   AND e."ticket_url" IS NOT NULL
   AND e."ticket_links" IS NULL;
--> statement-breakpoint

-- Handle rows where venue_id is NULL but ticket_url exists — backfill without
-- vendor inference.
UPDATE "events"
   SET "ticket_links" = jsonb_build_array(
         jsonb_build_object('kind', 'primary', 'vendor', NULL, 'url', "ticket_url")
       )
 WHERE "venue_id" IS NULL
   AND "ticket_url" IS NOT NULL
   AND "ticket_links" IS NULL;
--> statement-breakpoint

-- 6. Flip corroboration_count default + backfill existing rows.
--    Submitter counts as observation #1, so:
--      - new inserts default to 1 (DB-level safety net for the insert)
--      - existing rows get +1 across the board so the data model is uniform
--    Promotion threshold (SP_POLICY.confirmsRequired = 2) is unchanged — the
--    code-side promotion checks now use a `+ 1` formula in submissions.ts AND
--    price-submission-confirms.ts (the latter is brought into alignment in
--    the same PR).
ALTER TABLE "price_submissions"
  ALTER COLUMN "corroboration_count" SET DEFAULT 1;
--> statement-breakpoint

UPDATE "price_submissions"
   SET "corroboration_count" = "corroboration_count" + 1;
--> statement-breakpoint

-- 7. Partial unique index — at most one corroborated box-office price per
--    (event, tier). Box-office is exempt from staleness (per spec) and
--    deserves a single canonical row; community/standard prices can still
--    coexist as separate corroborated rows for the same (event, tier).
CREATE UNIQUE INDEX IF NOT EXISTS "price_submissions_event_tier_boxoffice_uniq"
  ON "price_submissions" ("event_id", "tier", "source_category")
 WHERE "status" = 'corroborated' AND "source_category" = 'boxoffice';
