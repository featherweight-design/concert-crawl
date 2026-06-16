-- Admin-toggled diagnostic flag: when true, the crawler logs the fetched HTML
-- to stdout so we can inspect what bot-protected venues actually serve.

ALTER TABLE venues
  ADD COLUMN debug_capture_html boolean NOT NULL DEFAULT false;
