// Integration tests for POST /v1/artists/follow { mbid } (artist-search plan
// PR 5): following a MusicBrainz act that may have no Denver show and no
// `artists` row yet, and the page and prune behaviour that follow unlocks.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: { current: null as { userId: string } | null },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { artists, mbArtists, userArtistFollows } from '@concert-crawl/db';
import { pruneArtists } from '@concert-crawl/db/scripts/prune-artists';
import { createApp } from '../app.js';
import { MBID_FOLLOW_LIMIT } from './artist-follows.js';
import { testDb } from '../test/helpers/db.js';
import { clearTables, seedArtist } from '../test/helpers/seed.js';

const app = createApp();
const USER_ID = 'user_mbid_follow_test';
const MBID = '0383dadf-2a4e-4d10-a46a-e9e041da8eb3';
const OTHER_MBID = '1b2c3d4e-0000-4000-8000-000000000001';

const followMbid = async (body: unknown): Promise<Response> =>
  app.request('/v1/artists/follow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const followRows = async () =>
  testDb
    .select()
    .from(userArtistFollows)
    .where(eq(userArtistFollows.userId, USER_ID));

describe('POST /v1/artists/follow — integration', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    await testDb.delete(mbArtists);
  });

  it('401s without a session', async () => {
    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(401);
  });

  it('400s a body that is not a uuid', async () => {
    authState.current = { userId: USER_ID };
    const res = await followMbid({ mbid: 'queen' });
    expect(res.status).toBe(400);
  });

  it('404s an MBID the slim table does not hold', async () => {
    authState.current = { userId: USER_ID };
    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(404);
    expect(await followRows()).toHaveLength(0);
  });

  it('creates a lightweight row from the slim table and follows it by MBID', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { following: true, slug: 'big-thief' },
    });

    const [row] = await testDb
      .select()
      .from(artists)
      .where(eq(artists.mbid, MBID));
    expect(row).toMatchObject({
      name: 'Big Thief',
      canonicalName: 'big thief',
      slug: 'big-thief',
      matchStatus: 'unmatched',
      spotifyArtistId: null,
    });

    const follows = await followRows();
    expect(follows).toHaveLength(1);
    expect(follows[0]).toMatchObject({
      canonicalName: 'big thief',
      artistName: 'Big Thief',
      source: 'manual',
      mbid: MBID,
    });
  });

  it('is idempotent: a second follow writes no second row of either kind', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });

    await followMbid({ mbid: MBID });
    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);
    expect(await followRows()).toHaveLength(1);
    expect(await testDb.select().from(artists)).toHaveLength(1);
  });

  it('reuses the row that already holds the MBID, whatever its name', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({
      name: 'Big Thief (band)',
      mbid: MBID,
      spotifyArtistId: 'sp_big_thief',
    });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);
    expect(await testDb.select().from(artists)).toHaveLength(1);
    expect((await followRows())[0]).toMatchObject({
      canonicalName: 'big thief (band)',
      spotifyArtistId: 'sp_big_thief',
      mbid: MBID,
    });
  });

  it('follows a same-name row with no MBID by name and leaves its MBID alone', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    const existing = await seedArtist({ name: 'Big Thief' });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);

    const [row] = await testDb
      .select()
      .from(artists)
      .where(eq(artists.id, existing.id));
    expect(row?.mbid).toBeNull();
    expect((await followRows())[0]).toMatchObject({
      canonicalName: 'big thief',
      mbid: MBID,
    });
  });

  it('409s when a different act holds the name, and writes nothing', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({ name: 'Big Thief', mbid: OTHER_MBID });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(409);
    expect(await followRows()).toHaveLength(0);
    expect(await testDb.select().from(artists)).toHaveLength(1);
  });

  it('404s a hidden row, like the slug follow', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({ name: 'Big Thief', mbid: MBID, hidden: true });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(404);
    expect(await followRows()).toHaveLength(0);
  });

  it('404s a hidden row holding the name with another MBID, never a 409', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({ name: 'Big Thief', mbid: OTHER_MBID, hidden: true });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(404);
  });

  it('404s a row a human ruled not an artist', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({ name: 'Big Thief', matchStatus: 'not_an_artist' });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(404);
    expect(await followRows()).toHaveLength(0);
  });

  it('429s past the hourly limit', async () => {
    authState.current = { userId: USER_ID };
    for (let i = 0; i < MBID_FOLLOW_LIMIT; i++) {
      expect((await followMbid({ mbid: MBID })).status).toBe(404);
    }
    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).not.toBeNull();
  });

  it('records the MBID on an existing slug follow of the same row', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({ name: 'Big Thief', mbid: MBID });
    await testDb.insert(userArtistFollows).values({
      userId: USER_ID,
      artistName: 'Big Thief',
      canonicalName: 'big thief',
      source: 'manual',
    });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);
    const follows = await followRows();
    expect(follows).toHaveLength(1);
    expect(follows[0]?.mbid).toBe(MBID);
  });

  it('suffixes the slug when another artist already has the base', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big-Thief' });
    await seedArtist({ name: 'Big Thief' });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);
    const [row] = await testDb
      .select()
      .from(artists)
      .where(eq(artists.mbid, MBID));
    expect(row?.slug).toBe('big-thief-2');
    // The response carries the suffixed slug, so the client can unfollow it.
    expect(await res.json()).toEqual({
      success: true,
      data: { following: true, slug: 'big-thief-2' },
    });
  });

  it('returns the slug of a row that already holds the MBID', async () => {
    authState.current = { userId: USER_ID };
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
    await seedArtist({ name: 'Big Thief', slug: 'the-big-thief', mbid: MBID });

    const res = await followMbid({ mbid: MBID });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { following: true, slug: 'the-big-thief' },
    });
  });
});

describe('a row an MBID follow holds', () => {
  beforeEach(async () => {
    authState.current = { userId: USER_ID };
    await clearTables();
    await testDb.delete(mbArtists);
    await testDb.insert(mbArtists).values({ mbid: MBID, name: 'Big Thief' });
  });

  it('serves its page with no shows', async () => {
    await followMbid({ mbid: MBID });
    const res = await app.request('/v1/artists/big-thief');
    expect(res.status).toBe(200);
  });

  it('still 404s a no-show row nobody followed by MBID', async () => {
    await seedArtist({ name: 'Big Thief', mbid: MBID });
    const res = await app.request('/v1/artists/big-thief');
    expect(res.status).toBe(404);
  });

  it('still 404s a no-show row followed only by slug', async () => {
    await seedArtist({ name: 'Big Thief' });
    await testDb.insert(userArtistFollows).values({
      userId: USER_ID,
      artistName: 'Big Thief',
      canonicalName: 'big thief',
      source: 'manual',
    });
    const res = await app.request('/v1/artists/big-thief');
    expect(res.status).toBe(404);
  });

  it('survives prune while the follow holds it, and goes once it does not', async () => {
    await followMbid({ mbid: MBID });

    const held = await pruneArtists(testDb, { dryRun: false });
    expect(held.deleted).toBe(0);
    expect(await testDb.select().from(artists)).toHaveLength(1);

    await testDb
      .delete(userArtistFollows)
      .where(eq(userArtistFollows.userId, USER_ID));
    const freed = await pruneArtists(testDb, { dryRun: false });
    expect(freed.deleted).toBe(1);
  });

  it('serves the page of a no-MBID row followed by name', async () => {
    await seedArtist({ name: 'Big Thief' });
    await followMbid({ mbid: MBID });
    const res = await app.request('/v1/artists/big-thief');
    expect(res.status).toBe(200);
  });

  it('stops holding a row that later gains a different MBID', async () => {
    const row = await seedArtist({ name: 'Big Thief' });
    await followMbid({ mbid: MBID });
    await testDb
      .update(artists)
      .set({ mbid: OTHER_MBID })
      .where(eq(artists.id, row.id));

    expect((await app.request('/v1/artists/big-thief')).status).toBe(404);
    const result = await pruneArtists(testDb, { dryRun: false });
    expect(result.deleted).toBe(1);
  });

  it('survives prune when followed by name onto a row with no MBID', async () => {
    await seedArtist({ name: 'Big Thief' });
    await followMbid({ mbid: MBID });

    const result = await pruneArtists(testDb, { dryRun: false });
    expect(result.deleted).toBe(0);
  });
});
