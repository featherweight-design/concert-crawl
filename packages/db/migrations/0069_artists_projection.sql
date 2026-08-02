-- The `artists` projection table (#1115) — gives every artist a stable,
-- URL-safe identity so /artists/{slug} can exist. `events.canonical_artist`
-- is canonicalized but NOT URL-safe ("ac/dc", "p!nk", "m.i.a."), so the slug
-- is a distinct, stored derivation.
--
-- Expand-only: CREATE TABLE plus its indexes. Nothing is dropped, no existing
-- table is altered. Rows are populated by
-- packages/db/src/scripts/backfill-artists.ts and thereafter kept fresh by the
-- crawler write-through in packages/crawler-core/src/crawl.ts.
--
-- `slug` is deliberately NOT a generated column. SQL↔JS canonicalization
-- parity has already produced a production bug in this repo (the Ø/ø
-- incident); the single JS implementation lives in
-- packages/types/src/artist-slug.ts and is the only writer.
CREATE TYPE "artist_match_status" AS ENUM('unmatched', 'matched', 'ambiguous', 'no_match');
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" text NOT NULL,
	"spotify_artist_id" text,
	"match_status" "artist_match_status" DEFAULT 'unmatched' NOT NULL,
	"match_confidence" numeric(4, 3),
	"photo_url" text,
	"photo_fetched_at" timestamp with time zone,
	"match_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "artists_canonical_name_idx" ON "artists" USING btree ("canonical_name");
--> statement-breakpoint
CREATE UNIQUE INDEX "artists_slug_idx" ON "artists" USING btree ("slug");
--> statement-breakpoint
-- The admin match-review queue scans by status.
CREATE INDEX "artists_match_status_idx" ON "artists" USING btree ("match_status");
