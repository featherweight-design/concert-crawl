-- Admin contest-review (#697) — adds the loser-of-contest 'archived' status,
-- the admin's archive reason column, and the engagement-signal columns that
-- surface via priceByTier[].counterSubmission on the event-detail endpoint.
-- Four indexes back the contest surfaces: two per-parent lookups (disputed
-- parents + pending counters), one queue-global ORDER BY counter.created_at,
-- and one partial unique index enforcing 1-pending-counter-per-parent at
-- the DB level.

-- 1. Add 'archived' to the status enum (loser-of-contest sink, distinct from
--    'stale' which keeps its current "outdated/no-longer-valid" semantics).
ALTER TYPE price_submission_status ADD VALUE IF NOT EXISTS 'archived';
--> statement-breakpoint

-- 2. Add the admin's archive reason (no length cap — admins can write longer
--    than the 280-char submitter `note` field).
ALTER TABLE price_submissions
  ADD COLUMN IF NOT EXISTS archived_reason text;
--> statement-breakpoint

-- 3. Add the engagement-signal columns. `last_admin_action_kind` stays as
--    text (not an enum) because the only legal value today is 'defer';
--    validation lives at the application boundary.
ALTER TABLE price_submissions
  ADD COLUMN IF NOT EXISTS last_admin_action_at timestamptz;
--> statement-breakpoint
ALTER TABLE price_submissions
  ADD COLUMN IF NOT EXISTS last_admin_action_kind text;
--> statement-breakpoint

-- 4. Partial indexes that power the contest queue + counter-lookup join.
CREATE INDEX IF NOT EXISTS price_submissions_disputed_status_idx
  ON price_submissions (created_at)
  WHERE status = 'disputed';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS price_submissions_pending_counters_idx
  ON price_submissions (disputed_submission_id, created_at)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
--> statement-breakpoint

-- price_submissions_pending_counters_by_filed_idx — supports the admin
-- contests queue's global ORDER BY counter.created_at ASC scan. The sibling
-- price_submissions_pending_counters_idx (disputed_submission_id, created_at)
-- is optimized for per-parent lookups (e.g. "find pending counters against
-- parent X"), not for the global-ordered queue scan. With created_at as the
-- leading column the planner can walk pending counters in filedAt order
-- without a sort step as the table grows. `id` is the secondary sort column
-- so the planner gets a stable tiebreaker that matches the contest list
-- endpoint's pagination cursor logic (asc(createdAt), asc(id)).
CREATE INDEX IF NOT EXISTS price_submissions_pending_counters_by_filed_idx
  ON price_submissions (created_at, id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
--> statement-breakpoint

-- 5. Defensive pre-index cleanup. If any in-flight contests already have
--    multiple pending counters against the same parent (possible in the
--    race-window prior to this PR), retire the older ones so the unique
--    index below can be created safely. In prod today this is expected to
--    update 0 rows.
--
--    IMPORTANT: this UPDATE uses `'stale'` (an existing enum value), NOT
--    the new `'archived'` value added in step 1. Postgres refuses to USE a
--    newly ADDed enum value inside the same transaction (Drizzle wraps
--    each migration in one transaction — see
--    packages/db/migrations/0034_crawl_status_skipped.sql:21–24 for the
--    same constraint and rationale). `archived_reason` still carries the
--    audit trail of why the row was retired, so downstream review can
--    distinguish "retired because of contest cleanup" from other stale rows.
--
--    NOTE: the window's ORDER BY includes `id DESC` as a stable tie-breaker.
--    Without it, two pending counters with identical `created_at` (possible
--    via concurrent inserts in the same second or manual backfills) make
--    the survivor nondeterministic — different replicas could pick
--    different survivors during the migration run and diverge from the
--    leader once the partial unique index is created. The `id DESC`
--    secondary sort gives every replica the same answer.
--    `updated_at = NOW()` bumps the retired rows so audit queries see the
--    cleanup as a real mutation (rather than the row appearing to have
--    never been touched since its original submission).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY disputed_submission_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM price_submissions
  WHERE status = 'pending'
    AND disputed_submission_id IS NOT NULL
)
UPDATE price_submissions
   SET status = 'stale',
       archived_reason = 'superseded by newer counter before schema lock',
       updated_at = NOW()
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint

-- 6. Schema-enforced 1-pending-counter-per-parent. The dispute POST also
--    rejects with a clean 409 (belt-and-braces), but this is the primary
--    defence — DB makes it impossible to file a 2nd pending counter.
CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_unique_idx
  ON price_submissions (disputed_submission_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
