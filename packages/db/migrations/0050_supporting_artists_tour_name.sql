-- Supporting artists + tour name columns on events (#643).
-- Expand-only: two nullable columns, no backfill, no index. Populated by
-- the crawler extraction pipeline and surfaced via the events API (consumer
-- UI rendering follows in a later PR).

ALTER TABLE "events" ADD COLUMN "supporting_artists" text[];
--> statement-breakpoint

ALTER TABLE "events" ADD COLUMN "tour_name" text;
