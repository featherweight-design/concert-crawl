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
      candidates: CANDIDATES,
    })

    expect(result).toEqual({
      matchedVenueId: 'venue-ogden',
      matchedVenueSlug: 'ogden-theatre',
      matchedVenueName: 'Ogden Theatre',
    })
  })

  it('matches case-insensitively ("at ogden theatre")', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt & MIKE at ogden theatre',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('matches the "@" variant ("@ Ogden Theatre")', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt & MIKE @ Ogden Theatre',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('matches mixed case venue name in marker ("AT Ogden Theatre")', () => {
    const result = detectCrossVenuePresale({
      title: 'Some Artist AT Ogden Theatre',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('handles trailing whitespace after the venue name', () => {
    const result = detectCrossVenuePresale({
      title: 'Artist AT OGDEN THEATRE   ',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  it('does NOT match when the marker text is not a known venue ("Live At Last")', () => {
    const result = detectCrossVenuePresale({
      title: 'Live At Last',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('does NOT match "@ home" when "home" is not a known venue', () => {
    const result = detectCrossVenuePresale({
      title: 'Acoustic Set @ home',
      sourceVenueId: 'venue-cervantes',
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
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('does NOT match when the title has no AT/@ marker', () => {
    const result = detectCrossVenuePresale({
      title: 'Earl Sweatshirt Home on the Range Tour',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result).toBeNull()
  })

  it('returns null when candidate list is empty', () => {
    const result = detectCrossVenuePresale({
      title: 'Artist AT OGDEN THEATRE',
      sourceVenueId: 'venue-cervantes',
      candidates: [],
    })

    expect(result).toBeNull()
  })

  it('matches the Bluebird as a different venue', () => {
    const result = detectCrossVenuePresale({
      title: 'Indie Band w/ Support AT BLUEBIRD THEATER',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueSlug).toBe('bluebird-theater')
  })

  it('matches when marker text contains the venue name plus trailing qualifier', () => {
    // Some venues append room/level: "AT OGDEN THEATRE BALCONY"
    const result = detectCrossVenuePresale({
      title: 'Artist AT OGDEN THEATRE BALCONY',
      sourceVenueId: 'venue-cervantes',
      candidates: CANDIDATES,
    })

    expect(result?.matchedVenueId).toBe('venue-ogden')
  })

  describe('shortened-name matching (venue suffix + "The" stripping)', () => {
    it('matches "AT RED ROCKS" against seed "Red Rocks Amphitheatre"', () => {
      const result = detectCrossVenuePresale({
        title: 'Jam Band Tour AT RED ROCKS',
        sourceVenueId: 'venue-cervantes',
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('red-rocks-amphitheatre')
    })

    it('matches "AT OGDEN" against seed "Ogden Theatre"', () => {
      const result = detectCrossVenuePresale({
        title: 'Artist On Tour AT OGDEN',
        sourceVenueId: 'venue-cervantes',
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('ogden-theatre')
    })

    it('matches "AT FILLMORE" against seed "The Fillmore Auditorium" (strips both "The" and "Auditorium")', () => {
      const result = detectCrossVenuePresale({
        title: 'Headliner AT FILLMORE',
        sourceVenueId: 'venue-cervantes',
        candidates: CANDIDATES,
      })

      expect(result?.matchedVenueSlug).toBe('fillmore-auditorium')
    })

    it('matches "AT THE FILLMORE" against seed "The Fillmore Auditorium"', () => {
      const result = detectCrossVenuePresale({
        title: 'Headliner AT THE FILLMORE',
        sourceVenueId: 'venue-cervantes',
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
        candidates: CANDIDATES,
      })

      expect(result).toBeNull()
    })

    it('still respects self-venue when the match is shortened', () => {
      // Cervantes' page lists "AT CERVANTES'" — shortened. Still self-venue.
      const result = detectCrossVenuePresale({
        title: "Band AT CERVANTES' MASTERPIECE",
        sourceVenueId: 'venue-cervantes',
        candidates: CANDIDATES,
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
