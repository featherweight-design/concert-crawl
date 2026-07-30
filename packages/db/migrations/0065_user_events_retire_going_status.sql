-- Concert History (#70) — contract half of the attending_at rollout (0064).
--
-- Safe only because 0064 backfilled attending_at from created_at for every
-- status='going' row, and no application code has ever written 'going' — the
-- only non-test writers in the tree are packages/db/seed.ts (local) and
-- scripts/seed-staging/ (staging); tests insert it deliberately to prove the
-- contract guard fires. Verified before writing this file: prod
-- reported 0 going rows and 0 unbackfilled; staging reported 11 going rows,
-- 0 unbackfilled, 11 with attending_at set.
--
-- The re-backfill below is deliberate belt-and-braces: it makes the file safe
-- even if a row slipped in between 0064 and now, so the second statement can
-- never destroy an unrecorded attendance.
--
-- The 'going' value STAYS in the user_event_status enum. Removing an enum value
-- means recreating the type and rewriting every dependent column — a destructive
-- operation for zero benefit. The value simply becomes unreachable. This is not
-- unfinished work.

UPDATE "user_events"
  SET "attending_at" = COALESCE("attending_at", "created_at")
  WHERE "status" = 'going' AND "attending_at" IS NULL;

UPDATE "user_events" SET "status" = NULL WHERE "status" = 'going';
