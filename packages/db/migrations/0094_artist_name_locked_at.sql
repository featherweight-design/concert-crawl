-- Artist name lock: an admin's hand-set display name wins over the automatic
-- name repair (repair-artist-names, including its Spotify respell).
--
-- Non-null once an admin has set `artists.name` by hand; the repair skips
-- every such row. Clearing it hands the name back to the repair.
--
-- Expand-only: a nullable column, no backfill. Rollback is ignoring it; the
-- drop, if ever wanted, is a later contract migration.
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "name_locked_at" timestamp with time zone;
