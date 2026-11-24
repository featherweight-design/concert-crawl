-- Admin redesign 3c-3 (decision A7): "Not for us" on the Add a venue Start list.
--
-- A venue fans asked for can be dismissed so it stops showing ("It won't show
-- here again"). Fans suggest venues as free text in `feedback`, so there is no
-- venue row to hang the dismissal on: the key is the venue name, normalized
-- (lower case, letters and digits only) by the API. One active dismissal per
-- key; Undo sets `cleared_at`, and a later dismissal inserts a new row.
--
-- Expand-only: a new table, read and written only by code that ships with this
-- migration. No existing row or column changes.
--
-- Down:
--   DROP TABLE IF EXISTS venue_suggestion_dismissals;
CREATE TABLE IF NOT EXISTS "venue_suggestion_dismissals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name_key" text NOT NULL,
  "display_name" text NOT NULL,
  "dismissed_by" text NOT NULL,
  "dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "cleared_at" timestamp with time zone,
  "cleared_by" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "venue_suggestion_dismissals_active_idx" ON "venue_suggestion_dismissals" ("name_key") WHERE "cleared_at" IS NULL;
