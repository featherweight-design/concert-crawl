-- Per-user price-cred table (#1012).
--
-- Cred was stored on `user_roles.price_cred_score`, but `user_roles` only has a
-- row for role-GRANTED accounts (admin/sub_admin/explicit user grants). Regular
-- fans never get a row, so the award UPDATE (`WHERE user_id = ...`) matched zero
-- rows and silently vanished, and the profile read defaulted to 0 — the "hero
-- shows 0 CRED while the submissions view shows awarded cred" bug.
--
-- Fix: relocate cred to `user_cred`, keyed by Clerk user ID with a UNIQUE
-- constraint so awards UPSERT (every fan gets a row on their first confirmed
-- submission). This is the EXPAND half of an expand/contract change:
-- `user_roles.price_cred_score` is intentionally left in place (now unused) and
-- dropped in a later contract migration once this has shipped everywhere.

CREATE TABLE IF NOT EXISTS "user_cred" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "price_cred_score" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "user_cred_user_id_unique" UNIQUE ("user_id")
);
--> statement-breakpoint

-- Backfill. Seed a row only for users who can actually carry non-zero cred:
-- those with a role row, or with at least one 'corroborated' submission. Users
-- whose submissions are all pending/disputed would seed to 0, which is exactly
-- what the read path already returns for a missing row — so we skip them rather
-- than write dead 0-score rows (and scan the whole submissions table for them).
-- Seed each to the GREATER of:
--   (a) their previously-recorded `user_roles.price_cred_score` (summed across
--       role rows — the table has no unique constraint on user_id), and
--   (b) the count of their submissions currently in 'corroborated' status.
-- GREATEST (not SUM) avoids double-counting: the recorded score was itself
-- derived from corroboration awards, so it already overlaps (b). This restores
-- fans' historically-lost cred while never decreasing any role-granted user's
-- score.
INSERT INTO "user_cred" ("user_id", "price_cred_score")
SELECT
  u.user_id,
  GREATEST(COALESCE(r.role_score, 0), COALESCE(s.confirmed_count, 0))
FROM (
  SELECT "user_id" FROM "user_roles"
  UNION
  SELECT "user_id" FROM "price_submissions"
  WHERE "user_id" IS NOT NULL AND "status" = 'corroborated'
) u
LEFT JOIN (
  SELECT "user_id", SUM("price_cred_score") AS role_score
  FROM "user_roles"
  GROUP BY "user_id"
) r ON r.user_id = u.user_id
LEFT JOIN (
  SELECT "user_id", COUNT(*) AS confirmed_count
  FROM "price_submissions"
  WHERE "status" = 'corroborated' AND "user_id" IS NOT NULL
  GROUP BY "user_id"
) s ON s.user_id = u.user_id
ON CONFLICT ("user_id") DO NOTHING;
