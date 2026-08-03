-- #1212 — the catalogue queries this index targets filter on the strict
-- status = 'upcoming' predicate together with a date bound, and group or filter
-- by venue. (Surfaces that also keep cancelled/postponed rows use the wider
-- SCHEDULED_STATUSES set and are not served by this index.) Without a partial
-- index those queries scan the full events table, and the past-dated share of
-- that table only grows (Larimer Lounge is already 82% history).
--
-- CONCURRENTLY is deliberately not used: Drizzle wraps each migration in a
-- transaction, and the table is small enough that a brief lock is cheaper than
-- managing an out-of-band index build.
CREATE INDEX IF NOT EXISTS "events_venue_date_upcoming_idx"
  ON "events" ("venue_id", "date")
  WHERE "status" = 'upcoming';
