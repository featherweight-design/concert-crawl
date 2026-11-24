import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { mbArtistPhotos, mbArtists } from '@concert-crawl/db';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { createApp } from '../app.js';
import { PHOTO_MAX_AGE_DAYS } from '../lib/artist-photo.js';
import { testDb } from '../test/helpers/db.js';
import { clearTables } from '../test/helpers/seed.js';

// The MusicBrainz half of `GET /v1/search/artists?scope=all` carries the photo
// the cron cached in `mb_artist_photos`, under the 30-day reader ceiling.

const app = createApp();
const DAY_MS = 24 * 60 * 60 * 1000;

const id = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const responseSchema = z.object({
  data: z.array(
    z.object({ name: z.string(), photoUrl: z.string().nullable() }),
  ),
});

const search = async (query: string) => {
  const res = await app.request(
    `/v1/search/artists?q=${encodeURIComponent(query)}&scope=all`,
  );
  expect(res.status).toBe(200);
  return responseSchema.parse(await res.json()).data;
};

describe('GET /v1/search/artists?scope=all MusicBrainz photos', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.delete(mbArtists);
    await testDb.delete(mbArtistPhotos);
    await testDb.insert(mbArtists).values([
      { mbid: id(1), name: 'Zorbo Fresh' },
      { mbid: id(2), name: 'Zorbo Aged' },
      { mbid: id(3), name: 'Zorbo Empty' },
      { mbid: id(4), name: 'Zorbo Unfetched' },
    ]);
    await testDb.insert(mbArtistPhotos).values([
      {
        mbid: id(1),
        photoUrl: 'https://i.scdn.co/image/fresh',
        photoFetchedAt: new Date(Date.now() - 2 * DAY_MS),
      },
      {
        mbid: id(2),
        photoUrl: 'https://i.scdn.co/image/aged',
        photoFetchedAt: new Date(
          Date.now() - (PHOTO_MAX_AGE_DAYS + 1) * DAY_MS,
        ),
      },
      { mbid: id(3), photoUrl: null, photoFetchedAt: new Date() },
    ]);
  });

  it('serves a fresh photo and nothing for aged, empty or unfetched rows', async () => {
    const byName = new Map(
      (await search('Zorbo')).map((row) => [row.name, row.photoUrl]),
    );
    expect(byName.get('Zorbo Fresh')).toBe('https://i.scdn.co/image/fresh');
    expect(byName.get('Zorbo Aged')).toBeNull();
    expect(byName.get('Zorbo Empty')).toBeNull();
    expect(byName.get('Zorbo Unfetched')).toBeNull();
    expect(byName.size).toBe(4);
  });
});
