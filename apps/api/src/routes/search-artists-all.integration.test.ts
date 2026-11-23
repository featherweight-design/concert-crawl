import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mbArtists } from '@concert-crawl/db';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js';

// `GET /v1/search/artists?scope=all` (artist-search plan PR 4): one ranked
// list of our artists with shows, ours without, then slim-table MusicBrainz
// acts no `artists` row holds. The default scope must not move at all: the
// search palette and the artist picker read it until the UI PR switches them.

const app = createApp();

const MBID = {
  wolfAlice: '00000000-0000-4000-8000-0000000000a1',
  wolfParade: '00000000-0000-4000-8000-0000000000a2',
  wolfmother: '00000000-0000-4000-8000-0000000000a3',
  heldByOurs: '00000000-0000-4000-8000-0000000000a4',
};

const mbAct = (
  mbid: string,
  name: string,
  extra: Partial<typeof mbArtists.$inferInsert> = {},
): typeof mbArtists.$inferInsert => ({ mbid, name, ...extra });

type Row = {
  name: string;
  slug: string | null;
  mbid?: string | null;
  disambiguation?: string | null;
  area?: string | null;
  hasShows?: boolean;
  upcomingShowCount: number;
  following: boolean;
};

const search = async (path: string): Promise<Row[]> => {
  const res = await app.request(path);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: Row[] };
  return body.data;
};

describe('GET /v1/search/artists?scope=all', () => {
  beforeEach(async () => {
    await clearTables();
    // `clearTables` leaves the slim copy alone (the loader's tests own it).
    await testDb.delete(mbArtists);
  });

  it('leaves the default scope exactly as it was: gated, no MusicBrainz fields or acts', async () => {
    const venue = await seedVenue({ slug: 'pin-default-venue' });
    await seedArtist({ name: 'Wolf', photoUrl: 'https://img/wolf.jpg' });
    await seedArtist({ name: 'Wolf No Shows' });
    await seedEvent(venue.id, {
      artist: 'Wolf',
      date: '2027-09-01',
      showTime: '20:00:00',
      genre: ['rock'],
    });
    await testDb
      .insert(mbArtists)
      .values([mbAct(MBID.wolfParade, 'Wolf Parade', { area: 'Canada' })]);

    for (const path of [
      '/v1/search/artists?q=wolf',
      '/v1/search/artists?q=wolf&scope=shows',
    ]) {
      const rows = await search(path);
      expect(rows).toHaveLength(1);
      const [row] = rows;
      // Every key, so a field added to the default payload fails here.
      expect(Object.keys(row ?? {}).sort()).toEqual(
        [
          'following',
          'genre',
          'name',
          'nextShow',
          'photoUrl',
          'slug',
          'upcomingShowCount',
        ].sort(),
      );
      expect(row).toMatchObject({
        name: 'Wolf',
        slug: 'wolf',
        photoUrl: 'https://img/wolf.jpg',
        upcomingShowCount: 1,
        following: false,
        genre: 'rock',
      });
    }
  });

  it('rejects an unknown scope', async () => {
    const res = await app.request('/v1/search/artists?q=wolf&scope=everything');
    expect(res.status).toBe(400);
  });

  it('ranks ours with shows, then ours without, then MusicBrainz acts', async () => {
    const venue = await seedVenue({ slug: 'all-order-venue' });
    await seedArtist({ name: 'Wolf Alice', mbid: MBID.wolfAlice });
    await seedArtist({ name: 'Wolf Shows' });
    await seedEvent(venue.id, { artist: 'Wolf Shows', date: '2027-09-02' });
    await testDb.insert(mbArtists).values([
      mbAct(MBID.wolfAlice, 'Wolf Alice', {
        area: 'United Kingdom',
        disambiguation: 'London indie rock band',
      }),
      mbAct(MBID.wolfParade, 'Wolf Parade', { area: 'Canada' }),
    ]);

    const rows = await search('/v1/search/artists?q=wolf&scope=all');
    expect(
      rows.map((row) => [row.name, row.slug, row.hasShows, row.mbid]),
    ).toEqual([
      ['Wolf Shows', 'wolf-shows', true, null],
      ['Wolf Alice', 'wolf-alice', false, MBID.wolfAlice],
      ['Wolf Parade', null, false, MBID.wolfParade],
    ]);
    // Our row reads its MusicBrainz lines through its MBID.
    expect(rows[1]).toMatchObject({
      disambiguation: 'London indie rock band',
      area: 'United Kingdom',
      upcomingShowCount: 0,
    });
    expect(rows[2]).toMatchObject({
      area: 'Canada',
      disambiguation: null,
      upcomingShowCount: 0,
      following: false,
    });
  });

  it('never offers a MusicBrainz act an artists row already holds, hidden rows included', async () => {
    await seedArtist({
      name: 'Hidden Holder',
      mbid: MBID.heldByOurs,
      hidden: true,
    });
    await testDb
      .insert(mbArtists)
      .values([mbAct(MBID.heldByOurs, 'Holder Act')]);

    const rows = await search('/v1/search/artists?q=holder&scope=all');
    expect(rows).toEqual([]);
  });

  it('leaves out a row marked not an artist unless it has shows', async () => {
    await seedArtist({ name: 'Doors Open', matchStatus: 'not_an_artist' });

    const rows = await search('/v1/search/artists?q=doors&scope=all');
    expect(rows).toEqual([]);
  });

  it('finds a MusicBrainz act by alias', async () => {
    await testDb.insert(mbArtists).values([
      mbAct(MBID.wolfmother, 'Wolfmother', {
        aliases: ['Mother Wolf Collective'],
      }),
    ]);

    const rows = await search('/v1/search/artists?q=collective&scope=all');
    expect(rows.map((row) => row.mbid)).toEqual([MBID.wolfmother]);
  });

  it('skips MusicBrainz below three characters, where its index cannot help', async () => {
    await seedArtist({ name: 'Ox' });
    await testDb.insert(mbArtists).values([mbAct(MBID.wolfmother, 'Oxbow')]);

    const rows = await search('/v1/search/artists?q=ox&scope=all');
    expect(rows.map((row) => row.name)).toEqual(['Ox']);
  });

  it('caps the list at ten, ours first', async () => {
    for (let i = 0; i < 8; i += 1) {
      await seedArtist({ name: `Capall Ours ${i}` });
    }
    await testDb
      .insert(mbArtists)
      .values(
        Array.from({ length: 5 }, (_, i) =>
          mbAct(`00000000-0000-4000-8000-0000000001b${i}`, `Capall MB ${i}`),
        ),
      );

    const rows = await search('/v1/search/artists?q=capall&scope=all');
    expect(rows).toHaveLength(10);
    expect(rows.slice(0, 8).every((row) => row.slug !== null)).toBe(true);
    expect(rows.slice(8).map((row) => row.name)).toEqual([
      'Capall MB 0',
      'Capall MB 1',
    ]);
  });
});
