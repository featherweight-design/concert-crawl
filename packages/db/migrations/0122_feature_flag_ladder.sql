-- The feature-flag ladder (admin redesign Phase 5c, P47-17 PR 1 of 4).
--
-- A flag stops being a boolean and gets a ladder: Off, Me, Beta, Everyone, plus
-- named people, a hand-set "verified" mark (production keeps a flag locked
-- until it is verified there) and a history of every change. This migration is
-- the schema and the backfill only; nothing reads it yet. The API moves to it
-- in PR 2.
--
-- Rulings (orchestrator, 2026-11-15):
--   * "Me" is the admin who set the stage: `stage_owner_user_id`. It is only
--     read while `stage` is 'me'; the backfill leaves it NULL because no
--     existing flag is at 'me'.
--   * History starts empty at the migration, with one synthetic row per flag
--     ("stage set from enabled") so the ladder has a first entry.
--   * The Mark-verified checks are stored as booleans with the note, on the
--     history row (`checks`, an object of booleans). They are not required.
--
-- `enabled` stays, and the one writer of it (the admin PATCH) also writes
-- `stage` in this release, so the two cannot drift before PR 2 reads `stage`.
-- Backfill: enabled becomes 'everyone', not enabled becomes 'off'.
--
-- Expand-only: a new enum, five nullable-or-defaulted columns, two new tables.
-- Nothing is dropped or rewritten; the contract step (dropping `enabled`) is a
-- later PR.
--
-- `feature_flags_me_has_owner` keeps a flag from sitting at 'me' with nobody
-- as "me". The backfill never produces 'me', so it holds for every row now.
--
-- Down:
--   ALTER TABLE feature_flags DROP CONSTRAINT IF EXISTS feature_flags_me_has_owner;
--   DROP TABLE IF EXISTS feature_flag_history;
--   DROP TABLE IF EXISTS feature_flag_users;
--   ALTER TABLE feature_flags DROP COLUMN IF EXISTS verified_note;
--   ALTER TABLE feature_flags DROP COLUMN IF EXISTS verified_by;
--   ALTER TABLE feature_flags DROP COLUMN IF EXISTS verified_at;
--   ALTER TABLE feature_flags DROP COLUMN IF EXISTS stage_owner_user_id;
--   ALTER TABLE feature_flags DROP COLUMN IF EXISTS stage;
--   DROP TYPE IF EXISTS flag_history_kind;
--   DROP TYPE IF EXISTS flag_stage;
DO $$ BEGIN
 CREATE TYPE "flag_stage" AS ENUM('off', 'me', 'beta', 'everyone');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "flag_history_kind" AS ENUM('stage_set', 'verified', 'unverified', 'person_added', 'person_removed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "stage" "flag_stage" DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "stage_owner_user_id" text;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "verified_by" text;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD COLUMN IF NOT EXISTS "verified_note" text;--> statement-breakpoint
UPDATE "feature_flags" SET "stage" = (CASE WHEN "enabled" THEN 'everyone' ELSE 'off' END)::"flag_stage";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_me_has_owner" CHECK ("stage" <> 'me' OR "stage_owner_user_id" IS NOT NULL);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flag_users" (
	"flag_key" text NOT NULL REFERENCES "feature_flags"("key") ON DELETE CASCADE,
	"user_id" text NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flag_users_flag_key_user_id_pk" PRIMARY KEY("flag_key","user_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flag_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_key" text NOT NULL REFERENCES "feature_flags"("key") ON DELETE CASCADE,
	"kind" "flag_history_kind" NOT NULL,
	"from_stage" "flag_stage",
	"to_stage" "flag_stage",
	"subject_user_id" text,
	"actor_user_id" text NOT NULL,
	"note" text,
	"checks" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feature_flag_history_flag_key_created_at_idx" ON "feature_flag_history" ("flag_key", "created_at" DESC);--> statement-breakpoint
INSERT INTO "feature_flag_history" ("flag_key", "kind", "to_stage", "actor_user_id", "note", "created_at")
SELECT "key", 'stage_set', "stage", "updated_by", 'stage set from enabled', "updated_at" FROM "feature_flags"
WHERE NOT EXISTS (SELECT 1 FROM "feature_flag_history" h WHERE h."flag_key" = "feature_flags"."key");
