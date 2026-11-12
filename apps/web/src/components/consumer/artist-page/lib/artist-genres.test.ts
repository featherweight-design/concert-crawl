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

  it('maps raw genres to their Vibe buckets', () => {
    expect(artistGenres([show(['soul', 'rap'])])).toEqual(['jazz', 'hip-hop']);
  });

  it('ranks by how many shows carry the bucket', () => {
    expect(
      // Blues is a jazz sub-genre, so it would tie the two; rap keeps the
      // second show hip-hop only (once, though it carries two hip-hop genres).
      artistGenres([show(['soul']), show(['r&b', 'rap']), show(['r&b'])]),
    ).toEqual(['hip-hop', 'jazz']);
    expect(
      artistGenres([show(['indie']), show(['rap']), show(['r&b'])]),
    ).toEqual(['hip-hop', 'indie']);
  });

  it('breaks a tie by the soonest show', () => {
    expect(artistGenres([show(['electronic', 'hip-hop'])])).toEqual([
      'electronic',
      'hip-hop',
    ]);
  });

  it('counts a bucket once per show and caps the list', () => {
    expect(
      artistGenres([show(['soul', 'funk', 'rock', 'pop']), show(['rock'])]),
    ).toEqual(['rock', 'jazz']);
  });

  it('counts case and whitespace variants as one bucket', () => {
    expect(
      artistGenres([show(['Soul ']), show(['soul']), show([' SOUL', 'folk'])]),
    ).toEqual(['jazz', 'folk']);
  });

  it('skips blank and unbucketed genres', () => {
    expect(artistGenres([show(['  ', 'soul'])])).toEqual(['jazz']);
    expect(
      artistGenres([show(['chillwave', 'electronic']), show(['chillwave'])]),
    ).toEqual(['electronic']);
    expect(artistGenres([show(['chillwave'])])).toEqual([]);
  });
});
