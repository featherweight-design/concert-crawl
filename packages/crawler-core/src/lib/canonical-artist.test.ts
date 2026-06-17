import { describe, it, expect } from 'vitest'
import { canonicalizeArtist } from './canonical-artist.js'

describe('canonicalizeArtist', () => {
  describe('basic transformations', () => {
    it('lowercases the input', () => {
      expect(canonicalizeArtist('Metallica')).toBe('metallica')
    })

    it('trims surrounding whitespace', () => {
      expect(canonicalizeArtist('  Metallica  ')).toBe('metallica')
    })

    it('collapses runs of internal whitespace', () => {
      expect(canonicalizeArtist('Pearl  Jam')).toBe('pearl jam')
    })

    it('is idempotent', () => {
      const inputs = [
        'Beyoncé',
        'Earl Sweatshirt & MIKE',
        'Madonna - Confessions Tour',
        'AC/DC',
        'blink-182',
      ]
      for (const input of inputs) {
        const once = canonicalizeArtist(input)
        expect(canonicalizeArtist(once)).toBe(once)
      }
    })
  })

  describe('diacritic stripping', () => {
    it('strips diacritics from "Beyoncé"', () => {
      expect(canonicalizeArtist('Beyoncé')).toBe('beyonce')
    })

    it('strips diacritics from "Mötley Crüe"', () => {
      expect(canonicalizeArtist('Mötley Crüe')).toBe('motley crue')
    })

    it('strips diacritics from "Sigur Rós"', () => {
      expect(canonicalizeArtist('Sigur Rós')).toBe('sigur ros')
    })
  })

  describe('separator splitting', () => {
    it('splits on " & "', () => {
      expect(canonicalizeArtist('Earl Sweatshirt & MIKE')).toBe(
        'earl sweatshirt',
      )
    })

    it('splits on " w/ "', () => {
      expect(canonicalizeArtist('Run the Jewels w/ Open Mike Eagle')).toBe(
        'run the jewels',
      )
    })

    it('splits on " ft. "', () => {
      expect(canonicalizeArtist('Drake ft. Future')).toBe('drake')
    })

    it('splits on " feat. "', () => {
      expect(canonicalizeArtist('Kendrick Lamar feat. SZA')).toBe(
        'kendrick lamar',
      )
    })

    it('splits on " featuring "', () => {
      expect(canonicalizeArtist('Jay-Z featuring Beyonce')).toBe('jay-z')
    })

    it('splits on " with "', () => {
      expect(canonicalizeArtist('Phoebe Bridgers with Julien Baker')).toBe(
        'phoebe bridgers',
      )
    })

    it('splits on " + "', () => {
      expect(canonicalizeArtist('Boygenius + Indigo Girls')).toBe('boygenius')
    })

    it('splits on " x "', () => {
      expect(canonicalizeArtist('Tyler the Creator x A$AP Rocky')).toBe(
        'tyler the creator',
      )
    })

    it('splits on em-dash with spaces', () => {
      expect(canonicalizeArtist('Madonna — Confessions Tour')).toBe('madonna')
    })

    it('splits on hyphen with spaces', () => {
      expect(canonicalizeArtist('Madonna - Confessions Tour')).toBe('madonna')
    })

    it('preserves hyphens without surrounding spaces ("blink-182")', () => {
      expect(canonicalizeArtist('blink-182')).toBe('blink-182')
    })

    it('uses the earliest separator when multiple are present', () => {
      // " - " appears before " & ", so the first segment is "madonna"
      expect(
        canonicalizeArtist('Madonna - Confessions Tour & Special Guest'),
      ).toBe('madonna')
    })
  })

  describe('preserved punctuation', () => {
    it('preserves "/" in "AC/DC"', () => {
      expect(canonicalizeArtist('AC/DC')).toBe('ac/dc')
    })

    it('preserves "!" in "P!nk"', () => {
      expect(canonicalizeArtist('P!nk')).toBe('p!nk')
    })

    it('preserves "." in "M.I.A."', () => {
      expect(canonicalizeArtist('M.I.A.')).toBe('m.i.a.')
    })
  })

  describe('empty / whitespace input', () => {
    it('returns empty string for empty input', () => {
      expect(canonicalizeArtist('')).toBe('')
    })

    it('returns empty string for whitespace-only input', () => {
      expect(canonicalizeArtist('   ')).toBe('')
    })
  })

  describe('festival names + tour qualifiers', () => {
    it('leaves festival names alone (no separators)', () => {
      expect(canonicalizeArtist('Coachella 2026')).toBe('coachella 2026')
    })

    it('drops tour qualifiers after hyphen', () => {
      expect(canonicalizeArtist('Madonna - Confessions Tour')).toBe('madonna')
    })
  })

  // Known false positive: "Earth, Wind & Fire" — the " & " separator rule
  // fires on the embedded ampersand and collapses the band to "earth, wind".
  // Accepted scope per issue #606; not a passing test, just documents the
  // edge case. A curated allowlist of exceptions can be added later if
  // real-data conflicts justify it.
  it.todo(
    'known false positive: "Earth, Wind & Fire" canonicalizes to "earth, wind"',
  )
})
