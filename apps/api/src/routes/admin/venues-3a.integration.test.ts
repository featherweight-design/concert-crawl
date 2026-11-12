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
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { auditLog, venues } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import {
  clearTables,
  seedCrawlRun,
  seedEvent,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const setAuth = (userId = 'admin_1'): void => {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'admin' } },
  };
};

const json = (method: string, path: string, body?: unknown) =>
  app.request(`/v1/admin/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const venueRow = async (id: string) => {
  const [row] = await testDb.select().from(venues).where(eq(venues.id, id));
  return row;
};

const auditOf = async (action: string) =>
  testDb.select().from(auditLog).where(eq(auditLog.action, action));

describe('admin venues API, redesign 3a', () => {
  beforeEach(async () => {
    setAuth();
    await clearTables();
  });

  describe('list', () => {
    it('leaves a taken-down venue out', async () => {
      await seedVenue({ name: 'Live', slug: 'live' });
      await seedVenue({
        name: 'Gone',
        slug: 'gone',
        removedAt: new Date('2026-11-01T00:00:00Z'),
        active: false,
      });
      const body = (await (await json('GET', 'venues')).json()) as {
        data: { name: string }[];
      };
      expect(body.data.map((row) => row.name)).toEqual(['Live']);
    });

    it('carries the latest run with its time, counts, reason and a cut error', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      await seedCrawlRun(venue.id, {
        status: 'success',
        createdAt: new Date('2026-11-10T09:00:00Z'),
      });
      await seedCrawlRun(venue.id, {
        status: 'failed',
        reason: null,
        eventsFound: 0,
        eventsInserted: 0,
        errorMessage: 'x'.repeat(900),
        createdAt: new Date('2026-11-11T09:00:00Z'),
      });
      const body = (await (await json('GET', 'venues')).json()) as {
        data: {
          lastRunStatus: string;
          latestRun: {
            status: string;
            at: string;
            eventsFound: number;
            eventsInserted: number;
            errorMessage: string;
          } | null;
        }[];
      };
      expect(body.data[0]?.lastRunStatus).toBe('failed');
      expect(body.data[0]?.latestRun).toMatchObject({
        status: 'failed',
        at: '2026-11-11T09:00:00.000Z',
        eventsFound: 0,
        eventsInserted: 0,
      });
      expect(body.data[0]?.latestRun?.errorMessage).toHaveLength(300);
    });

    it('has a null latest run for a venue that never crawled', async () => {
      await seedVenue({ name: 'Fresh', slug: 'fresh' });
      const body = (await (await json('GET', 'venues')).json()) as {
        data: { latestRun: unknown }[];
      };
      expect(body.data[0]?.latestRun).toBeNull();
    });
  });

  describe('pause', () => {
    it('records who paused it, keeps the first pauser on an edit, and clears it on resume', async () => {
      const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
      setAuth('admin_a');
      await json('POST', `venues/${venue.id}/crawl-pause`, {
        reason: 'waiting_on_permission',
      });
      expect((await venueRow(venue.id))?.crawlPausedBy).toBe('admin_a');
      setAuth('admin_b');
      await json('POST', `venues/${venue.id}/crawl-pause`, {
        reason: 'site_broken_or_moved',
      });
      expect((await venueRow(venue.id))?.crawlPausedBy).toBe('admin_a');
      await json('DELETE', `venues/${venue.id}/crawl-pause`);
      expect((await venueRow(venue.id))?.crawlPausedBy).toBeNull();
    });

    it('names who paused it and who hid it on the list and the detail: a handle, else "a former admin", else null', async () => {
      const paused = await seedVenue({
        name: 'Paused By Hugh',
        slug: 'p-hugh',
      });
      const gone = await seedVenue({ name: 'Paused By Gone', slug: 'p-gone' });
      const hidden = await seedVenue({
        name: 'Hidden By Hugh',
        slug: 'h-hugh',
      });
      const auto = await seedVenue({
        name: 'Auto Paused',
        slug: 'auto',
        crawlPausedAt: new Date('2026-11-01T00:00:00Z'),
      });
      await seedUserProfile('admin_hugh', { handle: 'hugh' });
      setAuth('admin_hugh');
      await json('POST', `venues/${paused.id}/crawl-pause`, {
        reason: 'waiting_on_permission',
      });
      await json('PATCH', `venues/${hidden.id}`, {
        active: false,
        hideReason: 'venue_closed',
      });
      // An admin whose account (and profile) is gone.
      setAuth('admin_gone');
      await json('POST', `venues/${gone.id}/crawl-pause`, {
        reason: 'waiting_on_permission',
      });

      const list = (await (await json('GET', 'venues')).json()) as {
        data: {
          id: string;
          crawlPausedByName: string | null;
          hiddenByName: string | null;
        }[];
      };
      const row = (id: string) => list.data.find((item) => item.id === id);
      expect(row(paused.id)).toMatchObject({
        crawlPausedByName: 'hugh',
        hiddenByName: null,
      });
      expect(row(gone.id)?.crawlPausedByName).toBe('a former admin');
      expect(row(hidden.id)).toMatchObject({
        crawlPausedByName: null,
        hiddenByName: 'hugh',
      });
      // A crawler auto-pause has no pauser at all.
      expect(row(auto.id)?.crawlPausedByName).toBeNull();

      const detail = (await (
        await json('GET', `venues/${paused.id}`)
      ).json()) as { data: { crawlPausedByName: string | null } };
      expect(detail.data.crawlPausedByName).toBe('hugh');
    });
  });

  describe('hide', () => {
    it('stores the reason, note, time and who, and audits venue.hide', async () => {
      const venue = await seedVenue({ name: 'Closed Club', slug: 'closed' });
      await seedEvent(venue.id, { date: '2099-01-01' });
      setAuth('admin_h');
      const res = await json('PATCH', `venues/${venue.id}`, {
        active: false,
        hideReason: 'other',
        hideNote: 'Renovation through March.',
      });
      expect(res.status).toBe(200);
      const row = await venueRow(venue.id);
      expect(row).toMatchObject({
        active: false,
        hiddenBy: 'admin_h',
        hiddenReason: 'other',
        hiddenNote: 'Renovation through March.',
      });
      expect(row?.hiddenAt).toBeInstanceOf(Date);
      const [audit] = await auditOf('venue.hide');
      expect(audit?.metadata).toMatchObject({
        reason: 'other',
        note: 'Renovation through March.',
        upcomingShows: 1,
      });
    });

    it('needs a note for Other, and still works without a reason for an older caller', async () => {
      const venue = await seedVenue({ name: 'Old Caller', slug: 'old-caller' });
      expect(
        (
          await json('PATCH', `venues/${venue.id}`, {
            active: false,
            hideReason: 'other',
          })
        ).status,
      ).toBe(422);
      expect((await venueRow(venue.id))?.active).toBe(true);
      expect(
        (await json('PATCH', `venues/${venue.id}`, { active: false })).status,
      ).toBe(200);
      expect(await venueRow(venue.id)).toMatchObject({
        active: false,
        hiddenReason: null,
      });
    });

    it('keeps the first hider when hidden again, and clears the explanation on show', async () => {
      const venue = await seedVenue({ name: 'Twice', slug: 'twice' });
      setAuth('admin_1');
      await json('PATCH', `venues/${venue.id}`, {
        active: false,
        hideReason: 'venue_closed',
      });
      setAuth('admin_2');
      await json('PATCH', `venues/${venue.id}`, {
        active: false,
        hideReason: 'not_music_venue',
      });
      expect(await venueRow(venue.id)).toMatchObject({
        hiddenBy: 'admin_1',
        hiddenReason: 'venue_closed',
      });
      await json('PATCH', `venues/${venue.id}`, { active: true });
      expect(await venueRow(venue.id)).toMatchObject({
        active: true,
        hiddenAt: null,
        hiddenBy: null,
        hiddenReason: null,
        hiddenNote: null,
      });
      expect((await auditOf('venue.show')).length).toBe(1);
    });
  });

  describe('hide, edge cases', () => {
    it('does not ask for a note when nothing is being hidden', async () => {
      const venue = await seedVenue({ name: 'Plain', slug: 'plain' });
      const res = await json('PATCH', `venues/${venue.id}`, {
        hideReason: 'other',
        name: 'Plain Renamed',
      });
      expect(res.status).toBe(200);
      expect((await venueRow(venue.id))?.hiddenReason).toBeNull();
    });

    it('gives a venue hidden before reasons existed its reason when hidden again', async () => {
      const venue = await seedVenue({
        name: 'Old Hidden',
        slug: 'old-hidden',
        active: false,
      });
      await json('PATCH', `venues/${venue.id}`, {
        active: false,
        hideReason: 'venue_closed',
      });
      expect(await venueRow(venue.id)).toMatchObject({
        hiddenReason: 'venue_closed',
        hiddenBy: 'admin_1',
      });
    });
  });

  describe('delete', () => {
    it('exposes what a delete would destroy on the detail, for the menu', async () => {
      const venue = await seedVenue({ name: 'Busy', slug: 'busy' });
      const past = await seedEvent(venue.id, { date: '2020-01-01' });
      const future = await seedEvent(venue.id, { date: '2099-01-01' });
      await seedUserEvent('user_a', past.id);
      await seedUserEvent('user_a', future.id);
      await seedUserEvent('user_b', future.id);
      const body = (await (await json('GET', `venues/${venue.id}`)).json()) as {
        data: { deleteBlockers: Record<string, number> };
      };
      expect(body.data.deleteBlockers).toEqual({
        pastShows: 1,
        upcomingShows: 1,
        watchers: 2,
      });
    });

    it('refuses with the same counts when only a Watcher is left', async () => {
      const venue = await seedVenue({ name: 'Watched', slug: 'watched' });
      const past = await seedEvent(venue.id, { date: '2020-01-01' });
      await seedUserEvent('user_a', past.id);
      const res = await json('DELETE', `venues/${venue.id}`);
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({
        code: 'has_history',
        pastShows: 1,
        upcomingShows: 0,
        watchers: 1,
      });
    });
  });

  describe('re-crawl', () => {
    it('is refused when robots.txt disallows it, force included, and queues nothing', async () => {
      const venue = await seedVenue({
        name: 'Closed Door',
        slug: 'closed-door',
        robotsTxtAllowed: false,
      });
      for (const body of [undefined, { force: true }]) {
        const res = await json('POST', `crawl/${venue.id}`, body);
        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ code: 'robots_disallowed' });
      }
    });

    it('still queues a venue robots.txt allows, or has not checked yet', async () => {
      const allowed = await seedVenue({
        name: 'Open',
        slug: 'open',
        robotsTxtAllowed: true,
      });
      const unchecked = await seedVenue({ name: 'New', slug: 'new-one' });
      expect((await json('POST', `crawl/${allowed.id}`)).status).toBe(202);
      expect((await json('POST', `crawl/${unchecked.id}`)).status).toBe(202);
    });
  });
});
