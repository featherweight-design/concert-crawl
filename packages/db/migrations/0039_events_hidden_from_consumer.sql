-- Admin "Mark non-concert" hides an event from the consumer surface without
-- deleting it — preserves audit trail + lets admins later flip it back if the
-- classification was wrong. Every consumer-facing event-listing query adds
-- `WHERE NOT hidden_from_consumer` so the flag takes effect immediately.
--
-- Expand-only: column has NOT NULL DEFAULT FALSE, so no existing row changes
-- behavior on rollout. Rolling back the code is sufficient if we need to
-- abort — the column stays in place with no data loss.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hidden_from_consumer BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint

-- Partial index on the consumer-visible path. Consumer queries filter
-- `WHERE NOT hidden_from_consumer` for every event listing, so most of the
-- table is the hot path. The partial predicate keeps the index small while
-- still accelerating the dominant scan.
CREATE INDEX IF NOT EXISTS events_hidden_from_consumer_idx
  ON events (hidden_from_consumer)
  WHERE hidden_from_consumer = false;
