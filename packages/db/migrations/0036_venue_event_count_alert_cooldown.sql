-- Add last_event_count_alert_at to venues so the crawler can throttle
-- "events dropped" admin alerts to one per 7 days per venue (#624).
--
-- A null value means we've never alerted on this venue; the threshold
-- check in packages/crawler-core/src/lib/event-count-alert.ts treats
-- null as "cooldown expired" and may fire on the next qualifying run.

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS last_event_count_alert_at timestamptz;
