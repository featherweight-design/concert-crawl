-- Detection for a venue whose "Get tickets" CTA has silently degraded to the
-- venue homepage across its whole catalogue.
--
-- The consumer CTA resolves ticket_url ?? event_url ?? venue.website_url, so a
-- venue with neither per-event URL still renders a working-looking button that
-- drops the user on a generic event calendar. Nothing alerted on this:
-- extraction reported healthy counts, the events were real and correctly dated,
-- and only the two URL columns were empty.
--
-- Cervantes' Masterpiece Ballroom was the canary — 129 of 129 upcoming events
-- carried neither URL for two days while every crawl-health check read green.
-- The went-dark and ceiling guards both key off event *counts*, which were
-- fine; this failure is invisible in that dimension.
--
--   venues.last_url_coverage_alert_at — cooldown marker, mirroring
--   last_event_count_alert_at and last_event_ceiling_alert_at. Its own column
--   so a venue that is simultaneously capped and URL-less reports both, and so
--   a healthy run clears this incident without touching the others (#1174).
--
-- No backfill: the marker is a cooldown, not history. NULL means "never
-- alerted", which is the correct starting state for every existing venue.

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS last_url_coverage_alert_at timestamp with time zone;
