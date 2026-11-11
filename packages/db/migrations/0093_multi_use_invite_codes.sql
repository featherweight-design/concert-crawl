-- Multi-use invite codes for the pre-launch posters (plan:
-- docs/superpowers/plans/2026-11-10-invite-code-posters.md).
--
-- Expand-only. Every existing code stays single-use (max_uses 1), and a code
-- already redeemed is backfilled to use_count 1, so validate and redeem read
-- it exactly as before. used_by/used_at keep recording the first redemption.
ALTER TABLE "invite_codes" ADD COLUMN IF NOT EXISTS "max_uses" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD COLUMN IF NOT EXISTS "use_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD COLUMN IF NOT EXISTS "label" text;
--> statement-breakpoint
-- used_at, not only used_by: account deletion nulls used_by and keeps used_at,
-- and that code must stay spent.
UPDATE "invite_codes" SET "use_count" = 1
WHERE ("used_by" IS NOT NULL OR "used_at" IS NOT NULL) AND "use_count" = 0;
--> statement-breakpoint
-- The seat invariant, held by the database and not only by the claim. Added
-- after the backfill, which keeps every row inside it (use_count 0 or 1, max 1).
ALTER TABLE "invite_codes" DROP CONSTRAINT IF EXISTS "invite_codes_max_uses_check";
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_max_uses_check" CHECK ("max_uses" >= 1);
--> statement-breakpoint
ALTER TABLE "invite_codes" DROP CONSTRAINT IF EXISTS "invite_codes_use_count_check";
--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_use_count_check" CHECK ("use_count" BETWEEN 0 AND "max_uses");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invite_code_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code_id" uuid NOT NULL REFERENCES "invite_codes"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invite_code_redemptions_code_user_idx" ON "invite_code_redemptions" ("code_id", "user_id");
--> statement-breakpoint
-- Every past redemption joins the ledger, so a past redeemer's repeat trip is
-- recognised as theirs.
INSERT INTO "invite_code_redemptions" ("code_id", "user_id", "redeemed_at")
SELECT "id", "used_by", COALESCE("used_at", now()) FROM "invite_codes"
WHERE "used_by" IS NOT NULL
ON CONFLICT DO NOTHING;
