-- Add events_usable to crawl_runs so went-dark detection can key off the
-- post-guard row count rather than raw extractor output (#1167).
--
-- events_found is the extraction metric: normalizedEvents.length, counted
-- before the cross-venue presale filter and the empty canonical artist/title
-- guards in crawl.ts. A run that extracts 10 events and has all 10 dropped by
-- those guards therefore reported events_found: 10 and never triggered the
-- #624 alert, even though the venue produced nothing usable.
--
-- events_usable records seenEventCoords.length — what survived the guards.
-- Backfilled to events_found so every historical row is identical under the
-- new semantics and no venue's rolling baseline shifts. DEFAULT 0 keeps the
-- currently-deployed crawler's inserts valid during the deploy window.

ALTER TABLE crawl_runs
  ADD COLUMN IF NOT EXISTS events_usable integer NOT NULL DEFAULT 0;

-- Gate the backfill on rows whose value would actually change. An unqualified
-- UPDATE rewrites every historical crawl_runs row for no gain — dead tuples and
-- a longer lock — and this predicate also makes the statement idempotent, so a
-- re-run or a partially-applied migration is a no-op rather than a second full
-- rewrite.
UPDATE crawl_runs
  SET events_usable = events_found
  WHERE events_usable <> events_found;
