-- #1203 co-headliners as a first-class set — expand-only.
--
-- The LLM extractor flattened a co-headline bill into one `artist` string
-- ("Desert Dwellers & Great Dane") and dropped the second headliner into
-- `supporting_artists` alongside genuine openers. Artist-page attribution keys
-- off canonical_artist / canonical_supporting, so a co-headliner was either
-- missing from their own page or rendered as an opener.
--
-- 1. `events.headliners`: every act headlining the bill, in billing order,
--    INCLUDING the primary act already stored in `artist`. Invariant:
--    headliners[0] = artist.
-- 2. `events.canonical_headliners`: the canonicalized match surface for
--    artist attribution. The writer dedupes and sorts, so it is set-like and
--    not positionally aligned with headliners.
-- 3. A GIN index on canonical_headliners, mirroring the existing one on
--    canonical_supporting. Match with the overlap operator
--    (`canonical_headliners && ARRAY[...]`), which GIN can serve —
--    `= ANY(canonical_headliners)` cannot use this index.
--
-- Both columns are nullable with no default: this is the expand phase, and a
-- separate PR backfills historical multi-headliner bills with an LLM pass.
--
-- CRITICAL — the backfill below does NOT split any string on punctuation.
-- Every existing row becomes a single-headliner row. Of the ~54 prod rows
-- whose artist contains '&', 'and' or '+', roughly 23 are a single band's own
-- name ("Iron & Wine", "Coheed and Cambria", "for KING + COUNTRY", "Of
-- Monsters and Men") that any punctuation heuristic would destroy. Only the
-- LLM is ever allowed to decide what constitutes a headliner; no SQL and no
-- application code may infer it from a separator character.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "headliners" text[];
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "canonical_headliners" text[];
--> statement-breakpoint
UPDATE "events"
SET "headliners" = ARRAY["artist"],
    "canonical_headliners" = ARRAY["canonical_artist"]
WHERE "headliners" IS NULL OR "canonical_headliners" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_canonical_headliners_idx" ON "events" USING gin ("canonical_headliners");
