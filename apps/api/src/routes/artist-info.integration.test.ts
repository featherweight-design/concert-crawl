// Integration tests for GET /v1/artists/:slug/info (artist-search plan PR 6):
// the visibility gate that runs before the resolver, the facts read from the
// slim table, and the image order of plan decision 5. Wikimedia is faked at
// the global fetch.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { mbArtists, userArtistFollows } from '@concert-crawl/db';
import type { ArtistInfoResponse } from '@concert-crawl/types';
import { createApp } from '../app.js';
import { resetArtistInfoMemo } from '../lib/artist-info.js';
import { testDb } from '../test/helpers/db.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();
const MBID = '0383dadf-2a4e-4d10-a46a-e9e041da8eb3';
const QID = 'Q1299';

const json = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });

const wikimedia = vi.fn(async (input: string | URL | Request) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.hostname === 'www.wikidata.org') {
    return json({
      entities: {
        [QID]: {
          sitelinks: { enwiki: { title: 'Big Thief' } },
          claims: {
            P18: [
              {
                rank: 'normal',
                mainsnak: { datavalue: { value: 'Band.jpg' } },
              },
            ],
          },
        },
      },
    });
  }
  if (url.hostname === 'en.wikipedia.org') {
    return json({
      type: 'standard',
      title: 'Big Thief',
      extract: 'Big Thief is an American indie rock band.',
      content_urls: {
        desktop: { page: 'https://en.wikipedia.org/wiki/Big_Thief' },
      },
    });
  }
  return json({
    query: {
      pages: [
        {
          imagerepository: 'local',
          imageinfo: [
            {
              thumburl:
                'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Band.jpg/640px-Band.jpg',
              descriptionurl:
                'https://commons.wikimedia.org/wiki/File:Band.jpg',
              extmetadata: {
                License: { value: 'cc-by-4.0' },
                LicenseShortName: { value: 'CC BY 4.0' },
                Artist: { value: 'Jo' },
              },
            },
          ],
        },
      ],
    },
  });
});

const getInfo = (slug: string) => app.request(`/v1/artists/${slug}/info`);

const readInfo = async (res: Response): Promise<ArtistInfoResponse> => {
  const body: { data: ArtistInfoResponse } = await res.json();
  return body.data;
};

/** A row a visible event bills, so the gate lets it through. */
const seedBilledArtist = async (
  overrides: Parameters<typeof seedArtist>[0] = {},
) => {
  const artist = await seedArtist({ name: 'Big Thief', ...overrides });
  const venue = await seedVenue();
  await seedEvent(venue.id, { artist: 'Big Thief' });
  return artist;
};

describe('GET /v1/artists/:slug/info — integration', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.delete(mbArtists);
    resetArtistInfoMemo();
    wikimedia.mockClear();
    vi.stubGlobal('fetch', wikimedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('404s an unknown slug', async () => {
    expect((await getInfo('nobody')).status).toBe(404);
  });

  it('404s a hidden row and a not_an_artist row before any Wikimedia call', async () => {
    await testDb
      .insert(mbArtists)
      .values({ mbid: MBID, name: 'Big Thief', wikidataId: QID });
    await seedBilledArtist({ mbid: MBID, hidden: true });
    const hidden = await getInfo('big-thief');
    expect(hidden.status).toBe(404);
    expect(hidden.headers.get('Cache-Control')).toBeNull();

    await clearTables();
    await seedBilledArtist({ mbid: MBID, matchStatus: 'not_an_artist' });
    expect((await getInfo('big-thief')).status).toBe(404);
    expect(wikimedia).not.toHaveBeenCalled();
  });

  it('404s a row nothing bills and no MBID follow holds, as the page does', async () => {
    await seedArtist({ name: 'Big Thief', mbid: MBID });
    expect((await getInfo('big-thief')).status).toBe(404);
  });

  it('answers a no-show row an MBID follow holds', async () => {
    await seedArtist({ name: 'Big Thief', mbid: MBID });
    await testDb.insert(userArtistFollows).values({
      userId: 'user_info_test',
      artistName: 'Big Thief',
      canonicalName: 'big thief',
      source: 'manual',
      mbid: MBID,
    });
    expect((await getInfo('big-thief')).status).toBe(200);
  });

  it('answers facts, the Wikipedia summary and a Commons photo, publicly cacheable', async () => {
    await testDb.insert(mbArtists).values({
      mbid: MBID,
      name: 'Big Thief',
      type: 'Group',
      area: 'United States',
      disambiguation: 'Brooklyn indie rock band',
      spotifyId: 'sp_mb',
      wikidataId: QID,
    });
    await seedBilledArtist({ mbid: MBID });

    const res = await getInfo('big-thief');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('public');
    expect(await readInfo(res)).toEqual({
      facts: {
        mbid: MBID,
        type: 'Group',
        area: 'United States',
        disambiguation: 'Brooklyn indie rock band',
        links: {
          musicbrainz: `https://musicbrainz.org/artist/${MBID}`,
          wikidata: `https://www.wikidata.org/wiki/${QID}`,
          spotify: 'https://open.spotify.com/artist/sp_mb',
        },
      },
      summary: {
        extract: 'Big Thief is an American indie rock band.',
        articleTitle: 'Big Thief',
        articleUrl: 'https://en.wikipedia.org/wiki/Big_Thief',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
      image: {
        source: 'commons',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Band.jpg/640px-Band.jpg',
        credit: 'Jo',
        license: 'CC BY 4.0',
        licenseUrl: null,
        fileUrl: 'https://commons.wikimedia.org/wiki/File:Band.jpg',
      },
    });

    // A second request is answered from the memo.
    await getInfo('big-thief');
    expect(wikimedia).toHaveBeenCalledTimes(3);
  });

  it('puts our Spotify photo and Spotify match ahead of MusicBrainz and Commons', async () => {
    await testDb.insert(mbArtists).values({
      mbid: MBID,
      name: 'Big Thief',
      spotifyId: 'sp_mb',
      wikidataId: QID,
    });
    await seedBilledArtist({
      mbid: MBID,
      spotifyArtistId: 'sp_ours',
      photoUrl: 'https://i.scdn.co/image/ours',
      photoFetchedAt: new Date(),
    });

    const info = await readInfo(await getInfo('big-thief'));
    expect(info.image).toEqual({
      source: 'spotify',
      url: 'https://i.scdn.co/image/ours',
    });
    expect(info.facts?.links.spotify).toBe(
      'https://open.spotify.com/artist/sp_ours',
    );
  });

  it('falls back to Commons when the Spotify photo is past its 30-day ceiling', async () => {
    await testDb
      .insert(mbArtists)
      .values({ mbid: MBID, name: 'Big Thief', wikidataId: QID });
    await seedBilledArtist({
      mbid: MBID,
      photoUrl: 'https://i.scdn.co/image/stale',
      photoFetchedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1_000),
    });

    const info = await readInfo(await getInfo('big-thief'));
    expect(info.image?.source).toBe('commons');
  });

  it('answers nulls with no Wikimedia call for a row with no MBID', async () => {
    await seedBilledArtist();
    const info = await readInfo(await getInfo('big-thief'));
    expect(info).toEqual({ image: null, facts: null, summary: null });
    expect(wikimedia).not.toHaveBeenCalled();
  });
});
