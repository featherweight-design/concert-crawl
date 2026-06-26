-- Contract phase of the title-based dedup cycle (issue #821).
--
-- PR #822 added canonical_title + the JS canonicalizer + the SQL backfill.
-- This migration completes the swap: ON CONFLICT target moves from
-- (venue_id, date, canonical_artist) to (venue_id, date, canonical_title).
--
-- Hard prereq: scripts/2026-06-26-event-canonical-title-consolidate.sql
-- MUST have run to completion in this environment before this migration
-- applies. Otherwise the new UNIQUE index would fail to build with
-- duplicate-key errors on the existing dupe clusters (47% dupe rate on
-- hidden events on prod as of 2026-06-26 — see #821).
--
-- Three changes, all partial WHERE status = 'upcoming':
--
--   1. ADD the new (venue_id, date, canonical_title) partial UNIQUE index
--      that backs the new ON CONFLICT target.
--
--   2. DROP the partial UNIQUE on (venue_id, date, canonical_artist). It
--      is no longer the dedup key. canonical_artist stays on the table as
--      a search/display column with its non-unique btree index intact
--      (events_canonical_artist_idx). Removing the unique constraint
--      lets future LLM artist-drift compose harmlessly into the same
--      canonical_title row instead of contradicting the canonical_artist
--      index.
--
--   3. DROP the legacy partial UNIQUE on (venue_id, date, artist) for the
--      same reason — it's superseded by the canonical_title unique.
--      Keeping it would re-introduce the original #608 problem: LLM
--      artist-string drift on a hit-the-conflict-target re-crawl would
--      fail with a UNIQUE violation against the legacy index.
--
-- Partial scope of `status = 'upcoming'` because:
--   (a) the crawler only ever upserts `status = 'upcoming'` rows
--   (b) admin status overrides (cancelled, postponed) sit outside the
--       index — relists at the same venue/date produce a new upcoming row
--       alongside the cancelled one
--
-- The companion ON CONFLICT swap is in packages/crawler-core/src/crawl.ts.

CREATE UNIQUE INDEX IF NOT EXISTS events_venue_date_canonical_title_idx
  ON events (venue_id, date, canonical_title)
  WHERE status = 'upcoming';
--> statement-breakpoint

-- Drop the prior dedup index. Keep canonical_artist + its non-unique
-- btree index (events_canonical_artist_idx) for search/display.
DROP INDEX IF EXISTS events_venue_date_canonical_artist_idx;
--> statement-breakpoint

-- Drop the legacy artist unique. See header comment for rationale.
DROP INDEX IF EXISTS events_venue_date_artist_idx;
