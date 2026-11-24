-- Artist search photos for MusicBrainz-only rows: a cache table.
--
-- `mb_artists` is replaced whole by the weekly loader (drop, then rename a
-- shadow table into place), so a photo kept on it would be wiped every week.
-- The photos live in their own table, joined on `mbid`, with no foreign key
-- to `mb_artists` because the swap drops that table.
--
-- Nothing reads or writes it until the code that ships with this migration.
-- A row is written by the match-artists cron, never by a search request.
--
-- Expand-only: one new table, nothing altered, dropped or backfilled.
--
-- Rollback (docs/runbooks/db-rollback.md): DROP TABLE "mb_artist_photos".
CREATE TABLE "mb_artist_photos" (
  "mbid" uuid PRIMARY KEY NOT NULL,
  "photo_url" text,
  "photo_fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
