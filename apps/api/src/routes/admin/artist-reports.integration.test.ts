// Admin side of wrong-artist reports: the queue filter and counts, the reports
// panel, dismiss, and closing reports (with notifications) on an identity fix.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

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

import {
  artistReports,
  artists,
  auditLog,
  notifications,
  userArtistFollows,
} from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { testDb } from '../../test/helpers/db.js';
import { clearTables, seedArtist } from '../../test/helpers/seed.js';

const app = createApp();

const ADMIN = 'admin_report_test';
const HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
};
const SPOTIFY_ID = '4Z8W4fKeB5YxbusRsdQVPb';

const setRole = (role: string): void => {
  authState.current = { userId: ADMIN, sessionClaims: { metadata: { role } } };
};

const call = (
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> =>
  app.request(`/v1/admin/artists${path}`, {
    method,
    headers: HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const report = async (
  artistId: string,
  reporterId: string,
  overrides: Partial<typeof artistReports.$inferInsert> = {},
) => {
  const [row] = await testDb
    .insert(artistReports)
    .values({ artistId, reporterId, reason: 'different_artist', ...overrides })
    .returning();
  if (!row) throw new Error('seed failed');
  return row;
};

const reportRows = (artistId: string) =>
  testDb
    .select()
    .from(artistReports)
    .where(eq(artistReports.artistId, artistId));

describe('admin artist reports', () => {
  let artist: typeof artists.$inferSelect;

  beforeEach(async () => {
    await clearTables();
    await testDb.delete(auditLog).where(eq(auditLog.actorId, ADMIN));
    setRole('admin');
    artist = await seedArtist({
      name: 'Nightjar Choir',
      matchStatus: 'matched',
      spotifyArtistId: 'sp_wrong',
    });
  });

  describe('queue', () => {
    it('lists reported artists with their open report count, whatever the match status', async () => {
      const other = await seedArtist({
        name: 'Quiet One',
        matchStatus: 'no_match',
      });
      await report(artist.id, 'user_a');
      await report(artist.id, 'user_b');
      await report(other.id, 'user_a', { status: 'withdrawn' });

      const res = await call('GET', '?status=reported&upcoming=false');
      const body = (await res.json()) as {
        data: { id: string; openReportCount: number }[];
        total: number;
      };
      expect(body.total).toBe(1);
      expect(body.data).toMatchObject([{ id: artist.id, openReportCount: 2 }]);
    });

    it('counts reported artists once each, apart from the status buckets', async () => {
      await report(artist.id, 'user_a');
      await report(artist.id, 'user_b');
      const res = await call('GET', '/counts?upcoming=false');
      const { data } = (await res.json()) as {
        data: { reported: number; matched: number };
      };
      expect(data.reported).toBe(1);
      expect(data.matched).toBe(1);
    });

    it('serves the badge count per artist, and requires an admin', async () => {
      await report(artist.id, 'user_a');
      await report(artist.id, 'user_b');
      const res = await call('GET', '/reports/count');
      expect(await res.json()).toMatchObject({ data: { count: 1 } });

      setRole('user');
      expect((await call('GET', '/reports/count')).status).toBe(403);
      expect((await call('GET', `/${artist.id}/reports`)).status).toBe(403);
      expect((await call('POST', `/${artist.id}/reports/dismiss`)).status).toBe(
        403,
      );
    });
  });

  describe('GET /:id/reports', () => {
    it('returns open reports oldest first with the matched-now summary', async () => {
      await report(artist.id, 'user_a', {
        note: 'Wrong band',
        suggestedSpotifyArtistId: SPOTIFY_ID,
        createdAt: new Date('2026-11-01T00:00:00Z'),
      });
      await report(artist.id, 'user_b', {
        reason: 'wrong_photo',
        createdAt: new Date('2026-11-02T00:00:00Z'),
      });
      await report(artist.id, 'user_c', { status: 'dismissed' });
      await testDb.insert(userArtistFollows).values({
        userId: 'user_f',
        artistName: 'Nightjar Choir',
        canonicalName: artist.canonicalName,
        source: 'manual',
      });

      const res = await call('GET', `/${artist.id}/reports`);
      expect(res.status).toBe(200);
      const { data } = (await res.json()) as {
        data: {
          matched: { name: string; followerCount: number; nextShow: unknown };
          reports: {
            reason: string;
            note: string | null;
            suggestedSpotifyArtistId: string | null;
          }[];
        };
      };
      expect(data.reports.map((r) => r.reason)).toEqual([
        'different_artist',
        'wrong_photo',
      ]);
      expect(data.reports[0]).toMatchObject({
        note: 'Wrong band',
        suggestedSpotifyArtistId: SPOTIFY_ID,
      });
      expect(data.matched).toMatchObject({
        name: 'Nightjar Choir',
        followerCount: 1,
        nextShow: null,
      });
    });

    it('404s for an unknown artist', async () => {
      const res = await call(
        'GET',
        '/00000000-0000-4000-8000-000000000000/reports',
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /:id/reports/dismiss', () => {
    it('closes every open report as dismissed, audits it and notifies nobody', async () => {
      await report(artist.id, 'user_a');
      await report(artist.id, 'user_b');
      const res = await call('POST', `/${artist.id}/reports/dismiss`);
      expect(await res.json()).toMatchObject({ data: { closed: 2 } });

      const rows = await reportRows(artist.id);
      expect(rows.every((r) => r.status === 'dismissed')).toBe(true);
      expect(rows[0]).toMatchObject({ resolvedBy: ADMIN });
      expect(rows[0]?.resolvedAt).toBeInstanceOf(Date);
      expect(await testDb.select().from(notifications)).toHaveLength(0);
      const audit = await testDb
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.actorId, ADMIN),
            eq(auditLog.action, 'artist.reports.dismiss'),
          ),
        );
      expect(audit).toHaveLength(1);
    });
  });

  describe('closing on an identity fix', () => {
    const fix = (body: unknown) => call('PATCH', `/${artist.id}`, body);

    it('closes open reports as fixed and notifies each reporter once', async () => {
      const first = await report(artist.id, 'user_a');
      await report(artist.id, 'user_b');
      await report(artist.id, 'user_c', { status: 'withdrawn' });

      const res = await fix({ spotifyArtistId: SPOTIFY_ID });
      expect(res.status).toBe(200);

      const rows = await reportRows(artist.id);
      expect(rows.filter((r) => r.status === 'fixed')).toHaveLength(2);
      expect(rows.find((r) => r.reporterId === 'user_c')?.status).toBe(
        'withdrawn',
      );

      const sent = await testDb.select().from(notifications);
      expect(sent.map((n) => n.userId).sort()).toEqual(['user_a', 'user_b']);
      expect(sent[0]).toMatchObject({
        type: 'user_notification',
        category: 'artist.report_fixed',
        title: 'We fixed Nightjar Choir’s page.',
        actionUrl: `/artists/${artist.slug}`,
      });
      expect(sent.map((n) => n.dedupeKey)).toContain(
        `artist-report:${first.id}:fixed`,
      );
    });

    it('says the wrong match was taken off when the fix clears it', async () => {
      await report(artist.id, 'user_a');
      const res = await fix({ spotifyArtistId: null });
      expect(res.status).toBe(200);
      const [sent] = await testDb.select().from(notifications);
      expect(sent).toMatchObject({
        title: 'We fixed Nightjar Choir’s page.',
        body: 'Thanks to your report, we took the wrong photo and music off it.',
        actionUrl: `/artists/${artist.slug}`,
      });
    });

    it('is a no-op for reports when there are none', async () => {
      expect((await fix({ spotifyArtistId: SPOTIFY_ID })).status).toBe(200);
      expect(await testDb.select().from(notifications)).toHaveLength(0);
    });

    it('Not an artist closes as fixed and sends no page link', async () => {
      await report(artist.id, 'user_a', { reason: 'not_an_artist' });
      const res = await fix({
        spotifyArtistId: null,
        matchStatus: 'not_an_artist',
      });
      expect(res.status).toBe(200);
      const [sent] = await testDb.select().from(notifications);
      expect(sent).toMatchObject({
        userId: 'user_a',
        actionUrl: null,
        title: 'We removed Nightjar Choir’s page.',
      });
      expect((await reportRows(artist.id))[0]?.status).toBe('fixed');
    });

    it('Looks right on an auto-match dismisses without notifying', async () => {
      await testDb
        .update(artists)
        .set({ autoMatchedAt: new Date(), spotifyArtistId: SPOTIFY_ID })
        .where(eq(artists.id, artist.id));
      await report(artist.id, 'user_a');
      const res = await fix({
        spotifyArtistId: SPOTIFY_ID,
        confirmAutoMatch: true,
      });
      expect(res.status).toBe(200);
      expect((await reportRows(artist.id))[0]?.status).toBe('dismissed');
      expect(await testDb.select().from(notifications)).toHaveLength(0);
    });

    it('leaves reports open when the PATCH is rejected', async () => {
      await report(artist.id, 'user_a');
      const res = await fix({
        spotifyArtistId: SPOTIFY_ID,
        matchStatus: 'ambiguous',
      });
      expect(res.status).toBe(400);
      expect((await reportRows(artist.id))[0]?.status).toBe('open');
    });

    it('does not double-notify when a second fix follows', async () => {
      await report(artist.id, 'user_a');
      await fix({ spotifyArtistId: SPOTIFY_ID });
      await fix({ spotifyArtistId: 'sp_other_one' });
      expect(await testDb.select().from(notifications)).toHaveLength(1);
    });
  });
});
