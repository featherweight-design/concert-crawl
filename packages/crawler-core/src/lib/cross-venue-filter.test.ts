import { describe, it, expect } from 'vitest'
import {
  detectCrossVenuePresale,
  normalizeVenueName,
  type CrossVenueCandidate,
} from './cross-venue-filter.js'

// Mirrors the actual seed shapes in packages/db/seed.ts so the tests catch
// real-world cases (titles often drop suffixes — "AT RED ROCKS" vs seed
// "Red Rocks Amphitheatre").
const CANDIDATES: CrossVenueCandidate[] = [
  {
    id: 'venue-ogden',
    slug: 'ogden-theatre',
    name: 'Ogden Theatre',
  },
  {
    id: 'venue-cervantes',
    slug: 'cervantes-masterpiece-ballroom',
    name: "Cervantes' Masterpiece Ballroom",
  },
  {
    id: 'venue-bluebird',
    slug: 'bluebird-theater',
    name: 'Bluebird Theater',
  },
  {
    id: 'venue-red-rocks',
    slug: 'red-rocks-amphitheatre',
    name: 'Red Rocks Amphitheatre',
  },
  {
    id: 'venue-fillmore',
    slug: 'fillmore-auditorium',
    name: 'The Fillmore Auditorium',
  },
  {
    id: 'venue-summit',
    slug: 'summit-music-hall',
    name: 'Summit Music Hall',
  },
]

describe('detectCrossVenuePresale', () => {
  it('matches "AT OGDEN THEATRE" in an all-caps title', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt & MIKE w/ Harrison (Surf Gang) AT OGDEN THEATRE',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result).toEqual({
      matchedVenueId: 'venue-ogden',
      matchedVenueSlug: 'ogden-theatre',
      matchedVenueName: 'Ogden Theatre',
      reason: 'known-venue',
    })
  })

  it('matches case-insensitively ("at ogden theatre")', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt & MIKE at ogden theatre',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('matches the "@" variant ("@ Ogden Theatre")', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt & MIKE @ Ogden Theatre',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('matches mixed case venue name in marker ("AT Ogden Theatre")', () => {
    const result = detectCrossVenuePresale({
      title: 'Some Artist AT Ogden Theatre',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('handles trailing whitespace after the venue name', () => {
    const result = detectCrossVenuePresale({
      title: 'Artist AT OGDEN THEATRE   ',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('does NOT match when the marker text is not a known venue ("Live At Last")', () => {
    const result = detectCrossVenuePresale({
      title: 'Live At Last',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('does NOT match "@ home" when "home" is not a known venue', () => {
    const result = detectCrossVenuePresale({
      title: 'Acoustic Set @ home',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('does NOT match when the marker names the source venue itself (self-venue)', () => {
    // Cervantes' own page lists a show "AT CERVANTES MASTERPIECE BALLROOM" —
    // that's just the venue naming itself, not a cross-venue presale.
    const result = detectCrossVenuePresale({
      title: "Some Band AT CERVANTES' MASTERPIECE BALLROOM",
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('does NOT match when the title has no AT/@ marker', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt Home on the Range Tour',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('returns null when candidate list is empty', () => {
    const result = detectCrossVenuePresale({
      title: 'Artist AT OGDEN THEATRE',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: [],
    })

    expect(result).toBeNull()
  })

  it('matches the Bluebird as a different venue', () => {
    const result = detectCrossVenuePresale({
      title: 'Indie Band w/ Support AT BLUEBIRD THEATER',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueSlug).toBe('bluebird-theater')
  })

  it('matches when marker text contains the venue name plus trailing qualifier', () => {
    // Some venues append room/level: "AT OGDEN THEATRE BALCONY"
    const result = detectCrossVenuePresale({
      title: 'Artist AT OGDEN THEATRE BALCONY',
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  describe('shortened-name matching (venue suffix + "The" stripping)', () => {
    it('matches "AT RED ROCKS" against seed "Red Rocks Amphitheatre"', () => {
      const result = detectCrossVenuePresale({
        title: 'Jam Band Tour AT RED ROCKS',
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('red-rocks-amphitheatre')
    })

    it('matches "AT OGDEN" against seed "Ogden Theatre"', () => {
      const result = detectCrossVenuePresale({
        title: 'Artist On Tour AT OGDEN',
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('ogden-theatre')
    })

    it('matches "AT FILLMORE" against seed "The Fillmore Auditorium" (strips both "The" and "Auditorium")', () => {
      const result = detectCrossVenuePresale({
        title: 'Headliner AT FILLMORE',
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('fillmore-auditorium')
    })

    it('matches "AT THE FILLMORE" against seed "The Fillmore Auditorium"', () => {
      const result = detectCrossVenuePresale({
        title: 'Headliner AT THE FILLMORE',
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('fillmore-auditorium')
    })

    it('matches "AT SUMMIT MUSIC" against seed "Summit Music Hall"', () => {
      // Shortened by suffix only — "AT SUMMIT" alone is too ambiguous and
      // would be false-positive-prone, so we require the marker to retain
      // enough of the canonical name (two words here) to be recognizable.
      const result = detectCrossVenuePresale({
        title: 'Artist AT SUMMIT MUSIC',
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('summit-music-hall')
    })

    it('does NOT spuriously match a non-venue word after suffix stripping ("AT LAST")', () => {
      // "Live At Last" extracted → "Last". Normalized → "Last". No candidate
      // shortens to "last", so this stays null.
      const result = detectCrossVenuePresale({
        title: 'Artist AT LAST',
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result).toBeNull()
    })

    it('still respects self-venue when the match is shortened', () => {
      // Cervantes' page lists "AT CERVANTES'" — shortened. Still self-venue.
      const result = detectCrossVenuePresale({
        title: "Band AT CERVANTES' MASTERPIECE",
        sourceVenueId: 'venue-cervantes',
        sourceVenueName: "Cervantes' Masterpiece Ballroom",
        candidates: CANDIDATES,
      })

      expect(result).toBeNull()
    })
  })

  describe('ticket-URL corroboration for venues we do not crawl (#1286)', () => {
    // Etix encodes the host venue in the purchase link, after the slugified
    // title: `<title>-<city>-<venue>`. These URLs are copied verbatim from
    // prod rows on 2026-08-01.
    const CERVANTES = {
      sourceVenueId: 'venue-cervantes',
      sourceVenueName: "Cervantes' Masterpiece Ballroom",
      candidates: CANDIDATES,
    }

    it('ignores the ?cobrand= query param, which names the SELLING venue on every link', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brother Ali AT THE BLACK SHEEP',
        ticketUrl:
          'https://www.etix.com/ticket/p/1/brother-ali-denver-the-black-sheep?cobrand=Cervantes&partner_id=100',
      })

      expect(result?.reason).toBe('ticket-url')
    })

    it('skips a show at an un-crawled venue when the ticket URL agrees', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brother Ali AT THE BLACK SHEEP',
        ticketUrl:
          'https://www.etix.com/ticket/p/53930568/brother-ali-at-the-black-sheep-denver-the-black-sheep?cobrand=Cervantes',
      })

      expect(result).toEqual({
        matchedVenueId: null,
        matchedVenueSlug: null,
        matchedVenueName: 'THE BLACK SHEEP',
        reason: 'ticket-url',
      })
    })

    it('skips an out-of-town park with no venue suffix in its name', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Terrapin Roadshow AT TWO RIVERS PARK, GLENWOOD SPRINGS',
        ticketUrl:
          'https://www.etix.com/ticket/p/58446797/terrapin-roadshow-at-two-rivers-parkglenwood-springs-denver-two-rivers-park?cobrand=Cervantes',
      })

      expect(result?.reason).toBe('ticket-url')
    })

    it('does NOT skip a legitimate show whose title merely contains "At"', () => {
      // Real prod listing. The marker regex fires on "At Best World Tour", but
      // the Etix link names Cervantes, so the URL vetoes the skip.
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brenn! Amateur At Best World Tour',
        ticketUrl:
          'https://www.etix.com/ticket/p/35599410/brenn-denver-cervantesmasterpiece-ballroom-and-cervantes-other-side?cobrand=Cervantes',
      })

      expect(result).toBeNull()
    })

    it('does NOT skip a second-room listing (Etix slugifies it as "cervantesother-side")', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Some Band At Sundown',
        ticketUrl:
          'https://www.etix.com/ticket/p/38246630/some-band-at-sundown-denver-cervantesother-side?cobrand=Cervantes',
      })

      expect(result).toBeNull()
    })

    it('does NOT skip when there is no ticket URL to corroborate the marker', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brother Ali AT THE BLACK SHEEP',
        ticketUrl: null,
      })

      expect(result).toBeNull()
    })

    it('does NOT skip when the marker itself names the source venue', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: "Band AT CERVANTES' OTHER SIDE",
        ticketUrl: 'https://tickets.example.com/p/12345/band-denver',
      })

      expect(result).toBeNull()
    })

    // Vendors that encode only the CITY corroborate nothing. Requiring a
    // positive marker hit in the URL — rather than merely the ABSENCE of the
    // source venue — is what keeps these real prod listings.
    it.each([
      [
        'Summit Music Hall',
        'EMEI - Night at the Opera Tour',
        'https://www.ticketmaster.com/emei-night-at-the-opera-tour-denver-colorado-10-08-2026/event/1E0064962A0475C3',
      ],
      [
        'Ball Arena',
        'Gracie Abrams: The Look at My Life Tour presented by Capital One',
        'https://www.ticketmaster.com/gracie-abrams-the-look-at-my-denver-colorado-12-03-2026/event/1E0064BAFCFA70CC',
      ],
      [
        'Marquis Theater',
        'BL\u00dc EYES: Two People At Once Tour',
        'https://www.ticketmaster.com/blu-eyes-two-people-at-once-denver-colorado-10-18-2026/event/1E0064C6106FACE8',
      ],
      [
        'The Fillmore Auditorium',
        'Decibel - Metal & Beer Festival: 3-DAY PASS (Pre-Fest at Ratio)',
        'https://www.ticketmaster.com/decibel-metal-beer-festival-3day-pass-denver-colorado-12-03-2026/event/1E006490A2EB96C9',
      ],
      [
        'Larimer Lounge',
        "Campground \u2013 BASS BINGO AFTERS \u2013 Afters at Kevin's ft. Kevin, Phatjazz",
        'https://www.etix.com/ticket/p/57982079/campground-bass-bingo-afters-afters-at-kevins-ftkevinphatjazz-denver-campground?partner_id=100',
      ],
    ])(
      'does NOT skip the %s listing %j',
      (sourceVenueName, title, ticketUrl) => {
        const result = detectCrossVenuePresale({
          title,
          sourceVenueId: 'venue-source',
          sourceVenueName,
          ticketUrl,
          candidates: CANDIDATES,
        })

        expect(result).toBeNull()
      },
    )

    it.each([
      ['a relative href', '/ticket/p/1/brother-ali-denver-the-black-sheep'],
      [
        'a protocol-relative href',
        '//www.etix.com/ticket/p/1/brother-ali-denver-the-black-sheep',
      ],
    ])('corroborates against %s', (_label, ticketUrl) => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brother Ali AT THE BLACK SHEEP',
        ticketUrl,
      })

      expect(result?.reason).toBe('ticket-url')
    })

    it('ignores the host, so a source-venue subdomain does not veto the skip', () => {
      // Etix serves Cervantes under a branded host. Only the path names the
      // venue that actually hosts the show.
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brother Ali AT THE BLACK SHEEP',
        ticketUrl:
          '//cervantes.etix.com/ticket/p/1/brother-ali-denver-the-black-sheep',
      })

      expect(result?.reason).toBe('ticket-url')
    })

    it.each([
      ['a malformed URL', 'https://'],
      ['a host with no path', 'https://www.etix.com'],
      ['an empty string', ''],
    ])('does NOT skip when the ticket URL is %s', (_label, ticketUrl) => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Brother Ali AT THE BLACK SHEEP',
        ticketUrl,
      })

      expect(result).toBeNull()
    })

    it('prefers a known-venue match over URL corroboration', () => {
      const result = detectCrossVenuePresale({
        ...CERVANTES,
        title: 'Headliner AT OGDEN THEATRE',
        ticketUrl:
          'https://www.etix.com/ticket/p/1/headliner-denver-ogden-theatre',
      })

      expect(result?.reason).toBe('known-venue')
      expect(result?.matchedVenueId).toBe('venue-ogden')
    })

    it('does NOT skip when the source venue name is too short to be a reliable token', () => {
      // A one-to-three character first word would hit incidental substrings, so
      // corroboration bails rather than risk dropping a real show.
      const result = detectCrossVenuePresale({
        sourceVenueId: 'venue-hq',
        sourceVenueName: 'HQ',
        candidates: [],
        title: 'Artist AT THE BLACK SHEEP',
        ticketUrl:
          'https://www.etix.com/ticket/p/1/artist-denver-the-black-sheep',
      })

      expect(result).toBeNull()
    })
  })

  describe('normalizeVenueName helper', () => {
    it('strips trailing venue suffixes', () => {
      expect(normalizeVenueName('Red Rocks Amphitheatre')).toBe('red rocks')
      expect(normalizeVenueName('Ogden Theatre')).toBe('ogden')
      expect(normalizeVenueName('Bluebird Theater')).toBe('bluebird')
      expect(normalizeVenueName('Mission Ballroom')).toBe('mission')
      expect(normalizeVenueName('Summit Music Hall')).toBe('summit music')
    })

    it('strips leading "The "', () => {
      expect(normalizeVenueName('The Fillmore Auditorium')).toBe('fillmore')
    })

    it('leaves a venue with no suffix unchanged', () => {
      expect(normalizeVenueName('Hi-Dive')).toBe('hi-dive')
    })

    it('handles already-lowercase + already-trimmed input', () => {
      expect(normalizeVenueName('ogden theatre')).toBe('ogden')
    })

    it('does NOT strip a suffix appearing mid-name (only trailing)', () => {
      // Defensive: a name like "Theatre Walk" (fictional) keeps "Theatre".
      expect(normalizeVenueName('Theatre Walk')).toBe('theatre walk')
    })
  })
})
