-- Concert Crawl — false-missing orphan cleanup (issue #1122)
--
-- Context: The stale-detection Pass 1 (packages/crawler-core/src/crawl.ts) clears
-- first_missing_at by matching seen events on (venue_id, date, canonical_title).
-- Issue #1053 re-keyed the dedup UNIQUE constraint to
-- (venue_id, date, canonical_artist, show_time), so when a venue republishes a
-- show under a slightly different TITLE (support-act churn, billing reorder, a
-- promoter tagline edit) the crawler upserts it onto the SAME canonical_artist
-- row — but the OLD title-variant row is never re-matched by Pass 1, so its
-- first_missing_at stays stamped. The result: a "missing" row that is a false
-- positive — the show is still being crawled live, just under a sibling row with
-- a different canonical_title.
--
-- This script deletes those false-missing orphans and reassigns their FK rows
-- (watches, price submissions, reports, Spotify alerts) onto the live sibling
-- that is genuinely being crawled. It does NOT touch:
--   * missing rows with NO live sibling (genuinely gone / crawler-depth gaps) —
--     those stay on the admin missing list for human review (see #1122 read-side
--     enrichment + the Fillmore depth issue).
--   * the #1053 dedup consolidation (separate script, already run) — this handles
--     the residual title-variance family that #1053's canonical_artist key leaves
--     behind precisely because the artist genuinely differs.
--
-- Safety: an orphan is only matched to a sibling when there is HEADLINER
-- CONTAINMENT between them — one row's canonical_artist appears as a substring of
-- the other's canonical_title (or vice versa). canonical_* fields are lowercased,
-- so strpos() is case-insensitive; substring containment (not LIKE) avoids
-- wildcard pitfalls on artist names with regex/LIKE metacharacters (e.g.
-- "$uicideboy$", "!!!"). A missing row that merely shares a date with an
-- unrelated live show at the same venue is NOT matched — it falls to admin review.
--
-- Mirrors the rollout pattern from #1053
-- (scripts/2026-07-19-event-canonical-artist-showtime-consolidate.sql): same FK
-- table set, same DRY-RUN/EXECUTE gate, same SNAPSHOT/VALIDATE structure.
--
-- Run against staging first, then prod.
-- Connection: Neon (NOT Render — see memory `reference_neon_db_access`).
--
-- Sequence:
--   1. DIAGNOSE   — count orphans + matched-to-sibling per venue before touching.
--   2. MAP        — build loser→winner map (one deterministic sibling per orphan).
--   3. SNAPSHOT   — copy loser rows into sidecar table for rollback (7-day window).
--   4. DRY-RUN    — emit per-orphan projection of loser + sibling + FK counts.
--   5. PAUSE      — operator reviews. Default mode runs DIAGNOSE + MAP + SNAPSHOT
--                   + DRY-RUN and then ROLLBACKs. To mutate, re-run with:
--                       psql -v DO_EXECUTE=1 ...
--   6. REASSIGN   — UPDATE FK rows loser→sibling (dedup user_events + spotify_alert_log).
--   7. DELETE     — remove loser rows.
--   8. VALIDATE   — assert every mapped loser is gone, no orphan FK rows remain.
--
-- Set DO_EXECUTE default = 0 unless operator already passed it.
\if :{?DO_EXECUTE}
\else
\set DO_EXECUTE 0
\endif

------------------------------------------------------------------------
-- 1. DIAGNOSE
------------------------------------------------------------------------
-- Count false-missing orphans that have an overlap-guarded live sibling,
-- grouped by venue. Run this first by itself — eyeball the output. If it shows
-- orphans at venues you didn't expect, stop and investigate. total_missing is
-- every upcoming row with first_missing_at set (the full admin missing list);
-- matched_orphans is the subset this script will delete.
WITH missing_orphans AS (
  SELECT id, venue_id, date, canonical_title, canonical_artist
  FROM events
  WHERE status = 'upcoming'
    AND first_missing_at IS NOT NULL
    AND date >= (NOW() AT TIME ZONE 'America/Denver')::date
),
matched AS (
  SELECT DISTINCT o.id, o.venue_id
  FROM missing_orphans o
  JOIN events s
    ON s.venue_id = o.venue_id
   AND s.date = o.date
   AND s.status = 'upcoming'
   AND s.first_missing_at IS NULL
   AND s.id <> o.id
   AND o.canonical_artist <> '' AND s.canonical_artist <> ''
   AND o.canonical_title  <> '' AND s.canonical_title  <> ''
   AND ( strpos(s.canonical_title, o.canonical_artist) > 0
      OR strpos(o.canonical_title, s.canonical_artist) > 0 )
)
SELECT
  v.name AS venue,
  (SELECT COUNT(*) FROM missing_orphans mo WHERE mo.venue_id = v.id) AS total_missing,
  COUNT(m.id) AS matched_orphans
FROM matched m
JOIN venues v ON v.id = m.venue_id
GROUP BY v.id, v.name
ORDER BY matched_orphans DESC;

------------------------------------------------------------------------
-- 2 + 3 + 6 + 7 + 8. MAP through VALIDATE
------------------------------------------------------------------------
BEGIN;

------------------------------------------------------------------------
-- 2a. FK sanity check — fail loud if a new FK to events.id appears
------------------------------------------------------------------------
-- Same defensive check as #1053. If a new table referencing events.id is added
-- without updating the REASSIGN section below, its rows would CASCADE-delete
-- when losers are removed — silently losing data. RAISE EXCEPTION forces an
-- explicit script update.
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
      'event_reports', 'price_retrieval_log', 'price_submissions',
      'spotify_alert_log', 'user_events'
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
-- 2b. MAP — one deterministic live sibling per orphan
------------------------------------------------------------------------
-- Each orphan can overlap more than one live sibling (e.g. a multi-show night).
-- Pick exactly ONE target per orphan so FK reassignment never fans out: prefer
-- the most-recently-seen sibling, then lowest id as a stable tiebreak. losers and
-- winners are disjoint by construction (loser: first_missing_at IS NOT NULL;
-- winner: first_missing_at IS NULL) so there are no reassignment cycles.
CREATE TEMP TABLE orphan_map AS
WITH missing_orphans AS (
  SELECT id, venue_id, date, canonical_title, canonical_artist, show_time
  FROM events
  WHERE status = 'upcoming'
    AND first_missing_at IS NOT NULL
    AND date >= (NOW() AT TIME ZONE 'America/Denver')::date
),
candidates AS (
  SELECT
    o.id AS loser_id,
    s.id AS winner_id,
    ROW_NUMBER() OVER (
      PARTITION BY o.id
      -- When an orphan overlaps more than one live sibling (multi-show nights,
      -- a main set + its late-night afters under the same brand), pick the
      -- sibling that is most obviously the SAME show, not merely the most recent:
      --   1. exact canonical_title match — a re-canonicalized copy of the same
      --      event (venue+date already fixed) is unambiguously the right target.
      --   2. same show_time slot — distinguishes a 6 PM main set from its 10 PM
      --      afters when both share a headliner (e.g. "BASS BINGO!" vs
      --      "BASS BINGO AFTERS" on the same night at Larimer).
      --   3. most-recently-seen, then lowest id — stable final tiebreak.
      ORDER BY
        (s.canonical_title = o.canonical_title)          DESC,
        (s.show_time IS NOT DISTINCT FROM o.show_time)    DESC,
        s.last_seen_at DESC NULLS LAST,
        s.id ASC
    ) AS rn
  FROM missing_orphans o
  JOIN events s
    ON s.venue_id = o.venue_id
   AND s.date = o.date
   AND s.status = 'upcoming'
   AND s.first_missing_at IS NULL
   AND s.id <> o.id
   AND o.canonical_artist <> '' AND s.canonical_artist <> ''
   AND o.canonical_title  <> '' AND s.canonical_title  <> ''
   AND ( strpos(s.canonical_title, o.canonical_artist) > 0
      OR strpos(o.canonical_title, s.canonical_artist) > 0 )
)
SELECT loser_id, winner_id
FROM candidates
WHERE rn = 1;

CREATE INDEX ON orphan_map (loser_id);
CREATE INDEX ON orphan_map (winner_id);

-- Unified event→target map: every loser maps to its winner; every winner maps to
-- itself. Used to dedup user-scoped FK tables where a single user may hold rows
-- on multiple losers AND on the winner, all of which collapse to one target row.
CREATE TEMP TABLE event_target AS
SELECT loser_id AS event_id, winner_id AS target_id FROM orphan_map
UNION
SELECT DISTINCT winner_id AS event_id, winner_id AS target_id FROM orphan_map;

CREATE INDEX ON event_target (event_id);
CREATE INDEX ON event_target (target_id);

------------------------------------------------------------------------
-- 3. SNAPSHOT — capture losers in full before any mutation
------------------------------------------------------------------------
-- Sidecar table is the 7-day rollback window — BUT it only persists on a real
-- run (DO_EXECUTE=1 → COMMIT). This DDL/DML runs inside the same BEGIN block as
-- the mutations, so in dry-run mode (DO_EXECUTE=0 → ROLLBACK) the table creation
-- and snapshot insert are rolled back with everything else; nothing survives a
-- dry-run. The snapshot rebuild+INSERT is GATED on orphan_map being non-empty so an
-- accidental DO_EXECUTE=1 re-run after cleanup has completed doesn't wipe the existing
-- window (the loser_count=0 branch leaves any prior sidecar table untouched).
CREATE TABLE IF NOT EXISTS events_missing_orphan_cleanup_1122 (LIKE events INCLUDING ALL);
ALTER TABLE events_missing_orphan_cleanup_1122 ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;
ALTER TABLE events_missing_orphan_cleanup_1122 ADD COLUMN IF NOT EXISTS reassigned_to uuid;

DO $snapshot$
DECLARE
  loser_count int;
BEGIN
  SELECT COUNT(*) INTO loser_count FROM orphan_map;
  IF loser_count = 0 THEN
    RAISE NOTICE 'SNAPSHOT skipped — no matched orphans to capture (re-run after a successful cleanup?). Existing rollback window preserved.';
  ELSE
    -- Recreate the sidecar fresh so its shape always matches the CURRENT events
    -- table. The unconditional CREATE IF NOT EXISTS above may have found a table
    -- left over from an earlier run under a since-changed events schema; the
    -- `SELECT e.*` below would then fail on a column-count/type mismatch. This
    -- branch already discards any prior window (it used to TRUNCATE), so
    -- DROP+CREATE loses nothing extra while guaranteeing the INSERT succeeds.
    DROP TABLE IF EXISTS events_missing_orphan_cleanup_1122;
    CREATE TABLE events_missing_orphan_cleanup_1122 (LIKE events INCLUDING ALL);
    ALTER TABLE events_missing_orphan_cleanup_1122 ADD COLUMN snapshot_at timestamptz;
    ALTER TABLE events_missing_orphan_cleanup_1122 ADD COLUMN reassigned_to uuid;
    INSERT INTO events_missing_orphan_cleanup_1122
    SELECT e.*, NOW(), om.winner_id
    FROM events e
    JOIN orphan_map om ON om.loser_id = e.id;
    RAISE NOTICE 'SNAPSHOT captured % loser rows into events_missing_orphan_cleanup_1122.', loser_count;
  END IF;
END;
$snapshot$;

------------------------------------------------------------------------
-- 4. DRY-RUN — per-orphan projection for human review
------------------------------------------------------------------------
-- Operator: review this output. Spot-check that each loser really is a title
-- variant of its winner (same show, different billing) and not an unrelated show
-- that merely shares a date. FK counts show what gets reassigned.
SELECT
  v.name AS venue,
  e_lose.date,
  e_lose.artist   AS loser_artist,
  e_lose.title    AS loser_title,
  e_win.artist    AS winner_artist,
  e_win.title     AS winner_title,
  (SELECT COUNT(*) FROM user_events         WHERE event_id = om.loser_id) AS user_events_to_reassign,
  (SELECT COUNT(*) FROM spotify_alert_log   WHERE event_id = om.loser_id) AS spotify_alerts_to_reassign,
  (SELECT COUNT(*) FROM price_submissions   WHERE event_id = om.loser_id) AS price_submissions_to_reassign,
  (SELECT COUNT(*) FROM price_retrieval_log WHERE event_id = om.loser_id) AS price_logs_to_reassign,
  (SELECT COUNT(*) FROM event_reports       WHERE event_id = om.loser_id) AS event_reports_to_reassign
FROM orphan_map om
JOIN events e_lose ON e_lose.id = om.loser_id
JOIN events e_win  ON e_win.id  = om.winner_id
JOIN venues v      ON v.id = e_lose.venue_id
ORDER BY v.name, e_lose.date, e_lose.artist;

------------------------------------------------------------------------
-- 5. PAUSE — gate the mutation phases behind DO_EXECUTE
------------------------------------------------------------------------
\if :DO_EXECUTE
\echo 'DO_EXECUTE=1 — running REASSIGN, DELETE, VALIDATE'

------------------------------------------------------------------------
-- 6. REASSIGN — FK rows from losers → winners
------------------------------------------------------------------------

-- 6a. user_events: a UNIQUE (user_id, event_id) index (user_events_user_event_idx)
-- means a user holding rows on multiple losers that map to one winner — or on a
-- loser AND the winner already — would violate uniqueness after reassignment.
-- Dedup first via the event_target map: partition by (user_id, target_id), keep
-- the most recent row (preserves the user's latest expression of intent), delete
-- the rest. Then redirect any surviving loser-pointing rows to the winner.
WITH target_user_rows AS (
  SELECT
    ue.id AS ue_id,
    ROW_NUMBER() OVER (
      PARTITION BY ue.user_id, et.target_id
      ORDER BY ue.created_at DESC, ue.id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY ue.user_id, et.target_id
    ) AS group_size
  FROM user_events ue
  JOIN event_target et ON et.event_id = ue.event_id
)
DELETE FROM user_events ue
USING target_user_rows tur
WHERE ue.id = tur.ue_id
  AND tur.group_size > 1
  AND tur.rn > 1;

UPDATE user_events ue
SET event_id = om.winner_id
FROM orphan_map om
WHERE ue.event_id = om.loser_id;

-- 6b. spotify_alert_log: UNIQUE (user_id, event_id, kind) — same collision shape
-- as user_events, plus the `kind` dimension. Dedup per (user_id, kind, target_id)
-- keeping the most recent (the alert-suppression record whose job is to stop the
-- same user being re-alerted about the same show), then redirect survivors.
WITH target_alert_rows AS (
  SELECT
    sal.id AS sal_id,
    ROW_NUMBER() OVER (
      PARTITION BY sal.user_id, sal.kind, et.target_id
      ORDER BY sal.created_at DESC, sal.id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY sal.user_id, sal.kind, et.target_id
    ) AS group_size
  FROM spotify_alert_log sal
  JOIN event_target et ON et.event_id = sal.event_id
)
DELETE FROM spotify_alert_log sal
USING target_alert_rows tar
WHERE sal.id = tar.sal_id
  AND tar.group_size > 1
  AND tar.rn > 1;

UPDATE spotify_alert_log sal
SET event_id = om.winner_id
FROM orphan_map om
WHERE sal.event_id = om.loser_id;

-- 6c. price_submissions, price_retrieval_log, event_reports — no user-uniqueness
-- constraints, plain UPDATE is sufficient.
UPDATE price_submissions ps
SET event_id = om.winner_id
FROM orphan_map om
WHERE ps.event_id = om.loser_id;

UPDATE price_retrieval_log prl
SET event_id = om.winner_id
FROM orphan_map om
WHERE prl.event_id = om.loser_id;

UPDATE event_reports er
SET event_id = om.winner_id
FROM orphan_map om
WHERE er.event_id = om.loser_id;

------------------------------------------------------------------------
-- 7. DELETE losers
------------------------------------------------------------------------
-- FK rows are reassigned by this point — CASCADE has nothing to chase.
DELETE FROM events e
USING orphan_map om
WHERE e.id = om.loser_id;

------------------------------------------------------------------------
-- 8. VALIDATE — fail loud if anything's off; transaction will then roll back
------------------------------------------------------------------------
DO $validate$
DECLARE
  surviving_losers     int;
  user_events_orphans  int;
  alert_log_orphans    int;
  price_subs_orphans   int;
  price_log_orphans    int;
  reports_orphans      int;
BEGIN
  -- 8a. Every mapped loser row is gone.
  SELECT COUNT(*) INTO surviving_losers
    FROM events e JOIN orphan_map om ON om.loser_id = e.id;
  IF surviving_losers > 0 THEN
    RAISE EXCEPTION 'VALIDATE failed: % mapped loser rows still present', surviving_losers;
  END IF;

  -- 8b. No orphan FK rows in any reassigned table.
  SELECT COUNT(*) INTO user_events_orphans
    FROM user_events ue
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = ue.event_id);
  SELECT COUNT(*) INTO alert_log_orphans
    FROM spotify_alert_log sal
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = sal.event_id);
  SELECT COUNT(*) INTO price_subs_orphans
    FROM price_submissions ps
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = ps.event_id);
  SELECT COUNT(*) INTO price_log_orphans
    FROM price_retrieval_log prl
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = prl.event_id);
  SELECT COUNT(*) INTO reports_orphans
    FROM event_reports er
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = er.event_id);

  IF user_events_orphans + alert_log_orphans + price_subs_orphans + price_log_orphans + reports_orphans > 0 THEN
    RAISE EXCEPTION 'VALIDATE failed: orphan FK rows — user_events:% spotify_alert_log:% price_submissions:% price_retrieval_log:% event_reports:%',
      user_events_orphans, alert_log_orphans, price_subs_orphans, price_log_orphans, reports_orphans;
  END IF;

  RAISE NOTICE 'VALIDATE passed — all mapped losers deleted, no orphan FK rows.';
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
