-- Route the Live Nation venues through the new platform fetcher (#1127).
--
-- Both sites server-render JSON-LD for exactly 36 events and expose no
-- pagination, so the structured-data cascade truncated them at a fixed
-- item count. platform='livenation' switches them to the monthly-calendar
-- fetcher, which reads the full 12-month window (49 events for Fillmore,
-- 67 for Marquis as of 2026-07-25).
--
-- platform_venue_id holds the venue id as it appears in the calendar page
-- payload, used to drop any sister-venue on-sale listed on those pages.
--
-- Summit Music Hall is on the same template and capped the same way, but
-- its calendar pages return zero event records for every month — including
-- ones its own JSON-LD proves it has shows in. It stays on the cascade.
--
-- Matched on website_url rather than name so a later display-name edit
-- can't silently turn this into a no-op. Idempotent: re-running sets the
-- same values.

UPDATE venues
  SET platform = 'livenation', platform_venue_id = 'KovZpZAE6eJA'
  WHERE website_url = 'https://www.fillmoredenver.com/shows';

UPDATE venues
  SET platform = 'livenation', platform_venue_id = 'KovZpZAJeFkA'
  WHERE website_url = 'https://www.marquisdenver.com/shows';
