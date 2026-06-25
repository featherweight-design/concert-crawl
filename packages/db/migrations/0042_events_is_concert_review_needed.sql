-- LLM-classifier uncertainty signal for the isConcert predicate. Written
-- once on INSERT by the crawler's LLM extractor when the model emits
-- reviewNeeded=true; left untouched on re-crawl (crawler-frozen, mirroring
-- the hidden_from_consumer convention from migration 0039). A one-shot
-- backfill script may UPDATE this column to refresh against the latest
-- prompt. Admin actions on hidden_from_consumer never touch this column —
-- the bit reflects the LLM's view, not the admin's resolution.
--
-- Expand-only: NOT NULL DEFAULT FALSE so no existing row changes behavior
-- on rollout. Rolling back the code is sufficient if abort is needed —
-- the column stays in place with no data loss. No partial index up front;
-- at ~3K events the chip's hidden_from_consumer=true AND
-- is_concert_review_needed=true scan is small. Revisit at ~10K corpus.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_concert_review_needed BOOLEAN NOT NULL DEFAULT FALSE;
