-- Concert History (#70) — expand half of the attending_at rollout.
--
-- Attendance becomes its own nullable timestamp on user_events rather than a
-- `status` enum value, because Watching and Attending are independent concerns
-- that share one row under user_events_user_event_idx. `going` is derived at
-- read time from `attending_at IS NOT NULL`.
--
-- `status` drops NOT NULL so a user who marks "I'm going!" on a show they are
-- NOT watching has somewhere to live. NULL means "this row carries no Watching
-- relationship". Every shipped reader filters `status = 'watching'`, and SQL
-- equality excludes NULL rows, so no existing query changes meaning. Dropping a
-- NOT NULL is a pure expand — old code that still writes a status keeps working.
--
-- The backfill uses `created_at` as the going timestamp because no dedicated
-- timestamp was ever recorded for status='going' rows; the row's creation is the
-- closest honest proxy for when the user committed.
--
-- Expand only — nothing is dropped or rewritten. IF NOT EXISTS / idempotent
-- UPDATE predicates make the whole file safe to re-run. The contract half
-- (nulling out the legacy status='going' values) ships separately in 0065.

ALTER TABLE "user_events" ADD COLUMN IF NOT EXISTS "attending_at" timestamptz;

ALTER TABLE "user_events" ALTER COLUMN "status" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "user_events_user_attending_idx"
  ON "user_events" ("user_id", "attending_at")
  WHERE "attending_at" IS NOT NULL;

UPDATE "user_events"
  SET "attending_at" = "created_at"
  WHERE "status" = 'going' AND "attending_at" IS NULL;
