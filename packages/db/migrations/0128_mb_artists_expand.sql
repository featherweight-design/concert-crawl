-- Artist search on a slim MusicBrainz copy, PR 1: the schema expand
-- (docs/superpowers/plans/2026-11-22-artist-search-musicbrainz.md).
--
-- `mb_artists` holds MusicBrainz's CC0 core fields only (plan decision 1).
-- Nothing writes it yet: the weekly loader is PR 2, and it replaces the
-- table's contents through a shadow-table swap, so these rows are never
-- edited in place and nothing references them by foreign key.
--
-- `pg_trgm` backs the fuzzy half of the search (PR 4): trigram indexes on the
-- name and on the aliases, beside full-text indexes on both. Neon ships the
-- extension (1.6 on staging and production, checked 2026-11-22) and the
-- migration role may create it, so a plain CREATE EXTENSION IF NOT EXISTS is
-- all it needs.
--
-- An index expression must be IMMUTABLE and array_to_string() is only STABLE
-- (an element type's output function could, in general, read a setting). For
-- text[] the output never varies, so `mb_artist_aliases_text` wraps it as
-- IMMUTABLE, the standard Postgres pattern for this. It is schema-qualified
-- so the index never depends on a connection's search_path. The search query
-- must call the same function for the planner to use the alias indexes.
--
-- The 'simple' text search config does no stemming or stop words: artist
-- names are proper nouns, and "The The" must not lose both words.
--
-- `artists.mbid` and `user_artist_follows.mbid` are the Follow by MBID columns
-- (plan decision 4). The partial unique index lets every existing row stay
-- null while keeping two artists from claiming one MusicBrainz act.
--
-- Expand-only: one new table, one function, two nullable columns with no
-- default and no backfill. Nothing is dropped or renamed, and code from before
-- this migration never reads or writes any of it.
--
-- Rollback (docs/runbooks/db-rollback.md): drop the artists_mbid_idx index,
-- the two mbid columns, the mb_artists table, then the function. The
-- extension may stay; nothing else depends on it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE FUNCTION "public"."mb_artist_aliases_text"(aliases text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT array_to_string(aliases, ' ') $$;
--> statement-breakpoint
CREATE TABLE "mb_artists" (
	"mbid" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_name" text,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"type" text,
	"area" text,
	"disambiguation" text,
	"spotify_id" text,
	"wikidata_id" text,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mb_artists_name_trgm_idx" ON "mb_artists" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "mb_artists_aliases_trgm_idx" ON "mb_artists" USING gin ("public"."mb_artist_aliases_text"("aliases") gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "mb_artists_name_fts_idx" ON "mb_artists" USING gin (to_tsvector('simple', "name"));
--> statement-breakpoint
CREATE INDEX "mb_artists_aliases_fts_idx" ON "mb_artists" USING gin (to_tsvector('simple', "public"."mb_artist_aliases_text"("aliases")));
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "mbid" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "artists_mbid_idx" ON "artists" ("mbid") WHERE "mbid" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_artist_follows" ADD COLUMN "mbid" uuid;
