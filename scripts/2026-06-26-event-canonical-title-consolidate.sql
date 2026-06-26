-- Concert Crawl — event canonical-title consolidation backfill (issue #821)
--
-- Context: PR #822 added `canonical_title` to events. Prod has ~71 intra-venue
-- duplicate row clusters (47% dupe rate on hidden events, 11% on visible) where
-- the same physical listing exists as 2-6 rows because the LLM extracted
-- different `artist` substrings from the same compound title across crawl
-- runs (e.g. "BPM BINGO!" / "Dombresky" / "Dombresky / Walker & Royce" — same
-- listing, six rows). Each variant produced a different canonical_artist and
-- missed the ON CONFLICT target.
--
-- These clusters share canonical_title + venue + date. This script consolidates
-- each cluster down to a single winner row and reassigns FK rows (watches,
-- price submissions, etc) from losers to the winner. After this runs in an
-- environment, the follow-up schema-swap PR can safely add the partial UNIQUE
-- on (venue_id, date, canonical_title) WHERE status='upcoming'.
--
-- Mirrors the rollout pattern from #608 (canonical_artist consolidation,
-- scripts/2026-06-17-event-canonical-artist-consolidate.sql). Same FK table
-- set, same DRY-RUN/EXECUTE gate, same SNAPSHOT/VALIDATE structure.
--
-- Run against the Neon-branch rehearsal first, then staging, then prod.
-- Connection: Neon (NOT Render — see memory `reference_neon_db_access`).
--
-- Sequence:
--   1. DIAGNOSE   — count + sample clusters before touching anything.
--   2. SNAPSHOT   — copy loser rows into sidecar table for rollback (7-day window).
--   3. DRY-RUN    — emit per-cluster projection of winner + losers + FK counts.
--   4. PAUSE      — operator reviews the dry-run output. By default the script
--                   ONLY runs DIAGNOSE + SNAPSHOT + DRY-RUN and then ROLLBACKs.
--                   To actually mutate, the operator re-runs with:
--                       psql -v DO_EXECUTE=1 ...
--                   That flag gates the REASSIGN / DELETE / WINNER blocks via
--                   psql `\if`, so a default-mode dry-run never takes the
--                   row-level locks the mutation phases would.
--   5. REASSIGN   — UPDATE FK rows to point at the winner (race-handled for
--                   user_events; idempotent UPDATE for the rest).
--   6. DELETE     — remove loser rows (CASCADE doesn't fire because FKs are
--                   already reassigned).
--   7. WINNER     — clear first_missing_at + bump last_seen_at on each winner
--                   so #627's stale-detection noise resets cleanly.
--   8. VALIDATE   — assert no surviving duplicates, no orphan FK rows.
--
-- Set DO_EXECUTE default = 0 unless operator already passed it.
\if :{?DO_EXECUTE}
\else
\set DO_EXECUTE 0
\endif

------------------------------------------------------------------------
-- 1. DIAGNOSE
------------------------------------------------------------------------
-- Count clusters per venue before any mutation. Run this first by itself —
-- eyeball the output. If it shows clusters at venues you didn't expect,
-- stop and investigate. canonical_title is conservative (no separator split),
-- but a careless title-only rule could over-merge — sanity check the count
-- against the prod audit numbers in #821.
--
-- Restricted to status='upcoming' to match the partial UNIQUE index's
-- predicate. Cancelled/postponed rows sit outside the UNIQUE constraint by
-- design (relists at the same venue/date produce a new upcoming row
-- alongside the cancelled one) — merging them with upcoming relists would
-- silently delete admin status overrides.

SELECT
  v.name AS venue,
  COUNT(*) FILTER (WHERE cluster_size > 1) AS dup_cluster_count,
  SUM(cluster_size - 1) FILTER (WHERE cluster_size > 1) AS rows_to_consolidate
FROM (
  SELECT
    e.venue_id,
    COUNT(*) OVER (PARTITION BY e.venue_id, e.date, e.canonical_title) AS cluster_size
  FROM events e
  WHERE e.canonical_title <> ''
    AND e.status = 'upcoming'
) clustered
JOIN venues v ON v.id = clustered.venue_id
GROUP BY v.id, v.name
HAVING COUNT(*) FILTER (WHERE cluster_size > 1) > 0
ORDER BY rows_to_consolidate DESC;

------------------------------------------------------------------------
-- 2 + 3 + 5 + 6 + 7 + 8. SNAPSHOT through VALIDATE
------------------------------------------------------------------------
BEGIN;

------------------------------------------------------------------------
-- 2a. FK sanity check — fail loud if a new FK to events.id appears
------------------------------------------------------------------------
-- Same defensive check as #608. If a new table is added without updating
-- the REASSIGN section below, its rows would CASCADE-delete when losers are
-- removed — silently losing data. RAISE EXCEPTION forces an explicit
-- script update.
--
-- Joins include constraint_schema so the check stays correct in multi-schema
-- DBs where the same constraint_name can appear in different schemas.
-- Restricted to public schema since that's where all Concert Crawl tables
-- live.
DO $check_fks$
DECLARE
  unexpected_table text;
BEGIN
  SELECT tc.table_name INTO unexpected_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_schema = tc.constraint_schema
   AND kcu.constraint_name   = tc.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_schema = tc.constraint_schema
   AND ccu.constraint_name   = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_schema = 'public'
    AND ccu.table_schema = 'public'
    AND ccu.table_name = 'events'
    AND ccu.column_name = 'id'
    AND tc.table_name NOT IN (
      'event_reports', 'price_retrieval_log', 'price_submissions', 'user_events'
    )
  LIMIT 1;

  IF unexpected_table IS NOT NULL THEN
    RAISE EXCEPTION
      'Unexpected FK table referencing events.id: %. Update REASSIGN section before running.',
      unexpected_table;
  END IF;
END;
$check_fks$;

------------------------------------------------------------------------
-- 2b. SNAPSHOT — capture losers in full before any mutation
------------------------------------------------------------------------
-- Materialize the cluster + winner choice once. Reused by SNAPSHOT, REASSIGN,
-- DELETE, WINNER, and VALIDATE phases.
CREATE TEMP TABLE consolidate_clusters AS
WITH ranked AS (
  SELECT
    e.id,
    e.venue_id,
    e.date,
    e.canonical_title,
    e.confidence_score,
    e.last_seen_at,
    e.updated_at,
    e.verified,
    -- Winner tiebreak (same order as #608, intentionally consistent so the
    -- script behavior matches operator's mental model from prior runs):
    --   1. highest confidence_score
    --   2. most recent last_seen_at  (biases toward the row the current
    --      crawler is matching, so post-consolidation #627 doesn't
    --      immediately re-flag the winner)
    --   3. most recent updated_at
    --   4. verified = true wins
    --   5. lowest id (stable)
    ROW_NUMBER() OVER (
      PARTITION BY e.venue_id, e.date, e.canonical_title
      ORDER BY
        e.confidence_score DESC NULLS LAST,
        e.last_seen_at     DESC NULLS LAST,
        e.updated_at       DESC NULLS LAST,
        e.verified         DESC,
        e.id               ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY e.venue_id, e.date, e.canonical_title) AS cluster_size
  FROM events e
  WHERE e.canonical_title <> ''
    -- Scope to the partial UNIQUE index's predicate. Cancelled/postponed
    -- rows sit outside the constraint by design (admin status override +
    -- upcoming relist case) and must not be touched by consolidation.
    AND e.status = 'upcoming'
)
SELECT id, venue_id, date, canonical_title, (rn = 1) AS is_winner, cluster_size
FROM ranked
WHERE cluster_size > 1;

CREATE INDEX ON consolidate_clusters (id);
CREATE INDEX ON consolidate_clusters (venue_id, date, canonical_title);

-- Sidecar table — survives the transaction. 7-day rollback window.
-- TRUNCATE+INSERT is GATED on `consolidate_clusters` being non-empty so an
-- accidental DO_EXECUTE=1 re-run after consolidation has already completed
-- doesn't silently wipe the existing rollback window. The DO block reads
-- the cluster count once and skips the snapshot work entirely if there are
-- no losers to capture.
CREATE TABLE IF NOT EXISTS events_consolidate_821 (LIKE events INCLUDING ALL);
ALTER TABLE events_consolidate_821 ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

DO $snapshot$
DECLARE
  loser_count int;
BEGIN
  SELECT COUNT(*) INTO loser_count FROM consolidate_clusters WHERE is_winner = false;
  IF loser_count = 0 THEN
    RAISE NOTICE 'SNAPSHOT skipped — no duplicate clusters to capture (re-run after a successful consolidation?). Existing events_consolidate_821 rollback window preserved.';
  ELSE
    TRUNCATE events_consolidate_821;
    INSERT INTO events_consolidate_821
    SELECT e.*, NOW()
    FROM events e
    JOIN consolidate_clusters cc ON cc.id = e.id
    WHERE cc.is_winner = false;
    RAISE NOTICE 'SNAPSHOT captured % loser rows into events_consolidate_821.', loser_count;
  END IF;
END;
$snapshot$;

------------------------------------------------------------------------
-- 3. DRY-RUN — per-cluster projection for human review
------------------------------------------------------------------------
-- Operator: review this output. Spot-check 5–10 representative clusters
-- (e.g. BPM BINGO! Dombresky @ Larimer 7/31, Yoga on the Rocks × 16
-- @ Red Rocks across Saturdays, Sublime/Slightly Stoopid/311 @ Cervantes
-- 8/7). Confirm winner picks look sane — the most-verified, most-recently-
-- seen row should win each cluster.
WITH winners AS (
  SELECT venue_id, date, canonical_title, id AS winner_id
  FROM consolidate_clusters
  WHERE is_winner = true
),
losers AS (
  SELECT cc.venue_id, cc.date, cc.canonical_title, array_agg(cc.id) AS loser_ids
  FROM consolidate_clusters cc
  WHERE cc.is_winner = false
  GROUP BY cc.venue_id, cc.date, cc.canonical_title
)
SELECT
  v.name AS venue,
  w.date,
  w.canonical_title,
  cardinality(l.loser_ids) + 1 AS cluster_size,
  e_win.title    AS winner_title,
  e_win.artist   AS winner_artist,
  e_win.verified AS winner_verified,
  e_win.confidence_score AS winner_confidence,
  (SELECT array_agg(format('%s (%s)', e.artist, e.title) ORDER BY e.id)
   FROM events e WHERE e.id = ANY(l.loser_ids)) AS loser_summaries,
  (SELECT COUNT(*) FROM user_events         WHERE event_id = ANY(l.loser_ids)) AS user_events_to_reassign,
  (SELECT COUNT(*) FROM price_submissions   WHERE event_id = ANY(l.loser_ids)) AS price_submissions_to_reassign,
  (SELECT COUNT(*) FROM price_retrieval_log WHERE event_id = ANY(l.loser_ids)) AS price_logs_to_reassign,
  (SELECT COUNT(*) FROM event_reports       WHERE event_id = ANY(l.loser_ids)) AS event_reports_to_reassign
FROM winners w
JOIN losers  l USING (venue_id, date, canonical_title)
JOIN events  e_win ON e_win.id = w.winner_id
JOIN venues  v     ON v.id = w.venue_id
ORDER BY v.name, w.date, w.canonical_title;

------------------------------------------------------------------------
-- 4. PAUSE — gate the mutation phases behind DO_EXECUTE
------------------------------------------------------------------------
\if :DO_EXECUTE
\echo 'DO_EXECUTE=1 — running REASSIGN, DELETE, WINNER, VALIDATE'

------------------------------------------------------------------------
-- 5. REASSIGN — FK rows from losers → winners
------------------------------------------------------------------------

-- 5a. user_events: per (user_id, cluster), there may be multiple rows.
-- After consolidation only ONE row per (user_id, winner_id) can exist
-- because of the user_events_user_event_idx UNIQUE index.
--
-- Strategy: for each (user_id, cluster), keep the user_events row with
-- the most recent created_at (preserves the user's most recent expression
-- of intent) and delete the rest. Then any surviving loser-pointing rows
-- get UPDATEd to point at the winner.
--
-- Window function keyed by (user_id, venue_id, date, canonical_title) so
-- the dedup composes correctly for clusters of any size.
WITH cluster_user_rows AS (
  SELECT
    ue.id AS ue_id,
    ROW_NUMBER() OVER (
      PARTITION BY ue.user_id, cc.venue_id, cc.date, cc.canonical_title
      ORDER BY ue.created_at DESC, ue.id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY ue.user_id, cc.venue_id, cc.date, cc.canonical_title
    ) AS group_size
  FROM user_events ue
  JOIN consolidate_clusters cc ON cc.id = ue.event_id
)
DELETE FROM user_events ue
USING cluster_user_rows cur
WHERE ue.id = cur.ue_id
  AND cur.group_size > 1
  AND cur.rn > 1;

-- Route any surviving loser-pointing rows to the winner. After the dedup
-- above, at most one user_events row per (user_id, cluster) remains; if it
-- points at a loser, redirect it to the winner.
UPDATE user_events ue
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_title = cc_loser.canonical_title
WHERE ue.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

-- 5b. price_submissions, price_retrieval_log, event_reports — no
-- user-uniqueness constraints, plain UPDATE is sufficient.
UPDATE price_submissions ps
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_title = cc_loser.canonical_title
WHERE ps.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

UPDATE price_retrieval_log prl
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_title = cc_loser.canonical_title
WHERE prl.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

UPDATE event_reports er
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_title = cc_loser.canonical_title
WHERE er.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

------------------------------------------------------------------------
-- 6. DELETE losers
------------------------------------------------------------------------
-- FK rows are reassigned by this point — CASCADE has nothing to chase.
DELETE FROM events e
USING consolidate_clusters cc
WHERE e.id = cc.id AND cc.is_winner = false;

------------------------------------------------------------------------
-- 7. WINNER — reset stale-detection noise + adopt max last_seen_at
------------------------------------------------------------------------
-- Clear first_missing_at on winners (the cluster IS seen). Bump
-- last_seen_at to the MAX across all loser rows so the winner inherits
-- the most-recent-seen timestamp from the cluster.
UPDATE events e
SET
  first_missing_at = NULL,
  last_seen_at = GREATEST(
    e.last_seen_at,
    COALESCE(
      (SELECT MAX(ec.last_seen_at)
       FROM events_consolidate_821 ec
       WHERE ec.venue_id        = e.venue_id
         AND ec.date            = e.date
         AND ec.canonical_title = e.canonical_title),
      e.last_seen_at
    )
  )
FROM consolidate_clusters cc
WHERE e.id = cc.id AND cc.is_winner = true;

------------------------------------------------------------------------
-- 8. VALIDATE — fail loud if anything's off; transaction will then roll back
------------------------------------------------------------------------
DO $validate$
DECLARE
  surviving_dups       int;
  user_events_orphans  int;
  price_subs_orphans   int;
  price_log_orphans    int;
  reports_orphans      int;
BEGIN
  -- 8a. No surviving (venue_id, date, canonical_title) duplicates among
  -- status='upcoming' rows. Non-upcoming rows (cancelled, postponed) sit
  -- outside the future UNIQUE index's predicate so we don't validate them.
  SELECT COUNT(*) INTO surviving_dups FROM (
    SELECT 1 FROM events
    WHERE canonical_title <> ''
      AND status = 'upcoming'
    GROUP BY venue_id, date, canonical_title
    HAVING COUNT(*) > 1
  ) dups;
  IF surviving_dups > 0 THEN
    RAISE EXCEPTION 'VALIDATE failed: % (venue_id, date, canonical_title) clusters still have >1 row', surviving_dups;
  END IF;

  -- 8b. No orphan FK rows in any reassigned table
  SELECT COUNT(*) INTO user_events_orphans
    FROM user_events ue
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = ue.event_id);
  SELECT COUNT(*) INTO price_subs_orphans
    FROM price_submissions ps
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = ps.event_id);
  SELECT COUNT(*) INTO price_log_orphans
    FROM price_retrieval_log prl
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = prl.event_id);
  SELECT COUNT(*) INTO reports_orphans
    FROM event_reports er
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = er.event_id);

  IF user_events_orphans + price_subs_orphans + price_log_orphans + reports_orphans > 0 THEN
    RAISE EXCEPTION 'VALIDATE failed: orphan FK rows — user_events:% price_submissions:% price_retrieval_log:% event_reports:%',
      user_events_orphans, price_subs_orphans, price_log_orphans, reports_orphans;
  END IF;

  RAISE NOTICE 'VALIDATE passed — no surviving duplicates, no orphan FK rows.';
END;
$validate$;

\else
\echo 'DO_EXECUTE not set (or 0) — dry-run mode. No row locks held on shared tables.'
\echo 'To execute: re-run with `psql -v DO_EXECUTE=1 ...`'
\endif

------------------------------------------------------------------------
-- Final commit gate. COMMIT only when DO_EXECUTE=1; otherwise ROLLBACK.
------------------------------------------------------------------------
\if :DO_EXECUTE
COMMIT;
\else
ROLLBACK;
\endif
