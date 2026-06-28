import { describe, it, expect } from 'vitest'
import { stripDuplicatedTrailingWord } from './strip-duplicated-trailing-word.js'

describe('stripDuplicatedTrailingWord', () => {
  it('collapses a duplicated trailing word (BPM BINGO #851 prod shape)', () => {
    expect(
      stripDuplicatedTrailingWord(
        'BPM BINGO! Dombresky / Walker & Royce Edition Edition',
      ),
    ).toBe('BPM BINGO! Dombresky / Walker & Royce Edition')
  })

  it('collapses a duplicated trailing word in a two-word title', () => {
    expect(stripDuplicatedTrailingWord('Show Show')).toBe('Show')
  })

  it('is case-insensitive on the duplicate match and preserves the kept variant', () => {
    // Keep the FIRST occurrence to preserve the natural casing the title
    // originally settled on; the trailing repeat is the LLM glitch.
    expect(stripDuplicatedTrailingWord('Edition edition')).toBe('Edition')
    expect(stripDuplicatedTrailingWord('FOO foo')).toBe('FOO')
    expect(stripDuplicatedTrailingWord('foo FOO')).toBe('foo')
  })

  it('leaves "New York, New York" untouched (comma separates them — not whitespace alone)', () => {
    // The whole point of doing this at the extractor layer rather than at
    // canonical-title.ts is that we get to be specific: only collapse the
    // narrow LLM-typo shape (trailing whitespace-only duplicate) and NOT
    // legitimate titles that use comma + repeat for stylistic effect.
    expect(stripDuplicatedTrailingWord('New York, New York')).toBe(
      'New York, New York',
    )
  })

  it('does NOT collapse a mid-string adjacent duplicate (anchored to end of string)', () => {
    expect(stripDuplicatedTrailingWord('Hello Hello World')).toBe(
      'Hello Hello World',
    )
  })

  it('is a no-op when the trailing word has no duplicate', () => {
    expect(stripDuplicatedTrailingWord('Foo')).toBe('Foo')
    expect(stripDuplicatedTrailingWord('A regular event title')).toBe(
      'A regular event title',
    )
  })

  it('returns empty string for empty input', () => {
    expect(stripDuplicatedTrailingWord('')).toBe('')
  })

  it('returns empty string for non-string input (matches canonicalizeTitle / canonicalizeArtist convention)', () => {
    // The signature is `(title: string): string`, but if an upstream caller
    // bypasses TypeScript and hands us null / undefined / a number, the
    // declared return type must still hold. canonical-title.ts:46-49 and
    // canonical-artist.ts return '' for non-string input — mirror that
    // contract here (#851).
    // Casts are local to the test so we can exercise the runtime guard;
    // production callers should never hit this path.
    const helper = stripDuplicatedTrailingWord as unknown as (
      title: unknown,
    ) => string
    expect(helper(null)).toBe('')
    expect(helper(undefined)).toBe('')
    expect(helper(42)).toBe('')
    expect(helper({})).toBe('')
  })

  it('tolerates extra trailing whitespace before applying the match', () => {
    // The extractor mapping passes title verbatim from the LLM output;
    // an accidentally-trailing space shouldn't gate the cleanup.
    expect(stripDuplicatedTrailingWord('Show Show  ')).toBe('Show')
  })

  it('does NOT touch titles where the duplicate is separated by punctuation other than whitespace', () => {
    // The regex requires `\s+` between the two occurrences, so punctuation
    // boundaries (comma, dash, slash, etc.) are out of scope and stay put.
    expect(stripDuplicatedTrailingWord('Edition-Edition')).toBe(
      'Edition-Edition',
    )
    expect(stripDuplicatedTrailingWord('Edition/Edition')).toBe(
      'Edition/Edition',
    )
  })

  it('only collapses one repeated word (does not iterate)', () => {
    // "Edition Edition Edition" → run once → "Edition Edition". The repeat
    // is a single typo class; aggressive iteration would risk collapsing
    // legitimate adjacent repeats that the single-pass regex tolerates.
    expect(stripDuplicatedTrailingWord('Edition Edition Edition')).toBe(
      'Edition Edition',
    )
  })

  it('matches word characters (Unicode letters / digits / marks / underscore; punctuation excluded)', () => {
    // The regex's word class is \p{L}\p{M}\p{N}_, so Unicode digits like
    // "2026 2026" collapse; "!!! !!!" does not (no word chars).
    expect(stripDuplicatedTrailingWord('Festival 2026 2026')).toBe(
      'Festival 2026',
    )
    expect(stripDuplicatedTrailingWord('Wow !!! !!!')).toBe('Wow !!! !!!')
  })

  // --- Unicode-letter regression coverage (#851) ---------------------------
  // Original regex used \w / \b, which are ASCII-only in JS — Unicode-letter
  // titles like "Beyoncé Beyoncé" or "Eivør Eivør" would have slipped past
  // the dedup. The /iu Unicode-property variant fixes that.
  it('collapses a duplicated trailing word with accented Unicode letters (Beyoncé)', () => {
    expect(stripDuplicatedTrailingWord('Beyoncé Beyoncé')).toBe('Beyoncé')
  })

  it('collapses a duplicated trailing word containing non-ASCII letters (Eivør)', () => {
    expect(stripDuplicatedTrailingWord('Eivør Eivør')).toBe('Eivør')
  })

  it('collapses a Unicode-letter trailing word inside a longer title', () => {
    // Mirrors the BPM BINGO shape but with a Unicode-letter trailing word
    // — confirms the Unicode-aware boundary (the colon + space before the
    // captured word) works the same as it would for an ASCII word.
    expect(stripDuplicatedTrailingWord('Live at Ogden: Beyoncé Beyoncé')).toBe(
      'Live at Ogden: Beyoncé',
    )
  })
})
