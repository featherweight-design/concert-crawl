# Canonical-artist consolidation rollback runbook

**When to use this:** The `scripts/2026-06-17-event-canonical-artist-consolidate.sql` script committed in a target environment (staging or prod) and we now suspect it consolidated something incorrectly — user reports a watched show disappeared, admin sees orphan UI state, or `first_missing_at` count spikes again unexpectedly.

**Paired with:** `scripts/2026-06-17-event-canonical-artist-consolidate.sql`, `docs/superpowers/plans/2026-06-17-canonical-artist-consolidation.md`

---

## 0 — Stop the bleeding first

Before touching the DB, reduce inbound pressure:

1. **Suspend the crawler crons** — Render dashboard, pause both `concert-crawl-crawler-triggers` and `concert-crawl-crawler-daily`. A crawl mid-rollback could refresh `last_seen_at` on rows that are about to be re-INSERTed, leaving the topology consistent but the timestamps misleading.
2. **API stays up.** Unlike a schema rollback, this script only mutates rows — the API doesn't need to come down. Watch state will appear momentarily inconsistent during the restore but resolves once the script completes.

---

## 1 — Detection signals

You're probably here because of one of these:

| Signal | What it means |
|---|---|
| User reports "my watched show disappeared" | A `user_events` reassignment dropped or mis-routed their row |
| Admin sees an event flagged in inspector that has no recent crawl history | A loser was selected as winner — wrong winner-pick |
| `first_missing_at` count climbs back into the hundreds | Track A hasn't deployed yet AND the winner row's artist string still drifts |
| `events_consolidate_608` row count = 0 | The script's SNAPSHOT ran but was never INSERTed (operator ran with empty cluster set — nothing to roll back) |

If the signal is **just** "first_missing_at count climbing again," that's NOT a consolidation problem — it's the Track A gap. Ship Track A; don't roll back.

---

## 2 — Pre-flight checks

Confirm the rollback is actually possible:

```sql
-- a) Sidecar table exists in the target DB
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'events_consolidate_608'
) AS sidecar_present;

-- b) Sidecar has rows (matches expected loser count from the staging dry-run)
SELECT COUNT(*) FROM events_consolidate_608;

-- c) Snapshot is fresh (within the 7-day rollback window)
SELECT MIN(snapshot_at), MAX(snapshot_at), NOW() - MIN(snapshot_at) AS age
FROM events_consolidate_608;

-- d) Track A's UNIQUE index has NOT been applied yet — it would block re-INSERT
SELECT indexname FROM pg_indexes
WHERE tablename = 'events'
  AND indexdef LIKE '%canonical_artist%'
  AND indexdef LIKE '%UNIQUE%';
```

**If (d) returns a row, STOP.** Track A's UNIQUE index would reject the loser re-INSERT (the winner row now occupies the `(venue_id, date, canonical_artist)` slot). You must first drop that index, perform the rollback, then re-add the index after manually re-consolidating. That's a different runbook beat — escalate.

**If (c) is older than 7 days,** the sidecar was scheduled for cleanup. Check whether it actually got dropped; if so, the data is gone and rollback is impossible — the only path forward is to admin-edit the winner rows manually based on user-reported specifics.

---

## 3 — Restore procedure

Run inside a single transaction. The restore re-INSERTs every loser row from the sidecar, then reverses FK reassignments by detecting rows whose `event_id` points at a winner-cluster but whose creator (user, submitter, etc.) was originally tied to a loser.

```sql
BEGIN;

-- 3a. Re-INSERT every loser row.
-- The sidecar carries the original events.id, so PK conflict implies a previous
-- rollback already ran. INSERT ... ON CONFLICT DO NOTHING is intentional — the
-- second rollback attempt is a no-op.
INSERT INTO events (
  id, venue_id, title, artist, date, doors_time, show_time,
  ticket_url, ticket_price_min, ticket_price_max, description, image_url,
  genre, status, confidence_score, verified, source_url, source_hash,
  extraction_strategy, created_at, updated_at, price_source, setlist,
  pipeline_exhausted_at, canonical_artist, last_seen_at, first_missing_at
)
SELECT
  id, venue_id, title, artist, date, doors_time, show_time,
  ticket_url, ticket_price_min, ticket_price_max, description, image_url,
  genre, status, confidence_score, verified, source_url, source_hash,
  extraction_strategy, created_at, updated_at, price_source, setlist,
  pipeline_exhausted_at, canonical_artist, last_seen_at, first_missing_at
FROM events_consolidate_608
ON CONFLICT (id) DO NOTHING;

-- 3b. FK reassignment reversal is LOSSY. The forward script moved rows from
-- loser → winner; the reverse moves rows from winner → loser ONLY IF we can
-- prove the row originated against a loser. We can't prove that with 100%
-- certainty after the fact — the script's REASSIGN UPDATE didn't capture
-- the original event_id.
--
-- Heuristic: a price_submission or event_report's user_id can sometimes be
-- correlated with their watch history. But the safer move is to leave FK
-- rows pointing at the winner — the user is still "watching" or "reporting"
-- the same physical concert; only the row identity differs.
--
-- DO NOT reverse FK reassignments unless you have a specific row in mind
-- (e.g. a user-reported case). If so, identify it manually:
--   SELECT id, event_id, user_id, created_at FROM user_events WHERE user_id = '...';
-- Then UPDATE that single row to the loser's id.

COMMIT;
```

---

## 4 — Verify the restore

```sql
-- All losers should now be back in events
SELECT COUNT(*) AS expected, (
  SELECT COUNT(*) FROM events e
  WHERE EXISTS (SELECT 1 FROM events_consolidate_608 ec WHERE ec.id = e.id)
) AS actual
FROM events_consolidate_608;

-- Watched shows for affected users should resolve again
-- (replace user_id with the reporter's clerk id)
SELECT e.title, e.date, v.name AS venue
FROM user_events ue
JOIN events e ON e.id = ue.event_id
JOIN venues v ON v.id = e.venue_id
WHERE ue.user_id = '<USER_ID>'
ORDER BY e.date;
```

Then re-enable the crawler crons in Render.

---

## 5 — What rollback CAN'T fix

- **Crawler-side timestamp drift.** If the daily crawl ran between consolidation and rollback, `last_seen_at` and `first_missing_at` on the winner row reflect the crawl's view of the consolidated topology — not the original two-row state. Restoring the losers brings them back with their original timestamps, but the winner's timestamps are now from the post-consolidation reality.
- **Track A's UNIQUE index** (if it's been applied). See pre-flight check (d).
- **Admin edits to the winner row.** If an admin manually edited the winner row's title/artist/date between consolidation and rollback, those edits stay. The losers come back with their original values.
- **FK reassignments to the wrong owner.** Forward-direction reassignment is unambiguous (all loser FK rows → winner). Reverse is ambiguous; the runbook doesn't attempt automated reversal. Specific user-reported cases get manual remediation.

---

## 6 — After rollback: schedule cleanup

```sql
-- Sidecar table is intentionally retained for 7 days. If rollback succeeded
-- and you want to drop it early to free disk:
DROP TABLE IF EXISTS events_consolidate_608;
```

Then re-investigate the root cause (bad winner tiebreak? false canonical_artist match?) before attempting another consolidation pass — re-running the forward script blindly will re-produce the same bad outcome.
