-- Add events.event_url: the event's own detail page on the source venue
-- site (issue #1152). Distinct from ticket_url (the purchase/checkout link)
-- and source_url (the crawled index page). Serves as the "Get tickets"
-- deep-link fallback so a listing without a direct ticket URL still lands
-- users on the specific event page instead of the venue's generic index.
--
-- Additive nullable column — expand-phase only, no backfill required. The
-- crawler populates it on the next upsert for every listing that exposes a
-- per-event detail URL.
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_url text;
