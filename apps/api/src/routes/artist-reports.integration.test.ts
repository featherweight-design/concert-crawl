import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import type { ArtistDetailResponse } from '@concert-crawl/types';
import { artistReports, artists } from '@concert-crawl/db';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();

const REPORTER = 'user_reporter';
const OTHER = 'user_other';
const SPOTIFY_ID = '4Z8W4fKeB5YxbusRsdQVPb';
const MATCHED_ID = '1111111111111111111111';

function setAuth(userId: string): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  };
}

const post = (slug: string, body: unknown): Promise<Response> =>
  app.request(`/v1/artists/${slug}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
    body: JSON.stringify(body),
  });

const withdraw = (slug: string): Promise<Response> =>
  app.request(`/v1/artists/${slug}/reports/mine`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test-token' },
  });

const rows = (artistId: string) =>
  testDb
    .select()
    .from(artistReports)
    .where(eq(artistReports.artistId, artistId));

describe('artist reports — integration', () => {
  let artistId: string;
  let slug: string;

  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    const artist = await seedArtist({
      name: 'Nightjar Choir',
      spotifyArtistId: MATCHED_ID,
      spotifyCandidates: [
        {
          id: MATCHED_ID,
          name: 'Nightjar Choir',
          imageUrl: null,
          genres: ['folk', 'choir'],
          spotifyUrl: `https://open.spotify.com/artist/${MATCHED_ID}`,
        },
      ],
    });
    artistId = artist.id;
    slug = artist.slug;
  });

  describe('POST /v1/artists/:slug/reports', () => {
    it('returns 401 without auth', async () => {
      const res = await post(slug, { reason: 'different_artist' });
      expect(res.status).toBe(401);
    });

    it('files a report and stores only the parsed Spotify id', async () => {
      setAuth(REPORTER);
      const res = await post(slug, {
        reason: 'different_artist',
        spotifyLink: `https://open.spotify.com/artist/${SPOTIFY_ID}?si=abc`,
        note: '  The Denver band, not the Dublin one.  ',
      });
      expect(res.status).toBe(201);

      const [row] = await rows(artistId);
      expect(row).toMatchObject({
        reporterId: REPORTER,
        reason: 'different_artist',
        suggestedSpotifyArtistId: SPOTIFY_ID,
        note: 'The Denver band, not the Dublin one.',
        status: 'open',
      });
    });

    it('treats a blank link and note as not given', async () => {
      setAuth(REPORTER);
      const res = await post(slug, {
        reason: 'wrong_photo',
        spotifyLink: '  ',
        note: '',
      });
      expect(res.status).toBe(201);
      const [row] = await rows(artistId);
      expect(row?.suggestedSpotifyArtistId).toBeNull();
      expect(row?.note).toBeNull();
    });

    it('returns 422 for an unknown reason', async () => {
      setAuth(REPORTER);
      expect((await post(slug, { reason: 'bogus' })).status).toBe(422);
    });

    it('returns 422 for a link that is not a Spotify artist', async () => {
      setAuth(REPORTER);
      const res = await post(slug, {
        reason: 'different_artist',
        spotifyLink: `https://open.spotify.com/track/${SPOTIFY_ID}`,
      });
      expect(res.status).toBe(422);
      expect(await res.json()).toMatchObject({ code: 'invalid_spotify_link' });
      expect(await rows(artistId)).toHaveLength(0);
    });

    it('returns 422 for a note moderation rejects, and a note over 280', async () => {
      setAuth(REPORTER);
      const email = await post(slug, {
        reason: 'other',
        note: 'mail me at someone@example.com',
      });
      expect(email.status).toBe(422);
      expect(await email.json()).toMatchObject({ code: 'note_rejected' });
      const long = await post(slug, { reason: 'other', note: 'x'.repeat(281) });
      expect(long.status).toBe(422);
      expect(await rows(artistId)).toHaveLength(0);
    });

    it('returns 404 for an unknown slug and for a hidden artist', async () => {
      setAuth(REPORTER);
      expect((await post('nobody-here', { reason: 'other' })).status).toBe(404);

      const hidden = await seedArtist({ name: 'Festival Pass', hidden: true });
      expect((await post(hidden.slug, { reason: 'other' })).status).toBe(404);
    });

    it('returns 409 with the open report on a second report', async () => {
      setAuth(REPORTER);
      expect((await post(slug, { reason: 'wrong_photo' })).status).toBe(201);
      const res = await post(slug, { reason: 'other' });
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({
        code: 'report_exists',
        data: { reason: 'wrong_photo' },
      });
      expect(await rows(artistId)).toHaveLength(1);
    });

    it('does not spend the hourly allowance on repeat presses of an open report', async () => {
      setAuth(REPORTER);
      expect((await post(slug, { reason: 'other' })).status).toBe(201);
      for (let n = 0; n < 12; n++) {
        expect((await post(slug, { reason: 'other' })).status).toBe(409);
      }
    });

    it('lets two fans each hold an open report, and one fan re-report after withdrawing', async () => {
      setAuth(REPORTER);
      expect((await post(slug, { reason: 'wrong_photo' })).status).toBe(201);
      setAuth(OTHER);
      expect((await post(slug, { reason: 'wrong_photo' })).status).toBe(201);

      setAuth(REPORTER);
      expect((await withdraw(slug)).status).toBe(204);
      expect((await post(slug, { reason: 'other' })).status).toBe(201);
    });

    it('settles concurrent submits to one open row', async () => {
      setAuth(REPORTER);
      const results = await Promise.all([
        post(slug, { reason: 'other' }),
        post(slug, { reason: 'other' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await rows(artistId)).toHaveLength(1);
    });
  });

  describe('DELETE /v1/artists/:slug/reports/mine', () => {
    it('returns 401 without auth', async () => {
      expect((await withdraw(slug)).status).toBe(401);
    });

    it("withdraws only the caller's open report", async () => {
      setAuth(OTHER);
      await post(slug, { reason: 'other' });
      setAuth(REPORTER);
      await post(slug, { reason: 'other' });

      expect((await withdraw(slug)).status).toBe(204);

      const mine = await testDb
        .select()
        .from(artistReports)
        .where(
          and(
            eq(artistReports.artistId, artistId),
            eq(artistReports.reporterId, REPORTER),
          ),
        );
      expect(mine[0]).toMatchObject({ status: 'withdrawn' });
      expect(mine[0]?.resolvedAt).toBeInstanceOf(Date);
      const theirs = await testDb
        .select()
        .from(artistReports)
        .where(eq(artistReports.reporterId, OTHER));
      expect(theirs[0]?.status).toBe('open');
    });

    it('returns 404 with nothing open, and for an unknown slug', async () => {
      setAuth(REPORTER);
      expect((await withdraw(slug)).status).toBe(404);
      expect((await withdraw('nobody-here')).status).toBe(404);
    });
  });

  describe('GET /v1/artists/:slug', () => {
    beforeEach(async () => {
      const venue = await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' });
      await seedEvent(venue.id, {
        artist: 'Nightjar Choir',
        canonicalArtist: 'nightjar choir',
        date: '2099-01-01',
      });
    });

    const detail = async (): Promise<ArtistDetailResponse> => {
      const res = await app.request(`/v1/artists/${slug}`);
      expect(res.status).toBe(200);
      return ((await res.json()) as { data: ArtistDetailResponse }).data;
    };

    it('carries the match summary from the candidate snapshot', async () => {
      expect((await detail()).match).toEqual({
        spotifyArtistId: MATCHED_ID,
        spotifyUrl: `https://open.spotify.com/artist/${MATCHED_ID}`,
        genres: ['folk', 'choir'],
      });
    });

    it('leaves genres null when the snapshot has no matching entry', async () => {
      await testDb
        .update(artists)
        .set({ spotifyCandidates: null })
        .where(eq(artists.id, artistId));
      expect((await detail()).match).toMatchObject({
        spotifyArtistId: MATCHED_ID,
        genres: null,
      });
    });

    it('shows myOpenReport only to the reporter, and clears it on withdraw', async () => {
      setAuth(REPORTER);
      await post(slug, { reason: 'wrong_photo' });
      expect((await detail()).myOpenReport).toMatchObject({
        reason: 'wrong_photo',
      });

      setAuth(OTHER);
      expect((await detail()).myOpenReport).toBeNull();
      authState.current = null;
      expect((await detail()).myOpenReport).toBeNull();

      setAuth(REPORTER);
      await withdraw(slug);
      expect((await detail()).myOpenReport).toBeNull();
    });
  });
});
