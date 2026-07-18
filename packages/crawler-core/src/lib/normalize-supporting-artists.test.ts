import { describe, it, expect } from 'vitest'
import { normalizeSupportingArtists } from './normalize-supporting-artists.js'

describe('normalizeSupportingArtists', () => {
  it('returns openers unchanged when none repeat the headliner', () => {
    expect(normalizeSupportingArtists('Wednesday', ['Hotline TNT'])).toEqual([
      'Hotline TNT',
    ])
  })

  it('drops openers that repeat the headliner, case-insensitively (#643)', () => {
    // Real prod case: Vandoliers listed twice → openers surfaced the headliner.
    expect(
      normalizeSupportingArtists('Vandoliers', ['vandoliers', 'Mya Byrne']),
    ).toEqual(['Mya Byrne'])
  })

  it('trims each name and drops blank/whitespace-only entries', () => {
    expect(
      normalizeSupportingArtists('Wednesday', ['  Hotline TNT  ', '   ', '']),
    ).toEqual(['Hotline TNT'])
  })

  it('compares against the trimmed headliner', () => {
    expect(
      normalizeSupportingArtists('  The Body  ', ['the body', 'Big Brave']),
    ).toEqual(['Big Brave'])
  })

  it('returns an empty array when every opener is dropped', () => {
    expect(normalizeSupportingArtists('Vandoliers', ['Vandoliers'])).toEqual([])
  })
})
