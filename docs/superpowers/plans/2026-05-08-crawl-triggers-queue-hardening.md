# Crawl Triggers Queue Hardening

Deferred items from PR #51 code review. These are operational improvements to `crawl_triggers`
that are low-risk to skip for beta but should be addressed before the queue sees sustained load.

---

## Deferred Items

### 1. Stale `processing` trigger recovery

**What:** If the crawler process is killed mid-run (OOM kill, deploy restart, SIGTERM), any
trigger in `processing` state will never be re-queued. It stays stuck forever.

**Why deferred:** At beta scale (handful of venues, manual trigger only), a stuck trigger is
recoverable by resetting it manually in the DB. Adding a recovery mechanism requires a new
schema column and migration, which is scope creep for this PR.

**When to address:** Before crawl volume grows or before enabling the every-10-min trigger
drain in production. Target: after the first beta crawl incident, or when you have 10+ venues
with automated triggers firing regularly.

**Implementation sketch:**

- Add `processing_started_at timestamptz` column to `crawl_triggers`
- On startup (or as part of `runTriggeredCrawls`), reset any trigger where
  `status = 'processing' AND processing_started_at < now() - interval '30 minutes'`
  back to `pending`
- Alternatively: reset all `processing` rows to `pending` unconditionally on startup
  (safe because Render cron jobs don't overlap — each run is a fresh process)

---

### 2. Index on `crawl_triggers.status`

**What:** The trigger drain query (`WHERE status = 'pending'`) does a sequential scan.
As the table grows, this degrades.

**Why deferred:** The table will have at most `venues × days` rows, and finished triggers
(status `done`/`failed`) accumulate slowly. At beta scale (20 venues, manual triggers only),
the table stays tiny and a sequential scan is imperceptible.

**When to address:** When the table approaches ~10k rows, or when you add a data-retention
job to prune old triggers (at which point re-evaluate whether an index is still needed).

**Implementation sketch:**

```sql
CREATE INDEX crawl_triggers_status_created_at_idx
  ON crawl_triggers (status, created_at);
```

Add to Drizzle schema via `.index()` and generate a new migration.

---

## Already Fixed in PR #51

- `triggered_by` column type: `uuid` → `text` (Clerk IDs are strings, not UUIDs)
- Atomic trigger claim: single `UPDATE ... WHERE status='pending' RETURNING` instead of
  SELECT-then-UPDATE (eliminates TOCTOU race if cron runs ever overlap)
- Trigger status mirrors `crawlRun.status`: triggers now correctly reach `failed` state
  when `crawlVenue` returns a failed run
- Timezone comment in `render.yaml`: MST = UTC-7, MDT = UTC-6
