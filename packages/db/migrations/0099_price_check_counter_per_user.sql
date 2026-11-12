-- B+ B9a: more than one fan can file an update against a price under check.
-- Plan row B9 in docs/superpowers/plans/2026-11-11-bplus-redesign.md.
--
-- Until now migration 0041's partial unique index allowed one pending counter
-- per parent. The rule becomes one pending counter per (parent, submitter):
-- several fans may each have an update waiting, but nobody can stack their own.
--
-- 1. Expand: the narrower index. Every row the old index admitted satisfies
--    it (at most one pending counter per parent implies at most one per
--    parent and user), so it builds without touching data.
CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_user_unique_idx
  ON price_submissions (disputed_submission_id, user_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
--> statement-breakpoint
-- 2. Drop the one-per-parent index. This is the only way to admit a second
--    fan's update: no expand step can widen a unique index that still exists.
--    It is not destructive: dropping an index removes no rows or columns, the
--    code still running during the deploy keeps its own one-per-parent check
--    before every insert, and the new code relies on the index from step 1.
--
--    Down (by hand, docs/runbooks/db-rollback.md): first archive all but the
--    leading pending counter per parent (see 0041 step 5 for the pattern),
--    then recreate the 0041 index and drop the one above.
DROP INDEX IF EXISTS price_submissions_pending_counter_unique_idx;
