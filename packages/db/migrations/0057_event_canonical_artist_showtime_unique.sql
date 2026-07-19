-- Contract phase of the headliner+show_time dedup re-key (issue #1053).
--
-- Root cause (see docs/superpowers/specs/2026-07-19-1053-dedup-analysis.md):
-- the (venue_id, date, canonical_title) key from #0044 under-collapses on
-- billing/title variants of the same show ("Hilary Duff" vs "Hilary Duff
-- with La Roux, Jade LeMac" produce distinct canonical_titles → distinct
-- rows). canonicalizeTitle deliberately keeps the full billing string.
--
-- Post-#643 the extractor separates the headliner (canonical_artist) from
-- supporting_artists, and canonical_artist is now stable across the variant
-- rows. This migration moves the ON CONFLICT target to
-- (venue_id, date, canonical_artist, show_time).
--
-- show_time is in the key (NULLS NOT DISTINCT) to protect genuine
-- same-artist same-day double-headers (e.g. a 16:00 matinee + 19:00 evening)
-- from collapsing into one row — a real data-loss bug. NULLS NOT DISTINCT
-- (PG15+) makes the 51 null-show_time rows still dedup by
-- (venue_id, date, canonical_artist).
--
-- Hard prereq: scripts/2026-07-19-event-canonical-artist-showtime-consolidate.sql
-- MUST have run to completion (DO_EXECUTE=1) in this environment before this
-- migration applies. Otherwise CREATE UNIQUE INDEX fails on the existing
-- dupe clusters (280 clusters / 489 rows on prod as of 2026-07-19).
--
-- canonical_title stays on the table as a display/search column with its
-- non-unique events_canonical_title_idx btree intact.
--
-- The companion ON CONFLICT swap is in packages/crawler-core/src/crawl.ts.

CREATE UNIQUE INDEX IF NOT EXISTS events_venue_date_canonical_artist_showtime_idx
  ON events (venue_id, date, canonical_artist, show_time)
  NULLS NOT DISTINCT
  WHERE status = 'upcoming';
--> statement-breakpoint

-- Drop the prior title-based dedup index. canonical_title + its non-unique
-- btree (events_canonical_title_idx) stay for display/search.
DROP INDEX IF EXISTS events_venue_date_canonical_title_idx;
