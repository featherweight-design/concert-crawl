ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS crawl_wait_for_selector text;
