import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { auditLog, venues } from '@concert-crawl/db';
import { CRAWLER_USER_AGENT } from '@concert-crawl/types';
import type {
  VenueLastFullRun,
  VenueLatestRun,
  VenueDeleteBlockers,
} from '@concert-crawl/types';
import { createApp } from '../../app.js';
import {
  clearTables,
  seedCrawlRun,
  seedEvent,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { addDays, denverDate } from './lib/needs-you/keys.js';

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

const inDays = (days: number): string => addDays(denverDate(new Date()), days);

interface DetailBody {
  data: {
    upcomingShows: number;
    hiddenUpcomingShows: number;
    lastFullRun: VenueLastFullRun | null;
    latestRun: VenueLatestRun | null;
    deleteBlockers: VenueDeleteBlockers;
    lat: number | null;
    lng: number | null;
    contactEmail: string | null;
  };
}

const detail = async (id: string): Promise<DetailBody['data']> => {
  const res = await json('GET', `venues/${id}`);
  expect(res.status).toBe(200);
  const body: DetailBody = await res.json();
  return body.data;
};

const venueRow = async (id: string) => {
  const [row] = await testDb.select().from(venues).where(eq(venues.id, id));
  return row;
};

describe('admin venues API, redesign 3b', () => {
  beforeEach(async () => {
    setAuth();
    await clearTables();
  });

  describe('detail', () => {
    it('splits upcoming shows by hidden, leaving past shows out', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      await seedEvent(venue.id, { artist: 'Today Act', date: inDays(0) });
      await seedEvent(venue.id, { artist: 'Later Act', date: inDays(9) });
      await seedEvent(venue.id, {
        artist: 'Hidden Act',
        date: inDays(4),
        hiddenFromConsumer: true,
      });
      await seedEvent(venue.id, { artist: 'Past Act', date: inDays(-3) });
      await seedEvent(venue.id, {
        artist: 'Past Hidden',
        date: inDays(-3),
        hiddenFromConsumer: true,
      });

      const data = await detail(venue.id);
      expect(data.upcomingShows).toBe(2);
      expect(data.hiddenUpcomingShows).toBe(1);
      // One upcoming rule: the split adds up to the delete guard's count.
      expect(data.upcomingShows + data.hiddenUpcomingShows).toBe(
        data.deleteBlockers.upcomingShows,
      );
    });

    it('carries the latest run in the list shape and the last success run', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      const other = await seedVenue({ name: 'Other', slug: 'other' });
      await seedCrawlRun(venue.id, {
        status: 'success',
        eventsFound: 40,
        createdAt: new Date('2026-11-09T10:00:00Z'),
      });
      await seedCrawlRun(venue.id, {
        status: 'success',
        eventsFound: 42,
        createdAt: new Date('2026-11-10T10:00:00Z'),
      });
      const skipped = await seedCrawlRun(venue.id, {
        status: 'skipped',
        reason: 'page_unchanged',
        eventsFound: 0,
        eventsInserted: 0,
        createdAt: new Date('2026-11-11T10:00:00Z'),
      });
      await seedCrawlRun(other.id, {
        status: 'failed',
        createdAt: new Date('2026-11-12T10:00:00Z'),
      });

      const data = await detail(venue.id);
      expect(data.lastFullRun).toEqual({
        at: '2026-11-10T10:00:00.000Z',
        eventsFound: 42,
      });
      expect(data.latestRun).toEqual({
        id: skipped.id,
        status: 'skipped',
        reason: 'page_unchanged',
        at: '2026-11-11T10:00:00.000Z',
        eventsFound: 0,
        eventsInserted: 0,
        errorMessage: null,
      });

      // The list carries the same shape, id included.
      const list: {
        data: { id: string; latestRun: VenueLatestRun | null }[];
      } = await (await json('GET', 'venues')).json();
      const row = list.data.find((entry) => entry.id === venue.id);
      expect(row?.latestRun).toEqual(data.latestRun);
    });

    it('cuts a long error to 300 characters on the latest run', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      await seedCrawlRun(venue.id, {
        status: 'failed',
        errorMessage: 'x'.repeat(900),
      });
      const data = await detail(venue.id);
      expect(data.latestRun?.errorMessage).toHaveLength(300);
      expect(data.lastFullRun).toBeNull();
    });

    it('answers zeros and nulls for a venue with no shows and no runs', async () => {
      const venue = await seedVenue({ name: 'New', slug: 'new' });
      const data = await detail(venue.id);
      expect(data.upcomingShows).toBe(0);
      expect(data.hiddenUpcomingShows).toBe(0);
      expect(data.lastFullRun).toBeNull();
      expect(data.latestRun).toBeNull();
      expect(data.lat).toBeNull();
      expect(data.lng).toBeNull();
      expect(data.contactEmail).toBeNull();
    });
  });

  describe('PATCH map pin and contact email', () => {
    it('saves lat, lng and a trimmed contact email, audited as venue.update', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      const res = await json('PATCH', `venues/${venue.id}`, {
        lat: 39.6542,
        lng: -104.9877,
        contactEmail: '  booking@gothic.example  ',
      });
      expect(res.status).toBe(200);

      const row = await venueRow(venue.id);
      expect(row?.lat).toBe(39.6542);
      expect(row?.lng).toBe(-104.9877);
      expect(row?.contactEmail).toBe('booking@gothic.example');

      const audits = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'venue.update'));
      expect(audits).toHaveLength(1);
      expect(audits[0]?.targetId).toBe(venue.id);
      expect(audits[0]?.actorId).toBe('admin_1');

      const data = await detail(venue.id);
      expect(data.contactEmail).toBe('booking@gothic.example');
    });

    it('clears them with null, and an empty email with an empty string', async () => {
      const venue = await seedVenue({
        name: 'Gothic',
        slug: 'gothic',
        lat: 39.6,
        lng: -104.9,
        contactEmail: 'old@gothic.example',
      });
      expect(
        (await json('PATCH', `venues/${venue.id}`, { lat: null, lng: null }))
          .status,
      ).toBe(200);
      expect(
        (await json('PATCH', `venues/${venue.id}`, { contactEmail: '   ' }))
          .status,
      ).toBe(200);
      const row = await venueRow(venue.id);
      expect(row?.lat).toBeNull();
      expect(row?.lng).toBeNull();
      expect(row?.contactEmail).toBeNull();
    });

    it.each([
      [{ lat: 90.1, lng: 0 }],
      [{ lat: -91, lng: 0 }],
      [{ lat: 0, lng: 180.5 }],
      [{ lat: 0, lng: -181 }],
      [{ lat: '39.6', lng: 0 }],
      // Half a pin, on a venue with none.
      [{ lat: 39.6 }],
      [{ lng: -104.9 }],
      [{ lat: 39.6, lng: null }],
      [{ contactEmail: 'not-an-email' }],
      [{ contactEmail: `${'a'.repeat(250)}@x.co` }],
    ])('rejects %j with a 400 and changes nothing', async (body) => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      const res = await json('PATCH', `venues/${venue.id}`, body);
      expect(res.status).toBe(400);
      const row = await venueRow(venue.id);
      expect(row?.lat).toBeNull();
      expect(row?.contactEmail).toBeNull();
    });

    it('accepts the edges of the ranges', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
      const res = await json('PATCH', `venues/${venue.id}`, {
        lat: -90,
        lng: 180,
      });
      expect(res.status).toBe(200);
      const row = await venueRow(venue.id);
      expect(row?.lat).toBe(-90);
      expect(row?.lng).toBe(180);
    });

    it('checks the pin as a pair against the saved row', async () => {
      const venue = await seedVenue({
        name: 'Gothic',
        slug: 'gothic',
        lat: 39.6,
        lng: -104.9,
      });
      // Moving one half of a saved pin keeps a whole pin.
      expect(
        (await json('PATCH', `venues/${venue.id}`, { lat: 39.7 })).status,
      ).toBe(200);
      // Clearing one half would leave half a pin.
      const half = await json('PATCH', `venues/${venue.id}`, { lng: null });
      expect(half.status).toBe(400);
      const row = await venueRow(venue.id);
      expect(row?.lat).toBe(39.7);
      expect(row?.lng).toBe(-104.9);
    });

    it('leaves an unrelated PATCH alone on a row that already has half a pin', async () => {
      const venue = await seedVenue({ name: 'Gothic', slug: 'gothic', lat: 1 });
      expect(
        (await json('PATCH', `venues/${venue.id}`, { featured: true })).status,
      ).toBe(200);
    });

    it('audits the before and after of a pin or email change, and nothing when unchanged', async () => {
      const venue = await seedVenue({
        name: 'Gothic',
        slug: 'gothic',
        contactEmail: 'old@gothic.example',
      });
      await json('PATCH', `venues/${venue.id}`, {
        lat: 39.6,
        lng: -104.9,
        contactEmail: 'old@gothic.example',
      });
      await json('PATCH', `venues/${venue.id}`, {
        contactEmail: 'new@gothic.example',
      });
      await json('PATCH', `venues/${venue.id}`, { name: 'Gothic Theatre' });

      const audits = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'venue.update'))
        .orderBy(auditLog.createdAt);
      expect(audits.map((audit) => audit.metadata)).toEqual([
        {
          contact: {
            before: { lat: null, lng: null },
            after: { lat: 39.6, lng: -104.9 },
          },
        },
        {
          contact: {
            before: { contactEmail: 'old@gothic.example' },
            after: { contactEmail: 'new@gothic.example' },
          },
        },
        null,
      ]);
    });
  });

  // 3b part 6a: the crawl rules are shown, never edited (ruling d). For one
  // release (#404) a key sent with its stored value is tolerated and stripped,
  // because the deployed web can lag the API; a changed one is refused.
  describe('PATCH and the crawl rules', () => {
    const seedSourceVenue = () =>
      seedVenue({
        name: 'Gothic',
        slug: 'gothic',
        crawlDelayMs: 5000,
        robotsTxtAllowed: false,
        robotsTxtCheckedAt: new Date('2026-11-11T10:00:00Z'),
      });

    const expectRulesUntouched = async (id: string) => {
      const row = await venueRow(id);
      expect(row?.crawlDelayMs).toBe(5000);
      expect(row?.robotsTxtAllowed).toBe(false);
      expect(row?.robotsTxtCheckedAt?.toISOString()).toBe(
        '2026-11-11T10:00:00.000Z',
      );
    };

    it.each([
      ['crawlDelayMs', { crawlDelayMs: 5000 }],
      ['robotsTxtAllowed', { robotsTxtAllowed: false }],
      [
        'robotsTxtCheckedAt',
        { robotsTxtCheckedAt: '2026-11-11T10:00:00.000Z' },
      ],
      // The same instant in Mountain Time is the same value.
      [
        'robotsTxtCheckedAt',
        { robotsTxtCheckedAt: '2026-11-11T03:00:00-07:00' },
      ],
      ['userAgent', { userAgent: CRAWLER_USER_AGENT }],
    ])(
      'tolerates %s sent with its stored value: saves the rest, writes and audits no rule',
      async (key, rule) => {
        const venue = await seedSourceVenue();
        const res = await json('PATCH', `venues/${venue.id}`, {
          name: 'Gothic Theatre',
          ...rule,
        });
        expect(res.status).toBe(200);

        expect((await venueRow(venue.id))?.name).toBe('Gothic Theatre');
        await expectRulesUntouched(venue.id);

        const audits = await testDb
          .select()
          .from(auditLog)
          .where(eq(auditLog.action, 'venue.update'));
        expect(audits).toHaveLength(1);
        expect(JSON.stringify(audits[0]?.metadata ?? null)).not.toContain(key);
      },
    );

    // The old web's venue save: every field, the stored delay among them.
    it('accepts the old web shape { name, crawlDelayMs: <stored> }', async () => {
      const venue = await seedSourceVenue();
      const res = await json('PATCH', `venues/${venue.id}`, {
        name: 'Gothic Theatre',
        crawlDelayMs: 5000,
      });
      expect(res.status).toBe(200);
      expect((await venueRow(venue.id))?.name).toBe('Gothic Theatre');
      await expectRulesUntouched(venue.id);
    });

    it.each([
      [{ crawlDelayMs: 1000 }],
      [{ crawlDelayMs: 3000 }],
      [{ crawlDelayMs: 30000 }],
      [{ robotsTxtAllowed: true }],
      [{ robotsTxtAllowed: null }],
      [{ robotsTxtCheckedAt: null }],
      [{ robotsTxtCheckedAt: '2026-11-11T10:00:01.000Z' }],
      [{ userAgent: 'ConcertCrawl/2.0' }],
      // An unchanged key does not carry a changed one through.
      [{ crawlDelayMs: 5000, robotsTxtAllowed: true }],
      // Riding along with a valid Source save does not get it through.
      [{ websiteUrl: 'https://gothic.example/new', crawlDelayMs: 1000 }],
      [{ websiteUrl: 'https://gothic.example/new', robotsTxtAllowed: true }],
      [{ name: 'Gothic Theatre', userAgent: 'ConcertCrawl/2.0' }],
    ])(
      'refuses %j with a 400, writes nothing and audits nothing',
      async (body) => {
        const venue = await seedSourceVenue();
        const res = await json('PATCH', `venues/${venue.id}`, body);
        expect(res.status).toBe(400);
        const resBody: { error: { issues: Array<{ message: string }> } } =
          await res.json();
        expect(resBody.error.issues[0]?.message).toMatch(
          /^Fixed by the crawl rules/,
        );

        await expectRulesUntouched(venue.id);
        const row = await venueRow(venue.id);
        expect(row?.name).toBe('Gothic');
        expect(row?.websiteUrl).toBe(venue.websiteUrl);
        expect(row?.updatedAt.toISOString()).toBe(
          venue.updatedAt.toISOString(),
        );
        expect(await testDb.select().from(auditLog)).toHaveLength(0);
      },
    );

    it.each(['javascript:alert(1)', 'ftp://gothic.example/events'])(
      'refuses a calendar page of %s',
      async (websiteUrl) => {
        const venue = await seedSourceVenue();
        const res = await json('PATCH', `venues/${venue.id}`, { websiteUrl });
        expect(res.status).toBe(400);
        expect((await venueRow(venue.id))?.websiteUrl).toBe(venue.websiteUrl);
      },
    );

    it('saves a valid change, leaves the crawl rules alone and audits it', async () => {
      const venue = await seedSourceVenue();
      const res = await json('PATCH', `venues/${venue.id}`, {
        websiteUrl: 'https://gothic.example/calendar',
        extractionStrategy: 'structured_data',
        apiProvider: null,
        apiAccountId: null,
        platform: null,
        platformVenueId: null,
        crawlMode: 'http',
        crawlWaitUntil: 'load',
        crawlWaitForSelector: null,
      });
      expect(res.status).toBe(200);

      const row = await venueRow(venue.id);
      expect(row?.websiteUrl).toBe('https://gothic.example/calendar');
      expect(row?.extractionStrategy).toBe('structured_data');
      expect(row?.crawlMode).toBe('http');
      expect(row?.crawlWaitUntil).toBe('load');
      expect(row?.crawlDelayMs).toBe(5000);
      expect(row?.robotsTxtAllowed).toBe(false);

      const audits = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'venue.update'));
      expect(audits).toHaveLength(1);
      expect(audits[0]?.targetId).toBe(venue.id);
      expect(audits[0]?.actorId).toBe('admin_1');
    });
  });
});
