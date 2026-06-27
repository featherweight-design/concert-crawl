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

  it('matches word characters only (digits, underscores included; punctuation excluded)', () => {
    // \w in the regex means [A-Za-z0-9_]. A trailing token like
    // "2026 2026" should collapse; "!!! !!!" should not (no word chars).
    expect(stripDuplicatedTrailingWord('Festival 2026 2026')).toBe(
      'Festival 2026',
    )
    expect(stripDuplicatedTrailingWord('Wow !!! !!!')).toBe('Wow !!! !!!')
  })
})
