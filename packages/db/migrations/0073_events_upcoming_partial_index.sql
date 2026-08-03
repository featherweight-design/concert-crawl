-- #1212 — every "shows still to come" query filters on status = 'upcoming'
-- together with a date bound and groups or filters by venue. Without a partial
-- index those queries scan the full events table, and the past-dated share of
-- that table only grows (Larimer Lounge is already 82% history).
--
-- CONCURRENTLY is deliberately not used: Drizzle wraps each migration in a
-- transaction, and the table is small enough that a brief lock is cheaper than
-- managing an out-of-band index build.
CREATE INDEX IF NOT EXISTS "events_venue_date_upcoming_idx"
  ON "events" ("venue_id", "date")
  WHERE "status" = 'upcoming';
