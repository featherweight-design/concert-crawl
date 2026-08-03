-- #648 — broaden the Latin Extended canonicalization map beyond Ø/ø.
--
-- PR #647 added a deliberately narrow LATIN_EXTENDED_MAP (Ø/ø only) to fix a
-- live crawl failure. This migration lands the wider set on already-stored
-- rows: Ł/ł, Æ/æ, ß/ẞ, Þ/þ, Ð/ð, Œ/œ, Đ/đ, alongside the existing Ø/ø.
--
-- WHY translate() ALONE IS NOT ENOUGH
-- Postgres translate() is strictly positional 1→1: it maps the Nth char of
-- `from` to the Nth char of `to`, and DELETES any `from` char with no
-- counterpart. Æ→ae, ß→ss, Œ→oe and Þ→th are 1→2 mappings, so putting them
-- in a translate() char set would silently drop them (or, worse, misalign
-- every following pair). Those four pairs are therefore expressed as nested
-- replace() calls, and translate() carries only the true 1→1 entries.
--
-- The expression below is generated verbatim by latinExtendedSql() in
-- packages/types/src/latin-extended-map.ts and is pinned character-for-
-- character by packages/db/src/latin-extended-sql.test.ts, so the JS map and
-- the SQL can never drift.
--
-- WHY THIS OPERATES ON canonical_artist / canonical_title, NOT artist / title
-- Re-deriving from the raw column would re-run the whole approximated SQL
-- pipeline (separator split, whitespace collapse) and risk changing rows for
-- reasons unrelated to #648. Every char added here is a letter that maps to
-- letters, so applying the map to the already-canonical value is provably
-- equivalent to re-running the full pipeline with the new map: it cannot
-- introduce or remove whitespace, and it cannot create or destroy a
-- separator. Case is a non-issue because the stored value is already
-- lowercased and lower() is re-applied.
--
-- IDEMPOTENT: a second run finds no row whose recomputed value differs, so
-- the UPDATE matches zero rows.
--
-- FORWARD-ONLY: there is no down migration. The old values are strictly less
-- canonical; the crawler rewrites both columns on the next upsert anyway.
--
-- events.canonical_supporting / canonical_headliners are deliberately left
-- alone. They are text[] whose JS writer dedupes AND sorts, and Postgres
-- array ordering follows the database collation while JS Array#sort follows
-- UTF-16 code-unit order — reproducing that in SQL is exactly the kind of
-- near-parity that caused the original incident. The crawler rewrites those
-- arrays through canonicalizeSupporting on every upsert.

-- canonical_artist. The partial unique index
-- events_venue_date_canonical_artist_showtime_idx (status = 'upcoming',
-- NULLS NOT DISTINCT on show_time) means a recanonicalized row could collide
-- with a sibling. Rather than fail the migration or delete data, colliding
-- rows are skipped — they are genuine duplicates and belong to the existing
-- consolidation script, not to a canonicalization fix. The collision probe
-- compares against the sibling's NEW value too, so a pair that would both
-- move onto the same key is skipped on both sides.
WITH recanonicalized AS (
  SELECT
    id,
    venue_id,
    date,
    show_time,
    status,
    canonical_artist AS current_value,
    lower(translate(replace(replace(replace(replace(replace(replace(replace(replace(canonical_artist, 'Æ', 'AE'), 'æ', 'ae'), 'Œ', 'OE'), 'œ', 'oe'), 'ß', 'ss'), 'ẞ', 'SS'), 'Þ', 'TH'), 'þ', 'th'), 'ØøŁłÐðĐđ', 'OoLlDdDd')) AS next_value
  FROM events
),
changed AS (
  SELECT * FROM recanonicalized WHERE next_value <> current_value
),
applicable AS (
  SELECT ch.* FROM changed ch
  WHERE ch.status <> 'upcoming'
    OR NOT EXISTS (
      SELECT 1
      FROM recanonicalized other
      WHERE other.id <> ch.id
        AND other.status = 'upcoming'
        AND other.venue_id = ch.venue_id
        AND other.date = ch.date
        AND other.show_time IS NOT DISTINCT FROM ch.show_time
        AND other.next_value = ch.next_value
    )
)
UPDATE events ev
SET canonical_artist = ap.next_value
FROM applicable ap
WHERE ev.id = ap.id;
--> statement-breakpoint

-- canonical_title has only a non-unique btree (events_canonical_title_idx),
-- so no collision guard is needed.
UPDATE events
SET canonical_title = lower(translate(replace(replace(replace(replace(replace(replace(replace(replace(canonical_title, 'Æ', 'AE'), 'æ', 'ae'), 'Œ', 'OE'), 'œ', 'oe'), 'ß', 'ss'), 'ẞ', 'SS'), 'Þ', 'TH'), 'þ', 'th'), 'ØøŁłÐðĐđ', 'OoLlDdDd'))
WHERE canonical_title <> lower(translate(replace(replace(replace(replace(replace(replace(replace(replace(canonical_title, 'Æ', 'AE'), 'æ', 'ae'), 'Œ', 'OE'), 'œ', 'oe'), 'ß', 'ss'), 'ẞ', 'SS'), 'Þ', 'TH'), 'þ', 'th'), 'ØøŁłÐðĐđ', 'OoLlDdDd'));
