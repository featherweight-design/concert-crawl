-- Adds canonical_artist column + non-unique index for collapsing artist-string
-- variants of the same show (e.g. "Earl Sweatshirt" vs "Earl Sweatshirt & MIKE").
--
-- Scope: schema + crawler-side write only. The unique-index swap from
-- (venue_id, date, artist) to (venue_id, date, canonical_artist) is deferred
-- to issue #608, which will perform the consolidation of existing duplicate
-- rows + the index swap atomically. Until then the existing unique index
-- events_venue_date_artist_idx remains in place.
--
-- The canonicalization rules in SQL are an approximation of
-- packages/crawler-core/src/lib/canonical-artist.ts — they are good enough
-- to seed every existing row with a usable value; the crawler will overwrite
-- the column with the canonical TS value on the next upsert.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS canonical_artist text NOT NULL DEFAULT '';
--> statement-breakpoint

-- Backfill existing rows. Mirrors the JS canonicalizeArtist function:
--   1. Strip a curated set of Latin diacritics via translate()
--   2. Lowercase
--   3. Collapse whitespace
--   4. Drop everything at and after the first separator (greedy left match,
--      lazy prefix so the earliest separator wins)
--   5. Trim
UPDATE events
SET canonical_artist = trim(
  regexp_replace(
    regexp_replace(
      lower(
        translate(
          artist,
          'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇçŸŠšŽž',
          'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCcYSsZz'
        )
      ),
      '\s+', ' ', 'g'
    ),
    '^(.*?) (?:&|w/|ft\.|feat\.|featuring|with|\+|x|—|-) .*$', '\1'
  )
)
WHERE canonical_artist = '';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS events_canonical_artist_idx
  ON events USING btree (canonical_artist);
