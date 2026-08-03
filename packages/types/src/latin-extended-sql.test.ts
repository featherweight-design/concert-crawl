import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  LATIN_EXTENDED_MAP,
  LATIN_EXTENDED_MULTI,
  LATIN_EXTENDED_REGEX,
  LATIN_EXTENDED_SINGLE,
  LATIN_EXTENDED_TRANSLATE_FROM,
  LATIN_EXTENDED_TRANSLATE_TO,
  latinExtendedSql,
} from './latin-extended-map.js'

/**
 * Static parity guard for #648.
 *
 * The JS map and every SQL backfill that touches canonical_artist /
 * canonical_title must agree character-for-character. This test reads the
 * migration files directly, so a future edit that widens one side without the
 * other fails here rather than in production. It needs no database, so it runs
 * in the plain unit suite.
 */

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
)

const readMigration = (file: string): string =>
  readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')

// Every migration whose SQL derives a canonical_* value from raw text and so
// has to carry the full map.
const DERIVING_MIGRATIONS = [
  '0031_event_canonical_artist.sql',
  '0043_event_canonical_title.sql',
]

describe('LATIN_EXTENDED map internals', () => {
  it('splits every entry into exactly one of the single/multi maps', () => {
    const singleKeys = Object.keys(LATIN_EXTENDED_SINGLE)
    const multiKeys = Object.keys(LATIN_EXTENDED_MULTI)

    expect(singleKeys.filter((key) => multiKeys.includes(key))).toEqual([])
    expect(new Set([...singleKeys, ...multiKeys])).toEqual(
      new Set(Object.keys(LATIN_EXTENDED_MAP)),
    )
  })

  it('keeps single-char replacements single and multi-char replacements multi', () => {
    for (const replacement of Object.values(LATIN_EXTENDED_SINGLE)) {
      expect(replacement).toHaveLength(1)
    }
    for (const replacement of Object.values(LATIN_EXTENDED_MULTI)) {
      expect(replacement.length).toBeGreaterThan(1)
    }
  })

  it('derives the regex from every map key', () => {
    for (const char of Object.keys(LATIN_EXTENDED_MAP)) {
      LATIN_EXTENDED_REGEX.lastIndex = 0
      expect(LATIN_EXTENDED_REGEX.test(char)).toBe(true)
    }
  })

  it('never emits a character that another entry would consume', () => {
    // Guarantees the replace() chain and translate() are order-independent —
    // the property the SQL relies on to stay equivalent to the JS map.
    for (const replacement of Object.values(LATIN_EXTENDED_MAP)) {
      for (const char of replacement) {
        expect(LATIN_EXTENDED_MAP[char]).toBeUndefined()
      }
    }
  })

  it('aligns the translate() argument pair positionally', () => {
    expect(LATIN_EXTENDED_TRANSLATE_FROM).toHaveLength(
      LATIN_EXTENDED_TRANSLATE_TO.length,
    )
    for (const [char, replacement] of Object.entries(LATIN_EXTENDED_SINGLE)) {
      const idx = LATIN_EXTENDED_TRANSLATE_FROM.indexOf(char)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(LATIN_EXTENDED_TRANSLATE_TO[idx]).toBe(replacement)
    }
  })
})

describe.each(DERIVING_MIGRATIONS)('%s — SQL/JS map parity', (file) => {
  const sql = readMigration(file)

  // The translate() char pair that carries the Latin diacritics plus the 1→1
  // Latin Extended entries. Anchored on À — the first character of the
  // diacritic set in both migrations — so the lazy scan can't stop early on
  // one of the short replace() literals that precede it.
  const match = /'(À[^']+)',\s*'([^']+)'/.exec(sql)
  const translateFrom = match?.[1] ?? ''
  const translateTo = match?.[2] ?? ''

  it('exposes a translate() char pair', () => {
    expect(translateFrom).not.toBe('')
    expect([...translateFrom]).toHaveLength([...translateTo].length)
  })

  it.each(Object.entries(LATIN_EXTENDED_SINGLE))(
    'maps the 1→1 entry %s through translate()',
    (char, replacement) => {
      // translate() resolves a repeated `from` char at its first occurrence,
      // so that is the position the JS map has to agree with.
      const idx = [...translateFrom].indexOf(char)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect([...translateTo][idx]).toBe(replacement)
    },
  )

  it.each(Object.entries(LATIN_EXTENDED_MULTI))(
    'maps the 1→N entry %s through replace(), never translate()',
    (char, replacement) => {
      // The trap this whole test exists for: translate() is 1→1 and would
      // silently drop a multi-char expansion.
      expect(translateFrom).not.toContain(char)
      expect(sql).toContain(`'${char}', '${replacement}'`)
    },
  )
})

describe('0075_latin_extended_canonical.sql — generated expression', () => {
  const sql = readMigration('0075_latin_extended_canonical.sql')

  it.each(['canonical_artist', 'canonical_title'])(
    'embeds latinExtendedSql(%s) verbatim',
    (column) => {
      expect(sql).toContain(latinExtendedSql(column))
    },
  )
})
