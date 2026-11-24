import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { mbArtists } from '@concert-crawl/db';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import { clearTables, seedArtist } from '../test/helpers/seed.js';

// How the MusicBrainz half of `GET /v1/search/artists?scope=all` is ordered:
// real matches before substring hits, then notability (Spotify and Wikidata
// links), then closeness. Rows are only ordered, never dropped. The seeded
// mbids put the notable act LAST in id order wherever it matters, so a pass
// here cannot come from the final mbid tie-break.

const app = createApp();

const id = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const act = (
  n: number,
  name: string,
  links: { spotify?: boolean; wikidata?: boolean } = {},
  extra: Partial<typeof mbArtists.$inferInsert> = {},
): typeof mbArtists.$inferInsert => ({
  mbid: id(n),
  name,
  spotifyId: links.spotify ? `sp${n}` : null,
  wikidataId: links.wikidata ? `Q${n}` : null,
  ...extra,
});

const responseSchema = z.object({
  data: z.array(z.object({ name: z.string(), mbid: z.string().nullable() })),
});

const search = async (
  q: string,
): Promise<{ name: string; mbid: string | null }[]> => {
  const res = await app.request(
    `/v1/search/artists?q=${encodeURIComponent(q)}&scope=all`,
  );
  expect(res.status).toBe(200);
  return responseSchema.parse(await res.json()).data;
};

describe('scope=all MusicBrainz ranking', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.delete(mbArtists);
  });

  it('puts the linked act first among same-named acts: Jack White', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(1, 'Jack White'),
        act(2, 'Jack White', { spotify: true }),
        act(3, 'Jack White'),
        act(4, 'Jack White', { wikidata: true }),
        act(5, 'Jack White'),
        act(6, 'Jack White'),
        act(7, 'Jack White', { spotify: true, wikidata: true }),
      ]);

    const rows = await search('Jack White');
    expect(rows).toHaveLength(7);
    expect(rows[0]?.mbid).toBe(id(7));
    // One link beats none, and both one-link rows come before every bare one.
    expect(rows.slice(1, 3).map((row) => row.mbid)).toEqual([id(2), id(4)]);
  });

  it('ranks a close typo of a notable act above an exact unlinked act: Metalica', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(1, 'Metalica'),
        act(2, 'Metallica', { spotify: true, wikidata: true }),
      ]);

    const rows = await search('Metalica');
    expect(rows.map((row) => row.name)).toEqual(['Metallica', 'Metalica']);
  });

  it('puts the linked act first among exact same-named acts: Rezz', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(1, 'Rezz'),
        act(2, 'REZZ', { spotify: true, wikidata: true }),
      ]);

    const rows = await search('Rezz');
    expect(rows.map((row) => row.mbid)).toEqual([id(2), id(1)]);
  });

  it('does not let a notable weak match beat an exact match', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(1, 'Rezz'),
        act(2, 'Rezzo', { spotify: true, wikidata: true }),
        act(3, 'Rezza Collective', { spotify: true, wikidata: true }),
      ]);

    const rows = await search('Rezz');
    expect(rows[0]?.name).toBe('Rezz');
    // Weak matches are still listed, only ordered after the real one.
    expect(rows.map((row) => row.name).sort()).toEqual([
      'Rezz',
      'Rezza Collective',
      'Rezzo',
    ]);
  });

  it('puts the linked act first among exact same-named acts: Prof', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(1, 'Prof', {}, { area: 'Elsewhere' }),
        act(
          2,
          'Prof',
          { spotify: true, wikidata: true },
          { area: 'Minneapolis' },
        ),
      ]);

    const rows = await search('Prof');
    expect(rows.map((row) => row.mbid)).toEqual([id(2), id(1)]);
  });

  it('keeps an alias-only hit below a real match, however notable', async () => {
    await testDb
      .insert(mbArtists)
      .values([
        act(
          1,
          'Zed Band',
          { spotify: true, wikidata: true },
          { aliases: ['Quartz'] },
        ),
        act(2, 'Quartz'),
      ]);

    const rows = await search('Quartz');
    expect(rows.map((row) => row.mbid)).toEqual([id(2), id(1)]);
  });

  it('keeps our own artists ahead of every MusicBrainz row', async () => {
    await seedArtist({ name: 'Metallica Tribute Ours' });
    await testDb
      .insert(mbArtists)
      .values([act(2, 'Metallica', { spotify: true, wikidata: true })]);

    const rows = await search('Metallica');
    expect(rows.map((row) => row.name)).toEqual([
      'Metallica Tribute Ours',
      'Metallica',
    ]);
  });
});
