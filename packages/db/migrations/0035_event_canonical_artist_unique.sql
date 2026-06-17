-- Track A of the canonical-artist consolidation pair (issue #608).
-- Adds a partial UNIQUE index that prevents future intra-venue duplicates
-- from being created by the crawler's upsert path. Track B (the one-time
-- consolidation backfill in scripts/2026-06-17-event-canonical-artist-consolidate.sql)
-- MUST have run to completion in this environment before this migration applies —
-- the UNIQUE index would otherwise reject every existing duplicate cluster
-- (e.g. the 60+ Cervantes clusters with multiple artist-string variants per
-- show identified on 2026-06-17).
--
-- Partial index scoped to `status = 'upcoming'` because:
--   (a) the crawler only ever upserts `status = 'upcoming'` rows
--   (b) historical statuses (cancelled, finished) are free to have multiples
--       per (venue, date, canonical_artist) — e.g. a cancelled show that
--       gets relisted as a new upcoming row at the same venue/date
--   (c) admin's explicit status changes should not be overwritten by future
--       crawls — ON CONFLICT targeting this partial index leaves status !=
--       upcoming rows alone.
--
-- The companion ON CONFLICT swap is in packages/crawler-core/src/crawl.ts —
-- target switches from (venue_id, date, artist) to (venue_id, date,
-- canonical_artist) WHERE status = 'upcoming'.

CREATE UNIQUE INDEX IF NOT EXISTS events_venue_date_canonical_artist_idx
  ON events (venue_id, date, canonical_artist)
  WHERE status = 'upcoming';
