-- Concert Crawl — event date UTC → venue-local backfill (issue #596)
--
-- Context: Before this PR, packages/crawler-core/src/lib/extractors/json-ld.ts
-- naively split ISO startDates on `T` regardless of timezone. Venues whose JSON-LD
-- emits UTC-suffixed timestamps (e.g. "2026-06-16T04:00:00Z") for evening shows
-- got their `date` and `show_time` stored as the UTC values, not venue-local.
-- Result: late-evening Denver shows landed on the wrong calendar day.
--
-- Run against staging FIRST, validate, then prod. Run inside a single transaction
-- so the whole thing rolls back if anything looks off. Connection: Neon (NOT
-- Render — see memory `reference_neon_db_access`).
--
-- Sequence:
--   1. DIAGNOSE   — count suspect events per venue, eyeball before touching anything.
--   2. SNAPSHOT   — copy suspect rows into a sidecar table so we can recover.
--   3. UPDATE     — verified events: shift in place via AT TIME ZONE.
--   4. DELETE     — unverified events: remove so recrawl produces fresh rows.
--   5. RECRAWL    — manual: trigger crawl per affected venue via admin canary.
--   6. VALIDATE   — spot-check the user-reported event + a sample.

------------------------------------------------------------------------
-- 1. DIAGNOSE
------------------------------------------------------------------------
-- Heuristic: a concert show starting before noon is almost always actually
-- evening-prior-day stored as UTC. Run this first to scope the work.
SELECT
  v.slug,
  v.name,
  v.timezone,
  COUNT(*) FILTER (WHERE e.verified = true)  AS verified_suspect,
  COUNT(*) FILTER (WHERE e.verified = false) AS unverified_suspect,
  COUNT(*) AS total_suspect
FROM events e
JOIN venues v ON v.id = e.venue_id
WHERE e.show_time IS NOT NULL
  AND e.show_time < '12:00:00'
  AND e.date >= CURRENT_DATE
GROUP BY v.slug, v.name, v.timezone
ORDER BY total_suspect DESC;

------------------------------------------------------------------------
-- 2. SNAPSHOT (run inside the same session as the UPDATE/DELETE below)
------------------------------------------------------------------------
BEGIN;

CREATE TABLE IF NOT EXISTS events_backfill_596 AS
SELECT *, NOW() AS snapshot_at
FROM events
WHERE FALSE;  -- structure only, no rows yet

INSERT INTO events_backfill_596
SELECT e.*, NOW()
FROM events e
WHERE e.show_time IS NOT NULL
  AND e.show_time < '12:00:00'
  AND e.date >= CURRENT_DATE;

------------------------------------------------------------------------
-- 3. UPDATE verified events in place
------------------------------------------------------------------------
-- Postgres handles DST automatically via AT TIME ZONE with an IANA name.
-- (date + show_time) interpreted as UTC → projected to venue.timezone →
-- split back into (new_date, new_show_time).
UPDATE events e
SET
  date      = ((e.date::timestamp + e.show_time::interval) AT TIME ZONE 'UTC' AT TIME ZONE v.timezone)::date,
  show_time = ((e.date::timestamp + e.show_time::interval) AT TIME ZONE 'UTC' AT TIME ZONE v.timezone)::time,
  updated_at = NOW()
FROM venues v
WHERE e.venue_id = v.id
  AND e.show_time IS NOT NULL
  AND e.show_time < '12:00:00'
  AND e.date >= CURRENT_DATE
  AND e.verified = true;

------------------------------------------------------------------------
-- 4. DELETE unverified events (will be replaced by recrawl)
------------------------------------------------------------------------
-- The (venue_id, date, artist) unique index prevents recrawl from overwriting
-- the wrong-date row in place — it would create a duplicate instead. Cleaning
-- up unverified suspects first lets the recrawl produce canonical rows.
DELETE FROM events
WHERE show_time IS NOT NULL
  AND show_time < '12:00:00'
  AND date >= CURRENT_DATE
  AND verified = false;

------------------------------------------------------------------------
-- 5. VALIDATE before committing
------------------------------------------------------------------------
-- a) Re-run the diagnostic. Verified count should be 0 (we just updated them);
--    unverified count should be 0 (we just deleted them).
-- b) Spot-check the user-reported event (Swing Nights, Cervantes, originally
--    bucketed on Tue 2026-06-16 instead of Mon 2026-06-15):
SELECT id, title, artist, date, show_time, verified
FROM events
WHERE id = '34c67a78-57b4-4e82-8538-4c476b654a25';

-- If output looks right:
COMMIT;
-- If anything looks off:
-- ROLLBACK;

------------------------------------------------------------------------
-- 6. RECRAWL (manual, after COMMIT)
------------------------------------------------------------------------
-- For each venue that appeared in step 1 with unverified_suspect > 0:
-- visit /admin/venues, hit "Trigger Crawl". Verify the resulting events have
-- venue-local dates + show_times (evening, not pre-noon).

------------------------------------------------------------------------
-- ROLLBACK (if validation fails or backfill needs re-doing)
------------------------------------------------------------------------
-- The snapshot table preserves the exact pre-backfill state. To restore:
--
--   BEGIN;
--   DELETE FROM events WHERE id IN (SELECT id FROM events_backfill_596);
--   INSERT INTO events SELECT * FROM events_backfill_596;  -- drop snapshot_at column first
--   COMMIT;
--
-- Once the backfill is validated in prod and stable for a few crawl cycles,
-- drop the snapshot table:
--   DROP TABLE events_backfill_596;
