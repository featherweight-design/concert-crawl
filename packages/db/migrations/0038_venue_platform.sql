-- Per-platform fetcher dispatch (#623) — adds the two columns the
-- dispatcher reads to route a venue to a platform-specific fetcher
-- (e.g. AEG's JSON blob) instead of the HTML → JSON-LD → LLM cascade.
--
-- Both columns are nullable + intentionally NOT a Postgres enum.
-- The platform value is validated by Zod at the application layer so
-- we can add platforms (Etix, Ticketmaster, AXS) in follow-up PRs
-- without paying the "Postgres ALTER TYPE ADD VALUE can't be used in
-- the same TX" cost that bit us on migration 0034.
--
-- Onboarding rows below populate the 5 AEG template12 sister venues
-- we identified during the #623 audit. The platform_venue_id stored
-- is the events.json shard id from the discovered fetch URL
-- (`https://aegwebprod.blob.core.windows.net/json/events/<id>/events.json`),
-- NOT the venue-page-fragment id from `data_rv1/<id>/` — those are
-- two different numbers and only the events-shard id resolves.
--
-- Note: Fillmore Auditorium was originally suspected to be on AEG
-- template12 (it had .c-axs-event-card__wrapper set), but probing
-- showed it's actually a Next.js + AXS hybrid with no aegwebprod
-- references. It stays on the existing structured_data path and is
-- intentionally NOT onboarded here.

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS platform_venue_id text;
--> statement-breakpoint

UPDATE venues SET platform = 'aeg', platform_venue_id = '2'
  WHERE slug = 'bluebird-theater';
--> statement-breakpoint

UPDATE venues SET platform = 'aeg', platform_venue_id = '44'
  WHERE slug = 'fiddlers-green-amphitheatre';
--> statement-breakpoint

UPDATE venues SET platform = 'aeg', platform_venue_id = '37'
  WHERE slug = 'gothic-theatre';
--> statement-breakpoint

UPDATE venues SET platform = 'aeg', platform_venue_id = '89'
  WHERE slug = 'mission-ballroom';
--> statement-breakpoint

UPDATE venues SET platform = 'aeg', platform_venue_id = '7'
  WHERE slug = 'ogden-theatre';
