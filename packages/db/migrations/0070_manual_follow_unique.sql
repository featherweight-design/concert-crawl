-- Manual follows had no unique constraint of their own. The existing
-- (user_id, source, spotify_artist_id) index cannot serve them: an unmatched
-- artist's spotify_artist_id is NULL, and Postgres treats every NULL as
-- distinct, so two concurrent POST /v1/artists/:slug/follow requests could
-- both pass the API's read-before-insert and write duplicate rows (#1115).
--
-- Dedupe first — the index cannot be created while duplicates exist. Keep the
-- oldest row per (user, artist) so created_at keeps meaning "first followed".
DELETE FROM user_artist_follows a
USING user_artist_follows b
WHERE a.source = 'manual'
  AND b.source = 'manual'
  AND a.user_id = b.user_id
  AND a.canonical_name = b.canonical_name
  AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS user_artist_follows_manual_canonical_idx
  ON user_artist_follows (user_id, canonical_name)
  WHERE source = 'manual';
