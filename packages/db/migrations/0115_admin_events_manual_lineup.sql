-- Admin 4a: shows added by hand, a lineup lock, lineups as artist links, and
-- the crawl key of a merged-away event. Plan:
-- docs/superpowers/plans/2026-11-13-admin-4a-events-data.md.
--
-- Expand-only. Every new column is nullable or defaulted, and the new table is
-- read only by code that ships with it, so old readers keep working.
--
-- events.manual: a show added by hand. The crawl never removes it and never
--   rewrites its title or lineup.
-- events.created_by: the Clerk user id of the admin who added it.
-- events.lineup_edited_at: set when an admin saves the lineup; while set,
--   nothing that writes the bill may overwrite the artist arrays.
-- event_artists: a projection of the four artist arrays as links to artists,
--   rebuilt by syncEventArtists. Backfilled by a script, not here.
-- event_redirects.source_*: the deleted row's crawl key, so the crawl updates
--   the merge target instead of inserting the duplicate again.
--
-- Down:
--   DROP INDEX IF EXISTS event_redirects_source_key_idx;
--   ALTER TABLE event_redirects DROP COLUMN IF EXISTS source_show_time,
--     DROP COLUMN IF EXISTS source_canonical_artist,
--     DROP COLUMN IF EXISTS source_date, DROP COLUMN IF EXISTS source_venue_id;
--   DROP TABLE IF EXISTS event_artists;
--   ALTER TABLE events DROP COLUMN IF EXISTS lineup_edited_at,
--     DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS manual;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "manual" boolean DEFAULT false NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "created_by" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lineup_edited_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "event_artists" (
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "artist_id" uuid NOT NULL REFERENCES "artists"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "position" smallint NOT NULL,
  CONSTRAINT "event_artists_event_id_artist_id_pk" PRIMARY KEY ("event_id", "artist_id"),
  CONSTRAINT "event_artists_role_check" CHECK ("role" IN ('headliner', 'support'))
);
CREATE INDEX IF NOT EXISTS "event_artists_artist_idx" ON "event_artists" ("artist_id");

ALTER TABLE "event_redirects" ADD COLUMN IF NOT EXISTS "source_venue_id" uuid;
ALTER TABLE "event_redirects" ADD COLUMN IF NOT EXISTS "source_date" date;
ALTER TABLE "event_redirects" ADD COLUMN IF NOT EXISTS "source_canonical_artist" text;
ALTER TABLE "event_redirects" ADD COLUMN IF NOT EXISTS "source_show_time" time;
CREATE INDEX IF NOT EXISTS "event_redirects_source_key_idx"
  ON "event_redirects" ("source_venue_id", "source_date");
