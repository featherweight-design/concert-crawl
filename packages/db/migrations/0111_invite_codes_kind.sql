-- Share Concert Crawl by QR, PR 1: member invite codes (Hugh-approved 2026-11-12).
--
-- Expand-only. `kind` says whose code it is: 'admin' (every code made so far) or
-- 'member' (a person's own share code, one per account). Every existing row
-- takes the default, so nothing that reads invite_codes changes behaviour.
-- `max_uses` is NOT made nullable: every seat check compares against it, and a
-- member code gets a high finite cap instead (MEMBER_CODE_SEATS in the API).
--
-- The partial unique index is what makes get-or-create safe on a double open:
-- one member code per created_by, the loser's insert is a no-op.
--
-- Down:
--   DROP INDEX IF EXISTS invite_codes_member_owner_idx;
--   ALTER TABLE invite_codes DROP CONSTRAINT IF EXISTS invite_codes_kind_check;
--   ALTER TABLE invite_codes DROP COLUMN IF EXISTS kind;
ALTER TABLE "invite_codes"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'admin';

DO $$ BEGIN
  ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_kind_check"
    CHECK ("kind" IN ('admin', 'member'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_member_owner_idx"
  ON "invite_codes" ("created_by") WHERE "kind" = 'member';
