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

    it('strips apostrophes (see issue #850)', () => {
      // Apostrophes are deliberately removed in canonicalization so that
      // LLM transcription variants like "Zed's" vs "Zeds" collapse to the
      // same dedup key. See the dedicated "issue #850 — apostrophe
      // normalization" block below.
      expect(canonicalizeTitle('Earl Sweatshirt’s SICK! Tour')).toBe(
        'earl sweatshirts sick! tour',
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

  describe('issue #850 — Markdown emphasis markers', () => {
    // Real prod dupes (PR #824 follow-up audit): the LLM occasionally
    // wraps annotations in Markdown bold (`**TUESDAY 7/14**`). The
    // markers themselves are not content — they're styling that leaked
    // through verbatim. Strip the markers but preserve the inner text
    // so "Beyoncé **World Tour**" doesn't collapse to "beyonce".

    it('strips ** bold markers and preserves inner text', () => {
      expect(canonicalizeTitle('Foo **Bar**')).toBe('foo bar')
      expect(canonicalizeTitle('**Hello** World')).toBe('hello world')
    })

    it('strips __ bold markers and preserves inner text', () => {
      expect(canonicalizeTitle('Foo __Bar__')).toBe('foo bar')
    })

    it('strips * italic markers and preserves inner text', () => {
      expect(canonicalizeTitle('Foo *Bar*')).toBe('foo bar')
    })

    it('strips _ italic markers and preserves inner text', () => {
      expect(canonicalizeTitle('Foo _Bar_')).toBe('foo bar')
    })

    it('strips markers from the trailing annotation pattern observed in prod', () => {
      // Lindy Jam recurring listing — the LLM extracts the same headline
      // but one variant includes a bold trailing annotation.
      // Note: this collapses the MARKERS but the inner text "tuesday 7/14"
      // remains, so the two forms are still NOT equal. This is intentional:
      // stripping the inner annotation text entirely would discard real
      // content in titles like "Beyoncé **World Tour**". The residual
      // prefix-suffix dupes get manually merged via the admin UI (#820).
      const withMarkers = canonicalizeTitle(
        'Swing Nights Lindy Jam **TUESDAY 7/14**',
      )
      const withoutMarkers = canonicalizeTitle(
        'Swing Nights Lindy Jam TUESDAY 7/14',
      )
      expect(withMarkers).toBe(withoutMarkers)
      expect(withMarkers).toBe('swing nights lindy jam tuesday 7/14')
    })

    it('collapses cross-marker variants of the same annotated title', () => {
      // Same headline, different LLM passes emit the annotation with vs
      // without markers. Both forms must collapse to the same canonical.
      const variants = [
        "Cervantes' Comedy Presents Kristin Key **Early Show**",
        "Cervantes' Comedy Presents Kristin Key Early Show",
        "Cervantes' Comedy Presents Kristin Key __Early Show__",
        "Cervantes' Comedy Presents Kristin Key *Early Show*",
      ]
      const canonicals = variants.map(canonicalizeTitle)
      expect(new Set(canonicals).size).toBe(1)
    })

    it('handles markers wrapping content mid-title without dropping content', () => {
      // Defensive: if a future title uses bold for the artist, stripping
      // the whole **...** group (markers + inner) would lose the artist.
      // Verify inner text is preserved.
      const canonical = canonicalizeTitle('**Beyoncé** World Tour')
      expect(canonical).toBe('beyonce world tour')
    })
  })

  describe('issue #850 — apostrophe normalization', () => {
    // Real prod dupe (PR #824 follow-up audit): Larimer's Bass Bingo
    // listing exists as both `zeds dead jamboree!` and `zed's dead
    // jamboree!`. Curly + straight + omitted apostrophes all collapse.

    it('strips curly right single quotation mark (U+2019) like straight apostrophes', () => {
      // The two strings differ only in U+2019 vs U+0027. Both variants are
      // stripped outright, so both forms collapse to the same canonical.
      const curly = canonicalizeTitle('Earl Sweatshirt’s SICK! Tour')
      const straight = canonicalizeTitle("Earl Sweatshirt's SICK! Tour")
      expect(curly).toBe(straight)
    })

    it('strips curly left single quotation mark (U+2018) like straight apostrophes', () => {
      const curly = canonicalizeTitle('Rock‘8 Roll')
      const straight = canonicalizeTitle("Rock'8 Roll")
      expect(curly).toBe(straight)
    })

    it('strips single high-reversed-9 quotation mark (U+201B) like straight apostrophes', () => {
      const reversed = canonicalizeTitle('Don‛t Stop')
      const straight = canonicalizeTitle("Don't Stop")
      expect(reversed).toBe(straight)
    })

    it('strips standalone apostrophes so "zed\'s" and "zeds" collapse', () => {
      // The Larimer Bass Bingo dupe — one LLM pass typed `zed's`, the
      // other typed `zeds`. With apostrophe-strip in the normalizer
      // both forms collapse.
      const withApos = canonicalizeTitle(
        'BASS BINGO – Road to Zed’s Dead Jamboree!',
      )
      const withoutApos = canonicalizeTitle(
        'BASS BINGO – Road to Zeds Dead Jamboree!',
      )
      expect(withApos).toBe(withoutApos)
    })

    it('collapses all three apostrophe variants for the same title', () => {
      const variants = [
        "Zed's Dead",
        'Zed’s Dead',
        'Zed‘s Dead',
        'Zed‛s Dead',
        'Zeds Dead',
      ]
      const canonicals = variants.map(canonicalizeTitle)
      expect(new Set(canonicals).size).toBe(1)
    })
  })
})
