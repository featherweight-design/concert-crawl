-- Admin redesign 5a: tag a person as a test account.
--
-- Expand-only: one boolean with a constant default, which Postgres adds
-- without rewriting the table. The admin People list shows it and an admin can
-- set it (POST /v1/admin/people/:userId/test-account); the admin counts (Health,
-- Needs you) will join on it to leave test accounts out. Clerk metadata cannot
-- be queried in SQL, which is why the tag lives here.
--
-- Down: ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_test_account;
ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "is_test_account" boolean DEFAULT false NOT NULL;
