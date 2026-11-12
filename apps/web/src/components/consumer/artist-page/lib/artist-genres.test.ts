import type { ArtistShow } from '@concert-crawl/types';
import { describe, expect, it } from 'vitest';

import { artistGenres } from './artist-genres';

const show = (genres: string[]): ArtistShow => ({
  eventId: genres.join('-') || 'none',
  iso: '2026-11-10',
  showTime: null,
  venue: 'Marquis Theater',
  venueSlug: 'marquis-theater',
  city: 'Denver',
  price: null,
  tourName: null,
  genres,
  imageUrl: null,
  status: 'upcoming',
});

describe('artistGenres', () => {
  it('returns nothing for an artist with no upcoming shows', () => {
    expect(artistGenres([])).toEqual([]);
  });

  it('ranks by how many shows carry the genre', () => {
    expect(
      artistGenres([show(['soul']), show(['r&b', 'soul']), show(['r&b'])]),
    ).toEqual(['soul', 'r&b']);
    expect(
      artistGenres([show(['indie']), show(['r&b']), show(['r&b'])]),
    ).toEqual(['r&b', 'indie']);
  });

  it('breaks a tie by the soonest show', () => {
    expect(artistGenres([show(['electronic', 'hip-hop'])])).toEqual([
      'electronic',
      'hip-hop',
    ]);
  });

  it('counts a genre once per show and caps the list', () => {
    expect(artistGenres([show(['soul', 'soul', 'jazz', 'funk'])])).toEqual([
      'soul',
      'jazz',
    ]);
  });

  it('counts case and whitespace variants as one genre, keeping the first spelling', () => {
    expect(
      artistGenres([show(['Soul ']), show(['soul']), show([' SOUL', 'jazz'])]),
    ).toEqual(['Soul', 'jazz']);
    // And once per show, however it is spelled there.
    expect(artistGenres([show(['soul', 'Soul', 'jazz'])])).toEqual([
      'soul',
      'jazz',
    ]);
  });

  it('skips blank genres', () => {
    expect(artistGenres([show(['  ', 'soul'])])).toEqual(['soul']);
  });

  it('keeps an unbucketed lead in first place; the page picks the ring past it', () => {
    expect(
      artistGenres([show(['chillwave', 'electronic']), show(['chillwave'])]),
    ).toEqual(['chillwave', 'electronic']);
  });
});
