-- Concert Crews (#1226 PR-1) — plan §"Phase / PR-1", Task 2.
-- Expand-only: four net-new tables, four indexes. Nothing existing is touched.
--
--   1. crews         — identity: name, keeper (moves on handoff), patch salt.
--   2. crew_members  — membership; the 12-member cap is enforced in the API
--                      under a row lock on crews, not by a constraint here.
--   3. crew_invites  — one live shareable link per crew, 7-day expiry,
--                      revocable by any member.
--   4. crew_mutes    — presence of a row IS the muted state; unmuting deletes.
--
-- There is deliberately no crew_shows table (D1) and no member_count column:
-- crew shows are derived by joining crew_members against
-- user_events.attending_at, which already has the partial index that query
-- wants.

CREATE TABLE IF NOT EXISTS "crews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "keeper_id" text NOT NULL,
  "patch_salt" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crew_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "crew_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "joined_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "crew_members_crew_id_crews_id_fk"
    FOREIGN KEY ("crew_id") REFERENCES "crews" ("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "crew_members_crew_user_idx"
  ON "crew_members" ("crew_id", "user_id");
--> statement-breakpoint

-- Drives "my crews" on every page load.
CREATE INDEX IF NOT EXISTS "crew_members_user_idx"
  ON "crew_members" ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crew_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "crew_id" uuid NOT NULL,
  "token" text NOT NULL,
  "created_by" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "revoked_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "crew_invites_token_unique" UNIQUE ("token"),
  CONSTRAINT "crew_invites_crew_id_crews_id_fk"
    FOREIGN KEY ("crew_id") REFERENCES "crews" ("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "crew_invites_crew_idx"
  ON "crew_invites" ("crew_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "crew_mutes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "crew_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "muted_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "crew_mutes_crew_id_crews_id_fk"
    FOREIGN KEY ("crew_id") REFERENCES "crews" ("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "crew_mutes_crew_user_idx"
  ON "crew_mutes" ("crew_id", "user_id");
