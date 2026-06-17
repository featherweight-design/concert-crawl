# Canonical-artist consolidation + upsert key swap

**Date:** 2026-06-17
**Issue:** #608 (Track B) + sibling Track A (forward-going prevention)
**Status:** Plan — awaiting user approval before implementation

## Why now

Overnight production crawl (2026-06-17 ~3 AM MT) revealed that PR #627's stale-event detection stamped **265 false-positive `first_missing_at` rows on Red Rocks alone** — real, currently-listed shows (Wynonna Judd & Melissa Etheridge, Yoga on the Rocks × 8 dates, DEADROCKS XII, K-LOVE Live, Stardew Valley Symphony, etc.) got marked missing because the crawler upsert still matches on raw `artist`. When the LLM extracts "Wynonna Judd" but the DB row is stored as "Wynonna Judd & Melissa Etheridge", the upsert misses → `last_seen_at` stays stale → Pass 2 stamps the row missing.

Same root cause produces visible duplicate rows on browse: 20+ intra-venue pairs in one query (Ziggy Marley vs. Ziggy Marley & Stephen Marley at Red Rocks + Cervantes; SHIFT × 3 variants at Cervantes; BleakHeart vs. Bleakheart casing drift; etc.).

**Until consolidation + upsert-key swap lands, the Admin > Events Missing tab cannot ship** — it would cry wolf every night for every multi-artist show.

## Slicing — two PRs

Backfill MUST land first because the UNIQUE index in Track A will reject the migration if any duplicate `(venue_id, date, canonical_artist)` triples exist.

### Track B — One-time backfill (this branch, lands first)

Branch: `chore/event-canonical-artist-consolidate`
Issue: #608

**Deliverable:** `scripts/2026-06-17-event-canonical-artist-consolidate.sql` — runbook-style SQL following the `2026-06-16-event-date-utc-backfill.sql` convention (DIAGNOSE → SNAPSHOT → REASSIGN → DELETE → VALIDATE inside a single transaction).

### Track A — Forward-going prevention (follow-up branch)

Branch: `feat/canonical-artist-upsert-key` (created after Track B merges + runs in prod)

**Deliverable:**
1. Migration `0034_event_canonical_artist_unique.sql` — add partial UNIQUE index `(venue_id, date, canonical_artist) WHERE status = 'upcoming'`
2. `packages/crawler-core/src/crawl.ts` — swap upsert target from `[events.venueId, events.date, events.artist]` → `[events.venueId, events.date, events.canonicalArtist]`. Also update the `eventsToUpsert` filter map key from `${e.artist}|${e.date}` → `${canonicalize(e.artist)}|${e.date}`.
3. Update crawler integration test to assert two extractions ("Wynonna Judd" then "Wynonna Judd & Melissa Etheridge") on the same date collapse to a single row.

## Track B — full design

### 1. DIAGNOSE

Identify clusters of duplicate rows (same `venue_id`, `date`, `canonical_artist`) with cardinality > 1.

```sql
SELECT
  v.name AS venue,
  e.canonical_artist,
  e.date,
  COUNT(*) AS row_count,
  array_agg(DISTINCT e.artist) AS artist_variants,
  array_agg(e.id) AS event_ids
FROM events e
JOIN venues v ON v.id = e.venue_id
WHERE e.canonical_artist <> ''
GROUP BY v.id, v.name, e.canonical_artist, e.date
HAVING COUNT(*) > 1
ORDER BY v.name, e.date;
```

Eyeball the output — confirm cluster boundaries look right, no legitimate "Beach House + Beach House Boys" pairs collapsing on overly-aggressive canonicalization.

### 2. SNAPSHOT

Create sidecar table `events_consolidate_608` containing every loser row in full (including all columns) before any mutation. Pre-existing snapshot tables are TRUNCATEd if the script is re-run so we always have a single canonical pre-consolidation view.

```sql
CREATE TABLE IF NOT EXISTS events_consolidate_608 AS
SELECT *, NOW() AS snapshot_at FROM events WHERE FALSE;
TRUNCATE events_consolidate_608;

-- Materialize the cluster + winner choice into a temp table
CREATE TEMP TABLE consolidate_clusters AS
WITH ranked AS (
  SELECT
    e.id,
    e.venue_id,
    e.date,
    e.canonical_artist,
    e.confidence_score,
    e.updated_at,
    e.verified,
    e.last_seen_at,
    -- Winner-selection tiebreak (in order):
    --   1. highest confidence_score
    --   2. most recent last_seen_at  ← added per today's discussion
    --   3. most recent updated_at
    --   4. verified = true wins
    --   5. lowest id (stable)
    ROW_NUMBER() OVER (
      PARTITION BY e.venue_id, e.date, e.canonical_artist
      ORDER BY
        e.confidence_score DESC NULLS LAST,
        e.last_seen_at DESC NULLS LAST,
        e.updated_at DESC NULLS LAST,
        e.verified DESC,
        e.id ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY e.venue_id, e.date, e.canonical_artist) AS cluster_size
  FROM events e
  WHERE e.canonical_artist <> ''
)
SELECT id, venue_id, date, canonical_artist,
       (rn = 1) AS is_winner,
       cluster_size
FROM ranked
WHERE cluster_size > 1;

-- Snapshot the losers in full
INSERT INTO events_consolidate_608
SELECT e.*, NOW()
FROM events e
JOIN consolidate_clusters cc ON cc.id = e.id
WHERE cc.is_winner = false;
```

### 3. DRY-RUN reporting (pre-COMMIT review)

Emit a per-cluster CSV-ish projection before any mutation. **The script halts here for explicit human review** — admin spot-checks 5–10 representative clusters (e.g. Ziggy Marley @ Red Rocks 6/24, SHIFT × 3 @ Cervantes 6/18, BleakHeart casing pair @ Hi-Dive 7/10, Connor Price @ Cervantes + Mission 6/26) and confirms winner-picks look sensible. Only then are the REASSIGN + DELETE blocks uncommented + the transaction COMMITted.

```sql
SELECT
  v.name AS venue,
  cc.date,
  cc.canonical_artist,
  cc.cluster_size,
  (SELECT id FROM consolidate_clusters WHERE venue_id = cc.venue_id AND date = cc.date AND canonical_artist = cc.canonical_artist AND is_winner) AS winner_id,
  array_agg(cc.id) FILTER (WHERE NOT cc.is_winner) AS loser_ids,
  (SELECT COUNT(*) FROM user_events WHERE event_id = ANY(array_agg(cc.id) FILTER (WHERE NOT cc.is_winner))) AS user_events_affected,
  (SELECT COUNT(*) FROM price_submissions WHERE event_id = ANY(array_agg(cc.id) FILTER (WHERE NOT cc.is_winner))) AS price_submissions_affected,
  (SELECT COUNT(*) FROM price_retrieval_log WHERE event_id = ANY(array_agg(cc.id) FILTER (WHERE NOT cc.is_winner))) AS price_logs_affected,
  (SELECT COUNT(*) FROM event_reports WHERE event_id = ANY(array_agg(cc.id) FILTER (WHERE NOT cc.is_winner))) AS event_reports_affected
FROM consolidate_clusters cc
JOIN venues v ON v.id = cc.venue_id
GROUP BY v.name, cc.venue_id, cc.date, cc.canonical_artist, cc.cluster_size
ORDER BY v.name, cc.date;
```

### 4. REASSIGN foreign-key rows

**FK enumeration confirmed via `information_schema` (staging, 2026-06-17):**

| Table              | Column     | Delete rule | Notes                                            |
| ------------------ | ---------- | ----------- | ------------------------------------------------ |
| `event_reports`    | `event_id` | CASCADE     | Sold-out reports (#628). Must reassign FIRST.    |
| `price_retrieval_log` | `event_id` | CASCADE  | Price-pipeline log entries.                      |
| `price_submissions` | `event_id` | CASCADE   | Community price submissions.                     |
| `user_events`      | `event_id` | CASCADE     | Watch state. Critical — losing this loses user data. |

**Critical:** because every FK has `ON DELETE CASCADE`, the REASSIGN phase MUST run before the DELETE phase. The script will enumerate FKs again at runtime via:

```sql
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name)
JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'events'
  AND ccu.column_name = 'id';
```

If new FK tables appear after this plan is written, the dry-run output exposes the discrepancy (new column with non-zero count). RAISE EXCEPTION if any FK table is found that this plan doesn't pre-confirm.

**Reassignment per table:**

```sql
-- user_events: race for the (user_id, event_id) PK. If user has watched both
-- winner and loser, keep whichever watch row has the more recent created_at
-- (preserves the user's most recent expression of intent).
WITH conflicting AS (
  SELECT
    ue_loser.user_id,
    ue_loser.event_id   AS loser_event_id,
    ue_loser.created_at AS loser_created_at,
    ue_winner.event_id  AS winner_event_id,
    ue_winner.created_at AS winner_created_at
  FROM user_events ue_loser
  JOIN consolidate_clusters loser  ON loser.id  = ue_loser.event_id  AND loser.is_winner  = false
  JOIN consolidate_clusters winner ON winner.is_winner = true
                                  AND winner.venue_id = loser.venue_id
                                  AND winner.date     = loser.date
                                  AND winner.canonical_artist = loser.canonical_artist
  JOIN user_events ue_winner       ON ue_winner.event_id = winner.id
                                  AND ue_winner.user_id  = ue_loser.user_id
)
DELETE FROM user_events ue
USING conflicting c
WHERE ue.user_id = c.user_id
  AND (
    -- Loser is newer → drop the winner's row; the loser's row will be UPDATEd next
    (c.loser_created_at >  c.winner_created_at AND ue.event_id = c.winner_event_id) OR
    -- Winner is newer (or tied) → drop the loser's row; the winner's row stays
    (c.loser_created_at <= c.winner_created_at AND ue.event_id = c.loser_event_id)
  );

-- Reassign any remaining loser-pointing rows to the winner.
UPDATE user_events ue
SET event_id = winner.id
FROM consolidate_clusters loser, consolidate_clusters winner
WHERE ue.event_id = loser.id
  AND loser.is_winner = false
  AND winner.is_winner = true
  AND winner.venue_id = loser.venue_id
  AND winner.date = loser.date
  AND winner.canonical_artist = loser.canonical_artist;
```

Repeat the same idempotent UPDATE pattern for `price_submissions`, `price_retrieval_log`, `event_reports` — none of those have user-uniqueness constraints so the race-handling delete isn't needed.

### 5. DELETE losers + RESET WINNER STALE-DETECTION

After all FKs reassigned, delete loser rows. Then clear the winner's `first_missing_at` because the cluster IS seen (and the noise from #627 should reset).

```sql
DELETE FROM events e
USING consolidate_clusters cc
WHERE e.id = cc.id AND cc.is_winner = false;

UPDATE events e
SET first_missing_at = NULL,
    last_seen_at = GREATEST(
      e.last_seen_at,
      (SELECT MAX(last_seen_at) FROM events_consolidate_608 ec
       WHERE ec.venue_id = e.venue_id
         AND ec.date = e.date
         AND ec.canonical_artist = e.canonical_artist)
    )
FROM consolidate_clusters cc
WHERE e.id = cc.id AND cc.is_winner = true;
```

### 6. VALIDATE

Inside the same transaction, before COMMIT:

```sql
-- Should return 0
SELECT venue_id, date, canonical_artist, COUNT(*)
FROM events
WHERE canonical_artist <> ''
GROUP BY venue_id, date, canonical_artist
HAVING COUNT(*) > 1;

-- Should be 0 — no orphans in any FK table
SELECT 'user_events' AS table_name, COUNT(*) FROM user_events ue
  WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = ue.event_id)
UNION ALL SELECT 'price_submissions', COUNT(*) FROM price_submissions ps
  WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = ps.event_id)
UNION ALL SELECT 'price_retrieval_log', COUNT(*) FROM price_retrieval_log prl
  WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = prl.event_id)
UNION ALL SELECT 'event_reports', COUNT(*) FROM event_reports er
  WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = er.event_id);

-- Spot check: Red Rocks 2026-06-24 should be ONE Ziggy Marley row
SELECT e.id, e.title, e.artist, e.canonical_artist
FROM events e JOIN venues v ON v.id = e.venue_id
WHERE v.name = 'Red Rocks Amphitheatre'
  AND e.date = '2026-06-24'
  AND e.canonical_artist = 'ziggy marley';
```

If all three checks pass: `COMMIT`. If anything looks off: `ROLLBACK` and the snapshot is intact for analysis.

### 7. ROLLBACK runbook (separate file in PR — required)

`docs/runbooks/canonical-artist-consolidation-rollback.md` ships in this PR alongside the script. Sections:

1. **Detection signals**: user reports "watched show disappeared from my list"; admin observes orphaned UI state; new `first_missing_at` count spikes again post-consolidation.
2. **Pre-flight checks** before attempting rollback: confirm `events_consolidate_608` table exists in the target DB; query its row count to confirm the snapshot was captured; verify no Track A migration has run yet (the UNIQUE index would block the re-INSERT).
3. **Restore procedure**: re-INSERT the loser rows from the snapshot table; re-create FK rows that were reassigned. Caveat: rows edited via the admin UI between consolidation and rollback may not restore cleanly — the runbook documents the conflict-handling SQL.
4. **Rollback window**: 7 days. After 7 days the `events_consolidate_608` table is dropped manually (separate ops task). This is long enough to catch slow-burn user reports while avoiding indefinite sidecar growth.
5. **What rollback CAN'T fix**: if the same crawl-night runs between consolidation and rollback, the crawler may have written `last_seen_at` / `first_missing_at` against the consolidated rows. Rollback restores the topology but those crawler-side timestamps stay current.

## Sequencing (each environment)

The 24h soak in the prior draft was overkill — VALIDATE inside the transaction already catches orphans, dup survivors, and FK breakage. Instead: ephemeral Neon branch off staging gives a free risk-free rehearsal, and a post-execute smoke check on real staging substitutes for the soak.

1. Open Track B PR → review + merge to main
2. **Dry-run rehearsal on a Neon branch off staging** (not local — the June 15 dump in `~/concert-crawl-migration/` predates #617's `canonical_artist` column; a branch is a COW snapshot of *current* staging including all 20+ live dup clusters):
   - Create branch via `mcp__neon__create_branch` from `br-fancy-meadow-a67wo70v`
   - Run script through DIAGNOSE + DRY-RUN phases
   - **Pause for human review**: emit the cluster CSV; admin spot-checks ~5–10 representative clusters (e.g. Ziggy Marley @ Red Rocks, SHIFT × 3 @ Cervantes, BleakHeart casing pair @ Hi-Dive) — confirm winner picks are sane before authorizing execute
   - On approval: run REASSIGN + DELETE + VALIDATE in the same transaction
   - Drop the branch
3. **Staging**: same script, with the dry-run pause repeated against live staging clusters. Admin approves. Execute. VALIDATE in-transaction. COMMIT.
4. **30-minute smoke check on staging**: spot-check via admin UI that (a) ~5 known dup clusters now show single rows, (b) a known watched show still appears in the watcher's list, (c) `first_missing_at` count drops dramatically.
5. **Open Track A PR** — the migration that adds the UNIQUE index will succeed because dups are gone
6. **Prod**: same dry-run → admin review → execute → VALIDATE → deploy Track A → 30-minute smoke check
7. **Verify**: next-day crawl on prod stamps `first_missing_at` on far fewer rows (target: < 20 actually-disappeared events, not 265 false positives)

## Risks + mitigations

| Risk                                          | Mitigation                                                    |
| --------------------------------------------- | ------------------------------------------------------------- |
| Aggressive canonicalization collapses distinct artists | Dry-run CSV inspection before COMMIT                  |
| Watch state lost                              | Idempotent reassignment with race-handling delete             |
| FK table we didn't enumerate                  | Runtime info_schema query + RAISE EXCEPTION on unknown table  |
| Re-running script double-consolidates         | Already-canonical clusters have `cluster_size = 1`, no-op    |
| Track A migration fails mid-deploy            | Track B runs to completion first — index applies cleanly      |
| User-reported issue post-COMMIT               | 7-day snapshot table (`events_consolidate_608`) + rollback runbook |

## Acceptance

- [ ] `scripts/2026-06-17-event-canonical-artist-consolidate.sql` follows the runbook convention with DIAGNOSE / SNAPSHOT / DRY-RUN / REASSIGN / DELETE / VALIDATE phases inside a single transaction
- [ ] `docs/runbooks/canonical-artist-consolidation-rollback.md` accompanies the script
- [ ] FK enumeration done at runtime via `information_schema`; plan doc has the current confirmed list
- [ ] Dry-run halts for explicit human review of 5–10 representative clusters
- [ ] Neon-branch rehearsal succeeds before touching staging
- [ ] Staging executed + 30-minute smoke check before prod
- [ ] Track A queued behind this

## Out of scope (deliberate)

- Track A's crawler upsert change (separate PR — sequencing is the only reason it's not in this branch)
- Improvements to `canonicalize()` itself (#617's known edge case: "Sleeping With Sirens: An Ending In Itself Tour" → "sleeping" splits on " With ")
- Cross-venue duplication (different venues, same canonical_artist + date — that's the #615 cross-venue filter's domain, working as of post-2026-06-16 deploy)
- Backfill of historical `first_missing_at` rows that were false positives — they'll get cleared by step 5 of the script for any winner row, and lingering FPs on rows that don't have a duplicate are < 1% of total (zero hits on the spot-check)
