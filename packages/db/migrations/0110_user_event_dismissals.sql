-- A person's own "hide this No longer listed show" (admin-approved 2026-11-12).
--
-- Expand-only: a new table, nothing read by existing code until the API ships.
-- One row per (person, show); the show stays delisted for everyone. Undo is a
-- DELETE. Rows go with the event (CASCADE) and with the account (the user-data
-- registry).
--
-- Down:
--   DROP TABLE IF EXISTS user_event_dismissals;
CREATE TABLE IF NOT EXISTS "user_event_dismissals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "dismissed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_event_dismissals_user_event_idx"
  ON "user_event_dismissals" ("user_id", "event_id");
