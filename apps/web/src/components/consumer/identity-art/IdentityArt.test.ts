import { describe, it, expect } from 'vitest'
import {
  ia_hashName,
  ia_getInitials,
  ia_isDark,
  identityFor,
  IA_TEMPLATES,
  IA_PALETTES,
} from './IdentityArt'

describe('ia_getInitials', () => {
  it('returns first 2 chars for a single non-stop word', () => {
    expect(ia_getInitials('Geese')).toBe('GE')
  })
  it('returns first letter of each of the first two non-stop words', () => {
    expect(ia_getInitials('Mission Ballroom')).toBe('MB')
  })
  it('skips leading stop word "The"', () => {
    expect(ia_getInitials('The Ogden')).toBe('OG')
  })
  it('handles multi-word with stop words mixed in', () => {
    expect(ia_getInitials('Red Rocks Amphitheatre')).toBe('RR')
  })
  it('returns "??" for empty string', () => {
    expect(ia_getInitials('')).toBe('??')
  })
  it('falls back to first 2 chars of original cleaned string when all words are stop words', () => {
    expect(ia_getInitials('The And Of')).toBe('TH')
  })
})

describe('ia_isDark', () => {
  it('returns true for a dark background', () => {
    expect(ia_isDark('#15131A')).toBe(true)
  })
  it('returns false for a light background', () => {
    expect(ia_isDark('#F1E6D5')).toBe(false)
  })
  it('returns false for invalid input', () => {
    expect(ia_isDark('')).toBe(false)
    expect(ia_isDark('notahex')).toBe(false)
  })
})

describe('ia_hashName', () => {
  it('returns a non-zero number for non-empty input', () => {
    expect(ia_hashName('Mission Ballroom', 'venue')).toBeGreaterThan(0)
  })
  it('same name + namespace always produces the same hash', () => {
    expect(ia_hashName('Pavement', 'artist')).toBe(
      ia_hashName('Pavement', 'artist'),
    )
  })
  it('same name in different namespaces produces different hashes', () => {
    expect(ia_hashName('Pavement', 'artist')).not.toBe(
      ia_hashName('Pavement', 'venue'),
    )
  })
})

describe('identityFor', () => {
  it('is deterministic — same inputs always produce the same result', () => {
    const first = identityFor('Mission Ballroom', 'venue')
    const second = identityFor('Mission Ballroom', 'venue')
    expect(first.hash).toBe(second.hash)
    expect(first.template.id).toBe(second.template.id)
    expect(first.palette.id).toBe(second.palette.id)
  })

  it('returns a template compatible with the requested kind', () => {
    const venue = identityFor('Test Venue', 'venue')
    expect(venue.template.kinds).toContain('venue')

    const artist = identityFor('Test Artist', 'artist')
    expect(artist.template.kinds).toContain('artist')
  })

  it('never assigns blueprint template to an artist', () => {
    for (let idx = 0; idx < 50; idx++) {
      expect(identityFor(`Artist ${idx}`, 'artist').template.id).not.toBe(
        'blueprint',
      )
    }
  })

  it('never assigns halftone template to a venue', () => {
    for (let idx = 0; idx < 50; idx++) {
      expect(identityFor(`Venue ${idx}`, 'venue').template.id).not.toBe(
        'halftone',
      )
    }
  })

  it('returns a palette from IA_PALETTES', () => {
    const result = identityFor('Red Rocks', 'venue')
    expect(IA_PALETTES.some((pal) => pal.id === result.palette.id)).toBe(true)
  })

  it('templateOverride selects the named template', () => {
    const result = identityFor('Any Name', 'artist', {
      templateOverride: 'stripes',
    })
    expect(result.template.id).toBe('stripes')
  })

  it('paletteOverride selects the named palette', () => {
    const result = identityFor('Any Name', 'artist', { paletteOverride: 'p4' })
    expect(result.palette.id).toBe('p4')
  })

  it('unknown templateOverride falls back to the hash-derived template', () => {
    const withUnknown = identityFor('Test', 'artist', {
      templateOverride: 'nonexistent',
    })
    const withoutOverride = identityFor('Test', 'artist')
    expect(withUnknown.template.id).toBe(withoutOverride.template.id)
  })
})

describe('IA_TEMPLATES', () => {
  it('contains exactly 5 templates', () => {
    expect(IA_TEMPLATES).toHaveLength(5)
  })
  it('each template has a render function', () => {
    IA_TEMPLATES.forEach((tpl) => expect(typeof tpl.render).toBe('function'))
  })
})

describe('IA_PALETTES', () => {
  it('contains exactly 8 palettes', () => {
    expect(IA_PALETTES).toHaveLength(8)
  })
  it('each palette has valid hex values for bg, primary, and secondary', () => {
    IA_PALETTES.forEach((pal) => {
      expect(pal.bg).toMatch(/^#[0-9a-f]{6}$/i)
      expect(pal.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(pal.secondary).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})
