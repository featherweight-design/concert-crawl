import { describe, it, expect } from 'vitest'
import {
  detectCrossVenuePresale,
  type CrossVenueCandidate,
} from './cross-venue-filter.js'

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
    slug: 'red-rocks',
    name: 'Red Rocks',
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
})
