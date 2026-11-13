-- Where a merged-away event went (admin-approved 2026-11-12).
--
-- Expand-only: a new table, read only by code that ships with it. Merging two
-- listings of one night deletes the loser row, so its id used to 404 for every
-- shared link, share card and old notification. One row per loser id points at
-- the surviving event; the event page and GET /v1/events/:id follow it.
--
-- `source_id` has no foreign key: it names a row that no longer exists.
-- `target_id` cascades with the surviving event; a merge repoints rows that
-- pointed at a loser to the new survivor before it deletes the loser.
--
-- Down:
--   DROP TABLE IF EXISTS event_redirects;
CREATE TABLE IF NOT EXISTS "event_redirects" (
  "source_id" uuid PRIMARY KEY NOT NULL,
  "target_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "event_redirects_target_idx"
  ON "event_redirects" ("target_id");
