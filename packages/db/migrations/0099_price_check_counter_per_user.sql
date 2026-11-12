-- B+ B9a: more than one fan can file an update against a price under check.
-- Plan row B9 in docs/superpowers/plans/2026-11-11-bplus-redesign.md.
--
-- Expand only. Migration 0041's partial unique index allows one pending
-- counter per parent. The rule becomes one pending counter per (parent,
-- submitter): several fans may each have an update waiting, but nobody can
-- stack their own. This adds the narrower index. Every row the old index
-- admitted satisfies it (at most one pending counter per parent implies at
-- most one per parent and user), so it builds without touching data.
--
-- The 0041 index stays, and keeps refusing a second fan's update (a clean
-- 409, code price_check_update_pending), until a separate later PR ships
-- migration 0100 (number reserved; needs Hugh's OK for prod) to drop it once
-- this code is live everywhere. That drop is what switches several updates
-- per price on. Code running before or after this migration works with both
-- indexes present.
--
-- Down: DROP INDEX IF EXISTS price_submissions_pending_counter_user_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_user_unique_idx
  ON price_submissions (disputed_submission_id, user_id)
  WHERE status = 'pending' AND disputed_submission_id IS NOT NULL;
