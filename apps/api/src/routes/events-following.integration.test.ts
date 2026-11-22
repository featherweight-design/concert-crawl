// The events list and detail carry no per-viewer follow overlay. The
// Spotify-sourced `followedArtists` field (#763 PR 6) and the `taste` scope
// (#763 PR 7) were retired with the spotify-sync flag, so a signed-in follower
// gets the same payload as anyone else, and an old client that still sends
// `taste=1` gets the plain list instead of an error.
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface MockAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState } = vi.hoisted(() => {
  const state: { current: MockAuth | null } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { userArtistFollows } from '@concert-crawl/db';
import { testDb } from '../test/helpers/db.js';
import { createApp } from '../app.js';
import { clearTables, seedVenue, seedEvent } from '../test/helpers/seed.js';

const app = createApp();

const USER = 'user_following_1';

// Far-future date so the list endpoint's `date >= today` filter always passes.
const FUTURE_DATE = '2030-06-01';

const seedSpotifyFollow = async (artistName: string) => {
  await testDb.insert(userArtistFollows).values({
    userId: USER,
    artistName,
    canonicalName: artistName.toLowerCase().trim(),
    source: 'spotify_followed',
  });
};

describe('events list and detail carry no follow overlay', () => {
  beforeEach(async () => {
    await clearTables();
    authState.current = { userId: USER, sessionClaims: {} };
  });

  it('a signed-in follower gets no followedArtists or canonical columns on the list', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE });
    await seedSpotifyFollow('Phoebe Bridgers');

    const res = await app.request('/v1/events');
    expect(res.status).toBe(200);
    const rows = (await res.json()).data.data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('followedArtists');
    expect(rows[0]).not.toHaveProperty('canonicalArtist');
    expect(rows[0]).not.toHaveProperty('canonicalHeadliners');
    expect(rows[0]).not.toHaveProperty('canonicalSupporting');
  });

  it('a signed-in follower gets no followedArtists or canonical columns on the detail', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      artist: 'Phoebe Bridgers',
      date: FUTURE_DATE,
    });
    await seedSpotifyFollow('Phoebe Bridgers');

    const res = await app.request(`/v1/events/${event.id}`);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).not.toHaveProperty('followedArtists');
    expect(data).not.toHaveProperty('canonicalArtist');
    expect(data).not.toHaveProperty('canonicalHeadliners');
    expect(data).not.toHaveProperty('canonicalSupporting');
  });

  it('ignores the retired taste=1 param and returns the plain list', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, { artist: 'Phoebe Bridgers', date: FUTURE_DATE });
    await seedEvent(venue.id, { artist: 'Wednesday', date: FUTURE_DATE });
    await seedSpotifyFollow('Phoebe Bridgers');

    const res = await app.request('/v1/events?taste=1');
    expect(res.status).toBe(200);
    expect((await res.json()).data.total).toBe(2);
  });
});
