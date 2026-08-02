/**
 * URL-safe slug derivation for the `artists` projection table (#1115).
 *
 * `canonicalizeArtist()` (packages/crawler-core/src/lib/canonical-artist.ts)
 * lowercases, strips diacritics and splits on billing separators — but it
 * deliberately PRESERVES punctuation that appears in real band names, so
 * "AC/DC" → "ac/dc", "P!nk" → "p!nk", "M.I.A." → "m.i.a.". None of those are
 * URL-safe, which is why slugging is a separate, stored derivation rather
 * than a display-time transform of the canonical name.
 *
 * Two distinct canonical names can slug to the same string ("m.i.a." and
 * "mia" both → "mia"), so slugs are de-collided at write time via
 * `resolveSlug` and stored. There is deliberately NO Postgres generated
 * column here: SQL↔JS canonicalization parity has already produced a
 * production bug in this repo (the Ø/ø incident). One JS implementation,
 * called from the backfill script and the crawler write-through.
 *
 * This lives in `packages/types` — the only package both `packages/db` (the
 * backfill + seed) and `packages/crawler-core` (the crawl write-through)
 * can depend on without introducing a workspace build cycle. It is
 * re-exported from `@concert-crawl/crawler-core` alongside
 * `canonicalizeArtist` so callers can import the pair from one place.
 */

/**
 * Punctuation that sits INSIDE a word rather than between two words, and so
 * is deleted rather than converted to a separator. Without this pass "p!nk"
 * would slug to "p-nk" and "m.i.a." to "m-i-a", both of which read as three
 * words that were never there. Everything else non-alphanumeric (including
 * "/" in "ac/dc" and "," in "earth, wind") is a genuine word boundary and
 * becomes a hyphen.
 */
const INTRA_WORD_PUNCTUATION = /['’‘`´.!?¡¿*"“”]/g

/**
 * Derives a URL-safe slug from an already-canonical artist name.
 *
 * Not idempotent-safe on raw input — always pass `canonicalizeArtist()`
 * output. Returns `''` for degenerate names whose characters are all
 * non-alphanumeric (e.g. "!!!"); callers must handle that, and
 * `resolveSlug` does.
 */
export const artistSlug = (canonicalName: string): string => {
  if (typeof canonicalName !== 'string' || canonicalName.length === 0) {
    return ''
  }

  return canonicalName
    .toLowerCase()
    .replace(INTRA_WORD_PUNCTUATION, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Small, stable, non-cryptographic hash (FNV-1a, 32-bit) rendered base-36.
 * Only used to keep a degenerate artist ("!!!", "???") addressable at a URL.
 * Stability matters — a re-run of the backfill must derive the same fallback
 * slug for the same canonical name, or the row's URL churns.
 */
const stableHash = (input: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/** Prefix for hashed fallback slugs, so they read as intentional in a URL. */
export const ARTIST_SLUG_FALLBACK_PREFIX = 'artist'

/**
 * Resolves a slug candidate against the set of slugs already taken.
 *
 * Returns `candidate` when it is free, else `candidate-2`, `candidate-3`, …
 * A degenerate (empty) candidate falls back to a short stable hash of
 * `canonicalName` so the row stays addressable.
 *
 * `taken` is not mutated — the caller owns it, and is responsible for adding
 * the returned slug before the next call.
 */
export const resolveSlug = (
  candidate: string,
  taken: Set<string>,
  canonicalName = '',
): string => {
  const base =
    candidate === ''
      ? `${ARTIST_SLUG_FALLBACK_PREFIX}-${stableHash(canonicalName)}`
      : candidate

  if (!taken.has(base)) {
    return base
  }

  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) {
    suffix++
  }
  return `${base}-${suffix}`
}
