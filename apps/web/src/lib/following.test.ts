import { describe, expect, it } from 'vitest';
import type {
  FollowedArtist,
  FollowedArtistNextShow,
} from '@concert-crawl/types';
import { followsToShelfArtists, suggestionsToShelfArtists } from './following';

const nextShow = (genres: string[]): FollowedArtistNextShow => ({
  eventId: 'evt-1',
  iso: '2099-08-14',
  venue: 'Larimer Lounge',
  venueSlug: 'larimer',
  price: 20,
  genres,
});

const follow = (show: FollowedArtistNextShow | null): FollowedArtist => ({
  name: 'Nightjar Choir',
  slug: 'nightjar-choir',
  canonicalName: 'nightjar choir',
  photoUrl: null,
  source: 'manual',
  followedAt: '2099-01-01T00:00:00Z',
  nextShow: show,
});

// B+ B5: the shelf card's edge takes the next show's lead genre.
describe('shelf genre mapping', () => {
  it('carries the lead genre of a follow and a suggestion', () => {
    expect(
      followsToShelfArtists([follow(nextShow(['rock', 'punk']))])[0]?.genre,
    ).toBe('rock');
    expect(
      suggestionsToShelfArtists([
        {
          name: 'Nightjar Choir',
          slug: 'nightjar-choir',
          photoUrl: null,
          upcomingShowCount: 1,
          nextShow: nextShow(['jazz']),
          following: null,
        },
      ])[0]?.genre,
    ).toBe('jazz');
  });

  it('has no genre without a next show or without genres', () => {
    expect(followsToShelfArtists([follow(null)])[0]?.genre).toBeNull();
    expect(followsToShelfArtists([follow(nextShow([]))])[0]?.genre).toBeNull();
  });
});
