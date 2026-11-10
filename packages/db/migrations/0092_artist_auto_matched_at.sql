-- Best-effort auto-match for ambiguous artists (plan:
-- docs/superpowers/plans/2026-11-10-ambiguous-artist-auto-match.md).
--
-- Non-null exactly while the row's current match came from the best-effort
-- rule rather than the matcher's exact answer or a human. Admin lists these to
-- check and correct them; any admin write to the match clears it.
--
-- Expand-only: a nullable column, no backfill. Rollback is ignoring it; the
-- drop, if ever wanted, is a later contract migration.
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "auto_matched_at" timestamp with time zone;
