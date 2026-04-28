DROP INDEX IF EXISTS "events_venue_date_artist_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "events_venue_date_artist_idx" ON "events" USING btree ("venue_id","date","artist");