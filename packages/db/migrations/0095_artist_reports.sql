-- Wrong-artist reports (plan: docs/superpowers/plans/2026-11-11-wrong-artist-report.md).
-- A fan flags that an artist page is matched to the wrong Spotify act; admin
-- works the queue in /admin/artists.
--
-- `artist_id` has no foreign key on purpose: `artists` is a projection that
-- nothing else references by FK and it can be rebuilt. `status` and `reason`
-- are text, validated by Zod at the API boundary, like event_reports.
-- Expand-only: a new table, nothing existing changes. Rollback is dropping it.
CREATE TABLE IF NOT EXISTS "artist_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"suggested_spotify_artist_id" text,
	"note" varchar(280),
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "artist_reports_one_open_per_reporter" ON "artist_reports" USING btree ("artist_id","reporter_id") WHERE "artist_reports"."status" = 'open';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_reports_open_by_artist" ON "artist_reports" USING btree ("artist_id") WHERE "artist_reports"."status" = 'open';
