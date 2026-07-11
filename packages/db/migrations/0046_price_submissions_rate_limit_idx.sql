-- #876: composite index supporting the per-(user, event) rate-limit count —
-- countRecentActs filters on (event_id, user_id, created_at > cutoff).
CREATE INDEX IF NOT EXISTS "price_submissions_event_user_created_idx" ON "price_submissions" ("event_id","user_id","created_at");
