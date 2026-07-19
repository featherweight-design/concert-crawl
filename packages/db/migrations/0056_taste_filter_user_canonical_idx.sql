-- #763 PR 7 taste filter — composite index for the taste-scoped events query.
-- spotifyTasteCondition runs a correlated EXISTS on user_artist_follows
-- filtered by user_id + source + canonical_name; the existing single-column
-- canonical_name index is not user-scoped, so pair user_id with canonical_name
-- to keep the per-event probe index-backed as follow counts grow.
CREATE INDEX IF NOT EXISTS "user_artist_follows_user_canonical_name_idx" ON "user_artist_follows" ("user_id","canonical_name");
