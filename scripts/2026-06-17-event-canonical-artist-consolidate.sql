-- Concert Crawl — event canonical-artist consolidation backfill (issue #608)
--
-- Context: After #617 added `canonical_artist`, we still have ~20+ intra-venue
-- duplicate row clusters where the same physical concert exists as 2–3 rows with
-- artist-string drift ("Ziggy Marley" vs "Ziggy Marley & Stephen Marley", "SHIFT"
-- vs "SHIFT Ft. Lavier" vs "SHIFT ft. Lavier", "BleakHeart" vs "Bleakheart"
-- casing-only, etc). These clusters share a canonical_artist + venue + date.
-- This script consolidates each cluster down to a single winner row and
-- reassigns FK rows (watches, price submissions, etc) from losers to the winner.
--
-- Plan + rollback runbook:
--   docs/superpowers/plans/2026-06-17-canonical-artist-consolidation.md
--   docs/runbooks/canonical-artist-consolidation-rollback.md
--
-- This is Track B of a two-PR slice. Track A (forward-going crawler upsert key
-- swap + partial UNIQUE index) lands AFTER this script runs in prod, because
-- the UNIQUE index would reject the migration with current duplicates present.
--
-- Run against the Neon-branch rehearsal first, then staging, then prod.
-- Connection: Neon (NOT Render — see memory `reference_neon_db_access`).
--
-- Sequence:
--   1. DIAGNOSE   — count + sample clusters before touching anything.
--   2. SNAPSHOT   — copy loser rows into sidecar table for rollback (7-day window).
--   3. DRY-RUN    — emit per-cluster projection of winner + losers + FK counts.
--   4. PAUSE      — operator reviews the dry-run output. To execute: change the
--                   trailing ROLLBACK to COMMIT and re-run.
--   5. REASSIGN   — UPDATE FK rows to point at the winner (race-handled for
--                   user_events; idempotent UPDATE for the rest).
--   6. DELETE     — remove loser rows (CASCADE doesn't fire because FKs are
--                   already reassigned).
--   7. WINNER     — clear first_missing_at + bump last_seen_at on each winner
--                   so #627's stale-detection noise resets cleanly.
--   8. VALIDATE   — assert no surviving duplicates, no orphan FK rows.

------------------------------------------------------------------------
-- 1. DIAGNOSE
------------------------------------------------------------------------
-- Count clusters per venue before any mutation. Run this first by itself —
-- eyeball the output. If it shows clusters at venues you didn't expect, stop
-- and investigate. Aggressive canonicalization (#617 splits on " With ")
-- could produce false clusters (e.g. "Sleeping With Sirens" → "sleeping").

SELECT
  v.name AS venue,
  COUNT(*) FILTER (WHERE cluster_size > 1) AS dup_cluster_count,
  SUM(cluster_size - 1) FILTER (WHERE cluster_size > 1) AS rows_to_consolidate
FROM (
  SELECT
    e.venue_id,
    COUNT(*) OVER (PARTITION BY e.venue_id, e.date, e.canonical_artist) AS cluster_size
  FROM events e
  WHERE e.canonical_artist <> ''
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
-- The REASSIGN section below hard-codes the four FK tables known as of
-- 2026-06-17 (event_reports, price_retrieval_log, price_submissions,
-- user_events). If a new table is added without updating this script,
-- its rows would CASCADE-delete when losers are removed — silently
-- losing data. RAISE EXCEPTION forces an explicit script update.
DO $check_fks$
DECLARE
  unexpected_table text;
BEGIN
  SELECT tc.table_name INTO unexpected_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu USING (constraint_name)
  JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
  WHERE tc.constraint_type = 'FOREIGN KEY'
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
-- DELETE, WINNER, and VALIDATE phases (cheaper than re-window-functioning).
CREATE TEMP TABLE consolidate_clusters AS
WITH ranked AS (
  SELECT
    e.id,
    e.venue_id,
    e.date,
    e.canonical_artist,
    e.confidence_score,
    e.last_seen_at,
    e.updated_at,
    e.verified,
    -- Winner tiebreak (per plan doc, in order):
    --   1. highest confidence_score
    --   2. most recent last_seen_at  (added today — biases toward the row
    --      the current crawler is matching, so post-consolidation #627
    --      doesn't immediately re-flag the winner)
    --   3. most recent updated_at
    --   4. verified = true wins
    --   5. lowest id (stable)
    ROW_NUMBER() OVER (
      PARTITION BY e.venue_id, e.date, e.canonical_artist
      ORDER BY
        e.confidence_score DESC NULLS LAST,
        e.last_seen_at     DESC NULLS LAST,
        e.updated_at       DESC NULLS LAST,
        e.verified         DESC,
        e.id               ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY e.venue_id, e.date, e.canonical_artist) AS cluster_size
  FROM events e
  WHERE e.canonical_artist <> ''
)
SELECT id, venue_id, date, canonical_artist, (rn = 1) AS is_winner, cluster_size
FROM ranked
WHERE cluster_size > 1;

CREATE INDEX ON consolidate_clusters (id);
CREATE INDEX ON consolidate_clusters (venue_id, date, canonical_artist);

-- Sidecar table — survives the transaction. 7-day rollback window.
-- TRUNCATE on re-run so we keep a single canonical pre-consolidation view
-- (re-INSERT during rollback would otherwise fail on events.id PK conflicts).
CREATE TABLE IF NOT EXISTS events_consolidate_608 (LIKE events INCLUDING ALL);
ALTER TABLE events_consolidate_608 ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;
TRUNCATE events_consolidate_608;

INSERT INTO events_consolidate_608
SELECT e.*, NOW()
FROM events e
JOIN consolidate_clusters cc ON cc.id = e.id
WHERE cc.is_winner = false;

------------------------------------------------------------------------
-- 3. DRY-RUN — per-cluster projection for human review
------------------------------------------------------------------------
-- Operator: review this output. Spot-check 5–10 representative clusters
-- (e.g. Ziggy Marley @ Red Rocks 6/24, SHIFT × 3 @ Cervantes 6/18, BleakHeart
-- casing pair @ Hi-Dive 7/10). Confirm winner picks look sane.
WITH winners AS (
  SELECT venue_id, date, canonical_artist, id AS winner_id
  FROM consolidate_clusters
  WHERE is_winner = true
),
losers AS (
  SELECT cc.venue_id, cc.date, cc.canonical_artist, array_agg(cc.id) AS loser_ids
  FROM consolidate_clusters cc
  WHERE cc.is_winner = false
  GROUP BY cc.venue_id, cc.date, cc.canonical_artist
)
SELECT
  v.name AS venue,
  w.date,
  w.canonical_artist,
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
JOIN losers  l USING (venue_id, date, canonical_artist)
JOIN events  e_win ON e_win.id = w.winner_id
JOIN venues  v     ON v.id = w.venue_id
ORDER BY v.name, w.date, w.canonical_artist;

------------------------------------------------------------------------
-- 4. PAUSE — operator reviews dry-run output above.
------------------------------------------------------------------------
-- To execute: change the trailing ROLLBACK at the bottom of this file to
-- COMMIT and re-run. The transaction below mutates only the rows projected
-- in the DRY-RUN output. Re-running with ROLLBACK (default) is safe and
-- idempotent — the sidecar TRUNCATE/INSERT and temp-table CREATE both reset
-- cleanly each time.

------------------------------------------------------------------------
-- 5. REASSIGN — FK rows from losers → winners
------------------------------------------------------------------------

-- 5a. user_events: race-handle (user_id, event_id) unique index conflicts.
-- If user U watched both winner W and loser L, keep whichever user_events
-- row has the more recent created_at (preserves the user's most recent
-- expression of intent).
WITH conflicting AS (
  SELECT
    ue_loser.id          AS loser_row_id,
    ue_loser.created_at  AS loser_created_at,
    ue_winner.id         AS winner_row_id,
    ue_winner.created_at AS winner_created_at
  FROM user_events ue_loser
  JOIN consolidate_clusters cc_loser  ON cc_loser.id  = ue_loser.event_id
                                     AND cc_loser.is_winner = false
  JOIN consolidate_clusters cc_winner ON cc_winner.is_winner = true
                                     AND cc_winner.venue_id = cc_loser.venue_id
                                     AND cc_winner.date     = cc_loser.date
                                     AND cc_winner.canonical_artist = cc_loser.canonical_artist
  JOIN user_events ue_winner          ON ue_winner.event_id = cc_winner.id
                                     AND ue_winner.user_id  = ue_loser.user_id
)
DELETE FROM user_events ue
USING conflicting c
WHERE
  -- Loser row is newer → drop the winner row; the loser row is reassigned next.
  (c.loser_created_at >  c.winner_created_at AND ue.id = c.winner_row_id)
  OR
  -- Winner row is newer (or tied) → drop the loser row; the winner row stays.
  (c.loser_created_at <= c.winner_created_at AND ue.id = c.loser_row_id);

-- Now reassign any surviving loser-pointing rows to the winner.
UPDATE user_events ue
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_artist = cc_loser.canonical_artist
WHERE ue.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

-- 5b. price_submissions, price_retrieval_log, event_reports — no user-uniqueness
-- constraints, plain UPDATE is sufficient.
UPDATE price_submissions ps
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_artist = cc_loser.canonical_artist
WHERE ps.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

UPDATE price_retrieval_log prl
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_artist = cc_loser.canonical_artist
WHERE prl.event_id = cc_loser.id
  AND cc_loser.is_winner = false;

UPDATE event_reports er
SET event_id = cc_winner.id
FROM consolidate_clusters cc_loser
JOIN consolidate_clusters cc_winner
  ON cc_winner.is_winner = true
 AND cc_winner.venue_id = cc_loser.venue_id
 AND cc_winner.date     = cc_loser.date
 AND cc_winner.canonical_artist = cc_loser.canonical_artist
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
-- Clear first_missing_at on winners (the cluster IS seen; #627's false
-- positives reset). Bump last_seen_at to the MAX across all loser rows so
-- the winner inherits the most-recent-seen timestamp from the cluster.
UPDATE events e
SET
  first_missing_at = NULL,
  last_seen_at = GREATEST(
    e.last_seen_at,
    COALESCE(
      (SELECT MAX(ec.last_seen_at)
       FROM events_consolidate_608 ec
       WHERE ec.venue_id          = e.venue_id
         AND ec.date              = e.date
         AND ec.canonical_artist  = e.canonical_artist),
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
  -- 8a. No surviving (venue_id, date, canonical_artist) duplicates
  SELECT COUNT(*) INTO surviving_dups FROM (
    SELECT 1 FROM events
    WHERE canonical_artist <> ''
    GROUP BY venue_id, date, canonical_artist
    HAVING COUNT(*) > 1
  ) dups;
  IF surviving_dups > 0 THEN
    RAISE EXCEPTION 'VALIDATE failed: % (venue_id, date, canonical_artist) clusters still have >1 row', surviving_dups;
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

------------------------------------------------------------------------
-- Final commit gate. ROLLBACK by default; flip to COMMIT to execute.
------------------------------------------------------------------------
ROLLBACK;
-- COMMIT;
