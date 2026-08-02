import { describe, expect, it } from 'vitest'
import { unauthoredChipKeys, venueShortName } from './lib'

describe('venueShortName', () => {
  it('strips a leading definite article', () => {
    expect(venueShortName('The Roxy')).toBe('Roxy')
  })

  it('keeps a short multi-word name intact', () => {
    expect(venueShortName('Ogden Theatre')).toBe('Ogden Theatre')
  })

  it('falls back to the first token for a long multi-word name', () => {
    expect(venueShortName('Mission Ballroom Amphitheatre')).toBe('Mission')
  })

  it('keeps a long single-word name intact — there is nothing to trim to', () => {
    expect(venueShortName('Sculpturedparkamphitheatre')).toBe(
      'Sculpturedparkamphitheatre',
    )
  })

  it('is case-insensitive about the article and trims surrounding space', () => {
    expect(venueShortName('  the Bluebird  ')).toBe('Bluebird')
  })

  it('returns the trimmed original when the name is only an article', () => {
    expect(venueShortName('The')).toBe('The')
  })
})

describe('unauthoredChipKeys', () => {
  it('lists the seven non-accessibility keys when only accessibility exists', () => {
    expect(
      unauthoredChipKeys([
        {
          chipType: 'accessibility',
          body: 'Ramp at stage left.',
          isPlaceholder: false,
        },
      ]),
    ).toEqual([
      'parking',
      'age_policy',
      'bag_check',
      'coat_check',
      'will_call',
      'food_drink',
      'transit',
    ])
  })

  it('never lists a chip that is already authored', () => {
    expect(
      unauthoredChipKeys([
        { chipType: 'accessibility', body: 'Ramp.', isPlaceholder: false },
        { chipType: 'parking', body: 'Lot on 13th.', isPlaceholder: false },
        { chipType: 'transit', body: 'RTD 15.', isPlaceholder: false },
      ]),
    ).not.toContain('parking')
  })

  it('never lists accessibility, even when it is absent', () => {
    expect(unauthoredChipKeys([])).not.toContain('accessibility')
  })
})
