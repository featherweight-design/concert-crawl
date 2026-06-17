-- Composite index to keep the success-path baseline query fast as crawl_runs
-- grows. Used by packages/crawler-core/src/lib/event-count-alert.ts:
--   SELECT events_found FROM crawl_runs
--   WHERE venue_id = $1 AND status = 'success' AND id <> $2
--   ORDER BY created_at DESC LIMIT 7
--
-- Without an index Postgres falls back to a seq scan + sort, which is fine
-- today (a few hundred rows) but will degrade as we accumulate years of
-- daily crawls per venue. Status leads venue_id in the index when we expect
-- status to be more selective; here venue_id is more selective (~100 venues
-- vs 4 status values) so (venue_id, status, created_at) is the right order.

CREATE INDEX IF NOT EXISTS crawl_runs_venue_status_created_idx
  ON crawl_runs (venue_id, status, created_at DESC);
