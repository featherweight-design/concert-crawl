-- Track A of the canonical-artist consolidation pair (issue #608).
-- Adds a partial UNIQUE index that prevents future intra-venue duplicates
-- from being created by the crawler's upsert path. Track B (the one-time
-- consolidation backfill in scripts/2026-06-17-event-canonical-artist-consolidate.sql)
-- MUST have run to completion in this environment before this migration applies —
-- both unique indexes would otherwise reject the existing duplicate clusters
-- (e.g. the 60+ Cervantes clusters with multiple artist-string variants per
-- show identified on 2026-06-17).
--
-- Two changes here, both partial WHERE status = 'upcoming':
--
--   1. Add the new (venue_id, date, canonical_artist) partial UNIQUE index
--      that backs the crawler's ON CONFLICT target.
--
--   2. Replace the legacy global (venue_id, date, artist) UNIQUE index with
--      a partial version on the same predicate. Required because the
--      legacy global index would still reject the cancelled-then-relisted
--      case: admin marks "Ziggy Marley" at Cervantes 6/24 cancelled, venue
--      re-lists the same show under the same artist string, crawler tries
--      to INSERT a new upcoming row — the new partial canonical index
--      correctly allows it, but the legacy global artist index would block
--      it with a UNIQUE violation. Scoping the legacy index to upcoming
--      keeps the original intent (one upcoming row per artist+date+venue)
--      without blocking admin status overrides + relists.
--
-- Partial scope of `status = 'upcoming'` because:
--   (a) the crawler only ever upserts `status = 'upcoming'` rows
--   (b) admin status overrides (cancelled, postponed) sit outside both
--       indexes — relists at the same venue/date produce a new upcoming
--       row alongside the cancelled one
--   (c) the event_status enum is (upcoming | cancelled | postponed); no
--       "finished" state — rows just stay upcoming forever in the current
--       data model, optionally filtered by date in queries
--
-- The companion ON CONFLICT swap is in packages/crawler-core/src/crawl.ts —
-- target switches from (venue_id, date, artist) to (venue_id, date,
-- canonical_artist) WHERE status = 'upcoming'.

CREATE UNIQUE INDEX IF NOT EXISTS events_venue_date_canonical_artist_idx
  ON events (venue_id, date, canonical_artist)
  WHERE status = 'upcoming';
--> statement-breakpoint

-- Replace the legacy global UNIQUE with a partial version on the same
-- predicate as the canonical index. DROP + recreate (rather than ALTER)
-- because Postgres has no in-place way to change an index's WHERE predicate.
DROP INDEX IF EXISTS events_venue_date_artist_idx;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS events_venue_date_artist_idx
  ON events (venue_id, date, artist)
  WHERE status = 'upcoming';
