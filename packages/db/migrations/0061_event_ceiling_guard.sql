-- Detection for a venue whose event catalogue is capped rather than healthy
-- (#1185, remaining acceptance item from #1127).
--
-- The Fillmore and Marquis silently published only their first 36 events for
-- months. Nothing alerted: the went-dark check in event-count-alert.ts fires
-- at zero usable events or below 30% of baseline, and a hard cap returns a
-- healthy, *stable* count that clears both thresholds. A ceiling looks exactly
-- like a well-run venue.
--
-- Two columns support the two detections:
--
--   crawl_runs.furthest_event_date — the latest date among the events this run
--   actually kept. A venue that starts truncating stops announcing far-out
--   shows, so this date stalls or moves closer while the count stays healthy.
--   Nullable because zero-event, skipped, failed and robots-blocked runs have
--   no furthest date, and because every historical row predates the column.
--   Deliberately NOT backfilled: crawl_runs holds no per-event detail, so
--   there is nothing to derive a historical value from, and inferring one from
--   the current events table would attribute today's catalogue to old runs.
--   The checker treats NULL as "no reading" and needs COLD_START_MIN_RUNS
--   non-null readings before it will classify, so the guard arms itself a few
--   nightly crawls after deploy instead of firing on bad history.
--
--   venues.last_event_ceiling_alert_at — cooldown marker, mirroring
--   last_event_count_alert_at. Cleared on a healthy run so a venue that
--   recovers and re-caps alerts again rather than staying silenced (#1174).

ALTER TABLE crawl_runs
  ADD COLUMN IF NOT EXISTS furthest_event_date date;

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS last_event_ceiling_alert_at timestamp with time zone;
