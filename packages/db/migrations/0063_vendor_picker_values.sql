-- Add the six new submission_vendor values behind the vendor picker (#1193).
--
-- Etix is the headline gap: it backs 237 of our ticket links, second only to
-- Ticketmaster, and a fan buying through it had no honest option in the flat
-- six-vendor list. The four resale marketplaces and the 'Other' catch-all
-- close the rest of the "none of these is where I bought it" hole.
--
-- Casing follows the shipped convention (PascalCase, matching the TS `Vendor`
-- union) rather than re-casing the existing six to snake_case — that would
-- touch the enum type, the union, KNOWN_VENDOR_HOSTS, both submit forms, and
-- the admin surfaces while delivering nothing a fan can see.
--
-- Pure expand: no existing value changes, so no backfill and nothing to
-- contract later. IF NOT EXISTS makes re-runs a no-op.

ALTER TYPE "public"."submission_vendor" ADD VALUE IF NOT EXISTS 'Etix';
ALTER TYPE "public"."submission_vendor" ADD VALUE IF NOT EXISTS 'StubHub';
ALTER TYPE "public"."submission_vendor" ADD VALUE IF NOT EXISTS 'VividSeats';
ALTER TYPE "public"."submission_vendor" ADD VALUE IF NOT EXISTS 'Viagogo';
ALTER TYPE "public"."submission_vendor" ADD VALUE IF NOT EXISTS 'TicketNetwork';
ALTER TYPE "public"."submission_vendor" ADD VALUE IF NOT EXISTS 'Other';
