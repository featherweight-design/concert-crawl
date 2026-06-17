-- Add 'skipped' to crawl_status enum so we can distinguish page-hash dedup
-- skips from full successful extractions in the UI. Previously both wrote
-- status: 'success' with eventsFound: 0, which made cost-saving skips
-- visually indistinguishable from real zero-event failures.
--
-- The historical backfill (relabel old skip rows as 'skipped') is a
-- separate manual ops step — see docs/runbooks/db-rollback.md
-- ("crawl_status 'skipped' backfill" section). Postgres refuses to use
-- new enum values inside the same transaction that added them, and
-- Drizzle's migrator wraps each migration in a single transaction, so
-- we can't ship the UPDATE in the migration itself.

ALTER TYPE "public"."crawl_status" ADD VALUE IF NOT EXISTS 'skipped';
