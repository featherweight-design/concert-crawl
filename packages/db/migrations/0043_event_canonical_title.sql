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
--   1. NFD-normalize and strip combining marks — matches the JS
--      `String.prototype.normalize('NFD').replace(/\p{M}/gu, '')` step
--      so a decomposed input like "Beyonce" + combining acute
--      canonicalizes to "beyonce" on both sides.
--   2. Map the remaining precomposed Latin Extended characters (the #648
--      set) — must stay in sync with LATIN_EXTENDED_MAP in
--      packages/types/src/latin-extended-map.ts. The 1→N entries
--      (Æ/æ, Œ/œ, ß, ẞ, Þ/þ — eight entries) go through replace();
--      translate() is
--      strictly 1→1 and would silently drop them, so only the 1→1
--      entries (Ø, Ł, Ð, Đ) are appended to its char set.
--   3. Lowercase.
--   4. Collapse whitespace runs to a single space.
--   5. Trim.
--
-- Deliberately does NOT split on separators the way canonical_artist's
-- backfill does — titles legitimately use & / + ft. tokens to convey event
-- structure and the dedup signal lives in keeping them intact.
--
-- Postgres `normalize(text, 'NFD')` is available from PG13 and produces
-- the same decomposition as JS NFD. The combining-mark strip uses the
-- explicit U+0300–U+036F (Combining Diacritical Marks block) range
-- because Postgres POSIX regex doesn't support the Unicode
-- `\p{Mark}` shorthand; this range covers every diacritic produced by
-- NFD-decomposing the Latin Extended characters we ever see in event
-- titles. Wider Combining Marks blocks (U+1AB0–U+1AFF, U+1DC0–U+1DFF,
-- U+20D0–U+20FF, U+FE20–U+FE2F) are not in our data and adding them
-- pre-emptively would mean the parity test has to grow with them.
UPDATE events
SET canonical_title = trim(
  regexp_replace(
    lower(
      translate(
        replace(replace(replace(replace(replace(replace(replace(replace(
          regexp_replace(normalize(title, NFD), '[̀-ͯ]', '', 'g'),
          'Æ', 'AE'), 'æ', 'ae'), 'Œ', 'OE'), 'œ', 'oe'),
          'ß', 'ss'), 'ẞ', 'SS'), 'Þ', 'TH'), 'þ', 'th'),
        'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿÑñÇçŸŠšŽžŁłÐðĐđ',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYyyNnCcYSsZzLlDdDd'
      )
    ),
    '\s+', ' ', 'g'
  )
)
WHERE canonical_title = '';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS events_canonical_title_idx
  ON events USING btree (canonical_title);
