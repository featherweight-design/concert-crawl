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
});
