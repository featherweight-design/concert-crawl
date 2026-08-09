-- Cache the Spotify search results the matcher already paid for.
--
-- The match job searches every unresolved row and throws the candidate list
-- away, keeping only its verdict. The admin candidate picker then re-runs that
-- identical search on every open, against the app-token quota that
-- MATCH_BATCH_SIZE exists to ration. Snapshotting the list closes that loop.
--
-- Both columns are nullable with no default: NULL means "never snapshotted",
-- which every existing row is. Expand-only — nothing is dropped, and readers
-- fall back to a live search on NULL, so this deploys safely ahead of the code.
ALTER TABLE artists ADD COLUMN spotify_candidates jsonb;
ALTER TABLE artists ADD COLUMN spotify_candidates_fetched_at timestamptz;
