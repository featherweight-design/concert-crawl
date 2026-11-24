// Integration tests for the MusicBrainz-row photo pass. Spotify is stubbed at
// the client boundary; the DB is real (per-worktree test DB).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { mbArtistPhotos, mbArtists } from '@concert-crawl/db';
import {
  loadMbArtists,
  type LoadMbArtistsOptions,
} from '@concert-crawl/db/scripts/load-mb-artists';
import type { MbArtistRow } from '@concert-crawl/db/scripts/mb-dump';
import { testDb } from '../test/helpers/db.js';
import { clearTables, seedArtist } from '../test/helpers/seed.js';
import { SpotifyRateLimitError } from '../lib/spotify.js';
import type { SpotifyAppClient } from '../lib/spotify-app-client.js';
import { refreshMbPhotos } from './refresh-mb-photos.js';

const NOW = new Date('2026-08-01T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_BEFORE = new Date(NOW.getTime() - 20 * DAY_MS);

const id = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const act = (
  n: number,
  links: { spotify?: boolean; wikidata?: boolean } = {
    spotify: true,
    wikidata: true,
  },
): typeof mbArtists.$inferInsert => ({
  mbid: id(n),
  name: `Act ${n}`,
  spotifyId: links.spotify ? `sp${n}` : null,
  wikidataId: links.wikidata ? `Q${n}` : null,
});

const clientWith = (
  fetchArtistPhoto: SpotifyAppClient['fetchArtistPhoto'],
): SpotifyAppClient => ({
  searchArtists: async () => {
    throw new Error('the photo pass must not search by name');
  },
  fetchArtistDetails: async () => new Map(),
  fetchArtistPhoto,
  getCallCount: () => 0,
});

const run = (
  client: SpotifyAppClient,
  budget = 10,
): ReturnType<typeof refreshMbPhotos> =>
  refreshMbPhotos({
    client,
    budgetFor: () => budget,
    staleBefore: STALE_BEFORE,
    now: () => NOW,
  });

const readPhotos = () =>
  testDb.select().from(mbArtistPhotos).orderBy(asc(mbArtistPhotos.mbid));

describe('refreshMbPhotos', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.delete(mbArtists);
    await testDb.delete(mbArtistPhotos);
  });
  afterEach(async () => {
    await testDb.delete(mbArtists);
    await testDb.delete(mbArtistPhotos);
  });

  it('fills a photo for a notable row, looked up by its Spotify id', async () => {
    await testDb.insert(mbArtists).values(act(1));
    const asked: string[] = [];

    const summary = await run(
      clientWith(async (spotifyId) => {
        asked.push(spotifyId);
        return { found: true, imageUrl: 'https://i.scdn.co/image/one' };
      }),
    );

    expect(asked).toEqual(['sp1']);
    expect(summary).toMatchObject({ refreshed: 1, empty: 0, failures: 0 });
    expect(await readPhotos()).toEqual([
      {
        mbid: id(1),
        photoUrl: 'https://i.scdn.co/image/one',
        photoFetchedAt: NOW,
      },
    ]);
  });

  it('skips a row missing either link, and an act our own artists already hold', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(1, { spotify: true }),
        act(2, { wikidata: true }),
        act(3),
        act(4),
      ]);
    await seedArtist({ name: 'Act 4', mbid: id(4) });
    const asked: string[] = [];

    await run(
      clientWith(async (spotifyId) => {
        asked.push(spotifyId);
        return { found: true, imageUrl: 'https://i.scdn.co/image/x' };
      }),
    );

    expect(asked).toEqual(['sp3']);
  });

  it('goes oldest first within the budget: never fetched, then the stalest', async () => {
    await testDb.insert(mbArtists).values([act(1), act(2), act(3), act(4)]);
    await testDb.insert(mbArtistPhotos).values([
      {
        mbid: id(1),
        photoUrl: 'https://i.scdn.co/image/old',
        photoFetchedAt: new Date(NOW.getTime() - 40 * DAY_MS),
      },
      {
        mbid: id(2),
        photoUrl: 'https://i.scdn.co/image/older',
        photoFetchedAt: new Date(NOW.getTime() - 50 * DAY_MS),
      },
      {
        // Fetched 5 days ago: not due.
        mbid: id(3),
        photoUrl: 'https://i.scdn.co/image/fresh',
        photoFetchedAt: new Date(NOW.getTime() - 5 * DAY_MS),
      },
    ]);
    const asked: string[] = [];

    await run(
      clientWith(async (spotifyId) => {
        asked.push(spotifyId);
        return { found: true, imageUrl: 'https://i.scdn.co/image/new' };
      }),
      2,
    );

    // act 4 was never fetched, act 2 is the stalest; act 1 waits for tomorrow.
    expect(asked).toEqual(['sp4', 'sp2']);
  });

  it('stamps a lookup with no image so it waits a cycle', async () => {
    await testDb.insert(mbArtists).values(act(1));

    const summary = await run(
      clientWith(async () => ({ found: true, imageUrl: null })),
    );
    expect(summary).toMatchObject({ refreshed: 0, empty: 1 });
    expect(await readPhotos()).toEqual([
      { mbid: id(1), photoUrl: null, photoFetchedAt: NOW },
    ]);

    const again = await run(
      clientWith(async () => {
        throw new Error('a freshly stamped row must not be looked up again');
      }),
    );
    expect(again).toMatchObject({ refreshed: 0, empty: 0, failures: 0 });
  });

  it('clears a stored photo when Spotify no longer has the id', async () => {
    await testDb.insert(mbArtists).values(act(1));
    await testDb.insert(mbArtistPhotos).values({
      mbid: id(1),
      photoUrl: 'https://i.scdn.co/image/gone',
      photoFetchedAt: new Date(NOW.getTime() - 30 * DAY_MS),
    });

    await run(clientWith(async () => ({ found: false })));

    expect(await readPhotos()).toEqual([
      { mbid: id(1), photoUrl: null, photoFetchedAt: NOW },
    ]);
  });

  it('ends the run on a rate limit and leaves the rest for tomorrow', async () => {
    await testDb.insert(mbArtists).values([act(1), act(2), act(3)]);
    let calls = 0;

    const summary = await run(
      clientWith(async () => {
        calls += 1;
        if (calls === 2) throw new SpotifyRateLimitError();
        return { found: true, imageUrl: 'https://i.scdn.co/image/ok' };
      }),
    );

    expect(calls).toBe(2);
    expect(summary).toMatchObject({
      refreshed: 1,
      abortedReason: 'rate_limit',
    });
    expect((await readPhotos()).map((row) => row.mbid)).toEqual([id(1)]);
  });

  it('keeps going past one failed lookup', async () => {
    await testDb.insert(mbArtists).values([act(1), act(2)]);
    let calls = 0;

    const summary = await run(
      clientWith(async () => {
        calls += 1;
        if (calls === 1) throw new Error('boom');
        return { found: true, imageUrl: 'https://i.scdn.co/image/ok' };
      }),
    );

    expect(summary).toMatchObject({ refreshed: 1, failures: 1 });
    // The failed row is stamped (no photo), so a bad id waits a cycle.
    expect(await readPhotos()).toEqual([
      { mbid: id(1), photoUrl: null, photoFetchedAt: NOW },
      {
        mbid: id(2),
        photoUrl: 'https://i.scdn.co/image/ok',
        photoFetchedAt: NOW,
      },
    ]);
  });

  it('keeps a photo row through a weekly mb_artists swap', async () => {
    await testDb.insert(mbArtists).values(act(1));
    await testDb.insert(mbArtistPhotos).values({
      mbid: id(1),
      photoUrl: 'https://i.scdn.co/image/kept',
      photoFetchedAt: NOW,
    });
    const options: LoadMbArtistsOptions = { minRows: 0, minShareOfCurrent: 0 };
    const reloaded: MbArtistRow = {
      mbid: id(1),
      name: 'Act 1',
      sortName: 'Act 1',
      aliases: [],
      type: 'Group',
      area: null,
      disambiguation: null,
      spotifyId: 'sp1',
      wikidataId: 'Q1',
    };
    async function* rows(): AsyncGenerator<MbArtistRow> {
      yield reloaded;
    }

    await loadMbArtists(testDb.$client, rows(), options);

    expect(
      await testDb
        .select({ url: mbArtistPhotos.photoUrl })
        .from(mbArtistPhotos)
        .where(eq(mbArtistPhotos.mbid, id(1))),
    ).toEqual([{ url: 'https://i.scdn.co/image/kept' }]);
  });
});
