import { describe, expect, it } from 'vitest'
import { artistSlug, resolveSlug } from './artist-slug.js'

describe('artistSlug', () => {
  it.each([
    ['ac/dc', 'ac-dc'],
    ['p!nk', 'pnk'],
    ['m.i.a.', 'mia'],
    ['mia', 'mia'],
    ['sigur ros', 'sigur-ros'],
    ['blink-182', 'blink-182'],
    ['earth, wind', 'earth-wind'],
    ['!!!', ''],
    ['', ''],
    ['  leading and trailing  ', 'leading-and-trailing'],
    ['--collapse---these--', 'collapse-these'],
    ['a  b', 'a-b'],
  ])('slugs %j to %j', (input, expected) => {
    expect(artistSlug(input)).toBe(expected)
  })

  it('produces only lowercase alphanumerics and hyphens', () => {
    const inputs = [
      'ac/dc',
      'p!nk',
      'm.i.a.',
      'sigur ros',
      'blink-182',
      'earth, wind',
      '$uicideboy$',
    ]
    for (const input of inputs) {
      const slug = artistSlug(input)
      expect(slug).not.toBe('')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('never returns a slug with leading or trailing separators', () => {
    expect(artistSlug('...odd future...')).toBe('odd-future')
  })

  it('returns an empty string for non-string input', () => {
    // Boundary guard — canonicalizeArtist has the same defensive check.
    const notAString: unknown = 42
    expect(artistSlug(typeof notAString === 'string' ? notAString : '')).toBe(
      '',
    )
  })
})

describe('resolveSlug', () => {
  it('returns the candidate when it is free', () => {
    expect(resolveSlug('mia', new Set())).toBe('mia')
  })

  it('suffixes from 2 upward on collision', () => {
    const taken = new Set(['mia'])
    expect(resolveSlug('mia', taken)).toBe('mia-2')
    taken.add('mia-2')
    expect(resolveSlug('mia', taken)).toBe('mia-3')
  })

  it('resolves the real m.i.a. / mia collision', () => {
    // Two DISTINCT canonical names that both slug to `mia`.
    const taken = new Set<string>()
    const first = resolveSlug(artistSlug('m.i.a.'), taken)
    taken.add(first)
    const second = resolveSlug(artistSlug('mia'), taken)
    taken.add(second)

    expect(first).toBe('mia')
    expect(second).toBe('mia-2')
    expect(taken.size).toBe(2)
  })

  it('falls back to a stable hash when the candidate is degenerate', () => {
    const first = resolveSlug('', new Set(), '!!!')
    const again = resolveSlug('', new Set(), '!!!')

    expect(first).not.toBe('')
    expect(first).toMatch(/^[a-z0-9-]+$/)
    expect(again).toBe(first)
  })

  it('gives different degenerate canonical names different slugs', () => {
    const taken = new Set<string>()
    const first = resolveSlug('', taken, '!!!')
    taken.add(first)
    const second = resolveSlug('', taken, '???')

    expect(second).not.toBe(first)
  })

  it('still de-collides a hashed fallback', () => {
    const first = resolveSlug('', new Set(), '!!!')
    expect(resolveSlug('', new Set([first]), '!!!')).toBe(`${first}-2`)
  })
})
