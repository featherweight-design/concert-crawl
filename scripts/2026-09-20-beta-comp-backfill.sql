-- Concert Crawl — beta comp backfill for testers who redeemed before the grant
-- shipped (PR "grant beta testers Premium when they redeem their code").
--
-- Context: `redeem-code` now writes a lifetime `gifted_comps` row, but it is
-- reached only from `/auth/complete`, which runs on sign-up alone and only
-- while the signed `invite_verified` cookie is present. That cookie is deleted
-- on the first successful redemption and cannot be re-minted for a code that
-- already carries a `used_by`, so an account that redeemed EARLIER never passes
-- through the handler again and stays on `free` for ever without this.
--
-- Run against staging FIRST, validate, then prod. Connection: Neon (NOT
-- Render — see memory `reference_neon_db_access`).
--
-- Idempotent by construction: `on conflict (user_id) do nothing` skips anyone
-- who already holds a row, REVOKED ONES INCLUDED. That is deliberate and is the
-- same rule the handler follows — an admin revoke is a decision, and a backfill
-- must not undo it.
--
-- It does NOT write Clerk's `publicMetadata.plan` mirror. The table is the
-- source of truth and wins; `loadPlanContext` logs the disagreement and the
-- next admin flow repairs it. Mirroring from SQL is not possible, and a
-- backfill that skipped the table to chase the mirror would be backwards.

------------------------------------------------------------------------
-- 1. DIAGNOSE — who is missing a comp, before touching anything
------------------------------------------------------------------------
SELECT count(DISTINCT ic.used_by) AS testers_missing_comp
FROM invite_codes ic
LEFT JOIN gifted_comps gc ON gc.user_id = ic.used_by
WHERE ic.used_by IS NOT NULL
  AND gc.user_id IS NULL;

-- Sanity: how many already hold one, and how many of those are revoked. A
-- large revoked count means someone has been pulling comps deliberately and
-- this backfill should be paused for a conversation rather than run.
SELECT
  count(*) FILTER (WHERE gc.revoked_at IS NULL) AS live_comps,
  count(*) FILTER (WHERE gc.revoked_at IS NOT NULL) AS revoked_comps
FROM gifted_comps gc;

------------------------------------------------------------------------
-- 2. BACKFILL
------------------------------------------------------------------------
BEGIN;

-- Counted through RETURNING, so the figure is what THIS run inserted. A
-- count over `granted_by` would include every row a previous run wrote, so a
-- rerun — or a partial run followed by new testers — would report those as
-- newly written, fail the comparison below, and send the operator to a
-- rollback that is not warranted.
WITH inserted AS (
  INSERT INTO gifted_comps (user_id, granted_by, expires_at, redeemed_at)
  SELECT DISTINCT ic.used_by, 'system:invite-code-backfill', NULL, now()
  FROM invite_codes ic
  WHERE ic.used_by IS NOT NULL
  ON CONFLICT (user_id) DO NOTHING
  RETURNING 1
)
-- Expect this to match `testers_missing_comp` from step 1. If it is HIGHER,
-- stop and roll back: the only way that happens is a second writer between
-- the two reads. Lower is fine on a rerun, where the earlier run already
-- covered them.
SELECT count(*) AS rows_written FROM inserted;

COMMIT;

------------------------------------------------------------------------
-- 3. VALIDATE
------------------------------------------------------------------------
-- Zero rows, or the backfill did not cover everyone.
SELECT ic.used_by
FROM invite_codes ic
LEFT JOIN gifted_comps gc ON gc.user_id = ic.used_by
WHERE ic.used_by IS NOT NULL
  AND gc.user_id IS NULL;
