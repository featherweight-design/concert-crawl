-- Adds canonical_title column + non-unique index for title-based dedup,
-- closing the residual gap in the canonical_artist work (PRs #617/#647/#648)
-- for events where the LLM extracts non-deterministic artist substrings from
-- compound titles. See issue #821 for the root-cause analysis.
--
-- Scope: schema + crawler-side write only. The unique-index swap from
-- (venue_id, date, canonical_artist) to (venue_id, date, canonical_title)
-- is deferred to a follow-up PR that runs the consolidation backfill first
-- (mirrors the #608 expand/contract rollout for canonical_artist).
--
-- The SQL canonicalization here must produce byte-identical output to
-- packages/crawler-core/src/lib/canonical-title.ts. Drift between the two
-- causes silent ON CONFLICT misses once the index swap lands — see the
-- 2026-06-17 Ø/ø incident referenced in CLAUDE.md memory.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS canonical_title text NOT NULL DEFAULT '';
--> statement-breakpoint

-- Backfill existing rows. Mirrors the JS canonicalizeTitle function:
--   1. Strip a curated set of Latin diacritics via translate()
--      (same char set as canonical_artist's backfill — must stay in sync
--       with LATIN_EXTENDED_MAP in canonical-title.ts).
--   2. Lowercase.
--   3. Collapse whitespace runs to a single space.
--   4. Trim.
--
-- Deliberately does NOT split on separators the way canonical_artist's
-- backfill does — titles legitimately use & / + ft. tokens to convey event
-- structure and the dedup signal lives in keeping them intact.
UPDATE events
SET canonical_title = trim(
  regexp_replace(
    lower(
      translate(
        title,
        'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇçŸŠšŽž',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCcYSsZz'
      )
    ),
    '\s+', ' ', 'g'
  )
)
WHERE canonical_title = '';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS events_canonical_title_idx
  ON events USING btree (canonical_title);
