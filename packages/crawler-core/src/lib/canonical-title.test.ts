import { describe, it, expect } from 'vitest'
import { canonicalizeTitle } from './canonical-title.js'

describe('canonicalizeTitle', () => {
  describe('basic transformations', () => {
    it('lowercases the input', () => {
      expect(canonicalizeTitle('Yoga on the Rocks')).toBe('yoga on the rocks')
    })

    it('trims surrounding whitespace', () => {
      expect(canonicalizeTitle('  Yoga on the Rocks  ')).toBe(
        'yoga on the rocks',
      )
    })

    it('collapses runs of internal whitespace', () => {
      expect(canonicalizeTitle('Yoga  on  the  Rocks')).toBe(
        'yoga on the rocks',
      )
    })

    it('is idempotent', () => {
      const inputs = [
        'BPM BINGO! Dombresky / Walker & Royce Edition',
        'An Album Tribute to Wilco’s Sky Blue Sky',
        'Yoi Toki – A Future Funk/Vaporwave Party ft. Saint Pepsi',
        'AC/DC: Power Up Tour',
        'blink-182',
      ]
      for (const input of inputs) {
        const once = canonicalizeTitle(input)
        expect(canonicalizeTitle(once)).toBe(once)
      }
    })

    it('returns empty string for empty input', () => {
      expect(canonicalizeTitle('')).toBe('')
    })

    it('returns empty string for non-string input', () => {
      // Defensive guard against unexpected runtime values reaching this
      // function — same shape as canonicalizeArtist.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(canonicalizeTitle(null as any)).toBe('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(canonicalizeTitle(undefined as any)).toBe('')
    })
  })

  describe('diacritic stripping', () => {
    it('strips diacritics from "Beyoncé" within a title', () => {
      expect(canonicalizeTitle('Beyoncé World Tour')).toBe('beyonce world tour')
    })

    it('strips diacritics from "Mötley Crüe" within a title', () => {
      expect(canonicalizeTitle('Mötley Crüe: The End')).toBe(
        'motley crue: the end',
      )
    })

    it('handles Ø/ø via the LATIN_EXTENDED_MAP (not NFD-decomposable)', () => {
      // Same Ø/ø case that bit the canonical_artist work on 2026-06-17 —
      // the parity rule means this map must also exist in the SQL backfill.
      expect(canonicalizeTitle('Eivør Live')).toBe('eivor live')
      expect(canonicalizeTitle('Mötorhead Ø')).toBe('motorhead o')
    })
  })

  describe('punctuation preservation', () => {
    it('preserves "!" in titles like "BPM BINGO!"', () => {
      expect(canonicalizeTitle('BPM BINGO!')).toBe('bpm bingo!')
    })

    it('preserves "/" in titles like "AC/DC"', () => {
      expect(canonicalizeTitle('AC/DC')).toBe('ac/dc')
    })

    it('preserves "." in titles like "M.I.A."', () => {
      expect(canonicalizeTitle('M.I.A. Tour')).toBe('m.i.a. tour')
    })

    it('preserves apostrophes', () => {
      expect(canonicalizeTitle('Earl Sweatshirt’s SICK! Tour')).toBe(
        'earl sweatshirt’s sick! tour',
      )
    })
  })

  describe('does NOT split on separators (intentional contrast with canonicalizeArtist)', () => {
    // canonicalizeArtist truncates at " & ", " ft. ", " - ", etc. to collapse
    // multi-headliner billings. canonicalizeTitle keeps them intact because
    // a compound title is a stable visible identifier of the listing — the
    // LLM transcribes it verbatim across crawl runs.
    it('keeps " & " inside the title', () => {
      expect(
        canonicalizeTitle(
          'AEG Presents Sublime & Slightly Stoopid & 311 w/ Special Guests',
        ),
      ).toBe('aeg presents sublime & slightly stoopid & 311 w/ special guests')
    })

    it('keeps " ft. " inside the title', () => {
      expect(
        canonicalizeTitle(
          'Yoi Toki – A Future Funk/Vaporwave Party ft. Saint Pepsi',
        ),
      ).toBe('yoi toki – a future funk/vaporwave party ft. saint pepsi')
    })

    it('keeps " - " inside the title', () => {
      expect(canonicalizeTitle('R&B ONLY LIVE - 18+')).toBe(
        'r&b only live - 18+',
      )
    })
  })

  describe('issue #821 dedup cases — same listing → same canonical', () => {
    // These are the LLM-extracted title variants observed across crawl runs
    // for the same listing in prod. The canonical_title key must collapse
    // them so the upsert path hits ON CONFLICT instead of creating dupes.

    it('collapses case + whitespace variation on "Yoga on the Rocks"', () => {
      // Yoga on the Rocks dupes share the same title verbatim — the artist
      // field is what oscillates. This test confirms the function doesn't
      // accidentally diverge on these stable strings.
      const variants = [
        'Yoga on the Rocks',
        ' Yoga on the Rocks ',
        'YOGA ON THE ROCKS',
        'Yoga  on  the  Rocks',
      ]
      const canonicals = variants.map(canonicalizeTitle)
      expect(new Set(canonicals).size).toBe(1)
    })

    it('collapses case + whitespace variation on a BPM BINGO compound title', () => {
      const variants = [
        'BPM BINGO! Dombresky / Walker & Royce Edition',
        'BPM BINGO!  Dombresky / Walker & Royce Edition',
        'bpm bingo! dombresky / walker & royce edition',
      ]
      const canonicals = variants.map(canonicalizeTitle)
      expect(new Set(canonicals).size).toBe(1)
    })

    it('does NOT collapse the "Edition Edition" LLM-typo variant', () => {
      // Documented edge case in canonical-title.ts — repeated trailing words
      // stay distinct so we don't accidentally collide legitimate titles
      // like "New York, New York". Admin merge action handles the rare typo
      // case. This test pins the behavior so a future "collapse repeated
      // words" refactor surfaces it for review.
      const clean = canonicalizeTitle(
        'BPM BINGO! Dombresky / Walker & Royce Edition',
      )
      const typo = canonicalizeTitle(
        'BPM BINGO! Dombresky / Walker & Royce Edition Edition',
      )
      expect(clean).not.toBe(typo)
    })
  })
})
