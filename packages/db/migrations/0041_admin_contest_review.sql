-- Admin contest-review (#697) — adds the loser-of-contest 'archived' status,
-- the admin's archive reason column, and the engagement-signal columns that
-- surface via priceByTier[].counterSubmission on the event-detail endpoint.
-- Three indexes back the contest queue (disputed parents + pending counters)
-- and lock 1-pending-counter-per-parent at the DB level.

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
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY disputed_submission_id
           ORDER BY created_at DESC
         ) AS rn
  FROM price_submissions
  WHERE status = 'pending'
    AND disputed_submission_id IS NOT NULL
)
UPDATE price_submissions
   SET status = 'stale',
       archived_reason = 'superseded by newer counter before schema lock'
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint

-- 6. Schema-enforced 1-pending-counter-per-parent. The dispute POST also
--    rejects with a clean 409 (belt-and-braces), but this is the primary
--    defence — DB makes it impossible to file a 2nd pending counter.
CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_unique_idx
  ON price_submissions (disputed_submission_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
