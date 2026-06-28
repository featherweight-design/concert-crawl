import { describe, it, expect } from 'vitest'
import { SQL_PREFILTER_REGEX } from './2026-06-27-extractor-dedup-suffix-scan.js'

// Regression test for #851 — the Postgres prefilter regex was
// previously declared as a plain JS template literal containing `\w`,
// `\s`, and `\1`. None of those are valid JS escape sequences, so the
// backslashes were silently dropped (and `\1` became the legacy octal
// escape for char code 1), garbling the regex that reached Postgres and
// turning the candidate scan into a no-op. Switching to `String.raw`
// keeps every backslash intact. Asserting the literal characters here
// pins the invariant so the bug can't be reintroduced silently.
describe('extractor-dedup-suffix-scan — SQL_PREFILTER_REGEX', () => {
  it('preserves the Postgres word-start boundary anchor (`\\m`)', () => {
    // Two characters: a backslash followed by `m`. If the template were
    // interpreted as a normal JS string, `\m` would collapse to just `m`
    // (unknown escapes drop the backslash).
    expect(SQL_PREFILTER_REGEX.startsWith('\\m')).toBe(true)
    expect(SQL_PREFILTER_REGEX.charCodeAt(0)).toBe(0x5c) // backslash
    expect(SQL_PREFILTER_REGEX.charCodeAt(1)).toBe(0x6d) // 'm'
  })

  it('contains the backreference `\\1` as backslash + digit, not the octal escape', () => {
    // `\1` in a normal JS string is the legacy octal escape for char
    // code 1 (and a SyntaxError in strict mode). We need the literal
    // two-character sequence so Postgres parses it as a backreference.
    expect(SQL_PREFILTER_REGEX).toContain('\\1')
    // Pin the negative: the broken-fix result (U+0001, char code 1)
    // must never appear in the string.
    expect(SQL_PREFILTER_REGEX).not.toContain(String.fromCharCode(1))
  })

  it('uses POSIX character classes for word + whitespace', () => {
    expect(SQL_PREFILTER_REGEX).toContain('[[:alnum:]_]+')
    expect(SQL_PREFILTER_REGEX).toContain('[[:space:]]+')
    expect(SQL_PREFILTER_REGEX).toContain('[[:space:]]*')
  })

  it('anchors at end-of-string', () => {
    expect(SQL_PREFILTER_REGEX.endsWith('$')).toBe(true)
  })

  it('does NOT collapse to the broken non-raw shape', () => {
    // If the template literal ever loses its `String.raw` tag, `\w` and
    // `\s` would silently collapse to bare `w` and `s`. The canonical
    // POSIX classes here contain neither `w+` nor `s+` as standalone
    // word-or-whitespace tokens, so a regression would produce a string
    // that fails this equality.
    expect(SQL_PREFILTER_REGEX).not.toContain('w+')
    expect(SQL_PREFILTER_REGEX).not.toContain('s+')
  })

  it('matches the canonical full regex shape end-to-end', () => {
    // Single string equality so a future maintainer who changes the
    // regex sees this test fail loudly and has to consciously update
    // it (vs. silently drifting from the JS helper in
    // strip-duplicated-trailing-word.ts).
    expect(SQL_PREFILTER_REGEX).toBe(
      '\\m([[:alnum:]_]+)[[:space:]]+\\1[[:space:]]*$',
    )
  })
})
