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

import { and, eq } from 'drizzle-orm';
import {
  auditLog,
  crawlTriggers,
  feedback,
  venueSuggestionDismissals,
  venues,
} from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { parseSuggestion, venueNameKey } from './venue-go-live.js';
import { VENUE_DRAFT_CODE } from './lib/venue-hide.js';

// Admin 3c-3: Ask the venue, Go live and the suggestions list. Option A
// (plan decision 4): Go live sets `active` and `went_live_at` and queues a
// normal crawl at once.

const app = createApp();

const setAuth = (userId = 'admin_1'): void => {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'admin' } },
  };
};

const request = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const auditRows = (action: string) =>
  testDb.select().from(auditLog).where(eq(auditLog.action, action));

const seedDraft = (overrides: Partial<typeof venues.$inferInsert> = {}) =>
  seedVenue({
    name: 'The Bug Theatre',
    slug: 'bug-theatre',
    active: false,
    wentLiveAt: null,
    ...overrides,
  });

const suggest = (userId: string | null, message: string) =>
  testDb.insert(feedback).values({
    userId,
    pageUrl: '/venues',
    category: 'venue_suggestion',
    message,
  });

describe('venue name helpers', () => {
  it('keys two spellings of one name alike', () => {
    expect(venueNameKey('The Fox  Theatre')).toBe(
      venueNameKey('the fox theatre!'),
    );
    expect(venueNameKey('Dazzle')).not.toBe(venueNameKey('Dazzle Jazz'));
  });

  it('reads the name and the website from a suggestion', () => {
    expect(parseSuggestion('Dazzle\ndazzledenver.com')).toEqual({
      name: 'Dazzle',
      websiteUrl: 'dazzledenver.com',
    });
    expect(parseSuggestion('Dazzle')).toEqual({
      name: 'Dazzle',
      websiteUrl: null,
    });
    expect(parseSuggestion('  \n site.com')).toBeNull();
  });

  it('drops a website that is not a web address', () => {
    expect(
      parseSuggestion('Dazzle\njavascript:alert(1)')?.websiteUrl,
    ).toBeNull();
    expect(parseSuggestion('Dazzle\ndata:text/html,x')?.websiteUrl).toBeNull();
    expect(parseSuggestion('Dazzle\nnot a site')?.websiteUrl).toBeNull();
    expect(
      parseSuggestion('Dazzle\nhttps://dazzledenver.com/x')?.websiteUrl,
    ).toBe('https://dazzledenver.com/x');
  });
});

describe('admin venues API, 3c-3', () => {
  beforeEach(async () => {
    setAuth();
    await clearTables();
  });

  describe('ask the venue', () => {
    it('stamps permission_asked_at on a draft and touches no pause column', async () => {
      const draft = await seedDraft();
      const res = await request('POST', `/v1/admin/venues/${draft.id}/ask`);
      expect(res.status).toBe(200);
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.permissionAskedAt).not.toBeNull();
      expect(row?.crawlPausedAt).toBeNull();
      expect(row?.crawlResumeOn).toBeNull();
      expect(row?.active).toBe(false);
      const audits = await auditRows('venue.ask_permission');
      expect(audits).toHaveLength(1);
      expect(audits[0]?.targetId).toBe(draft.id);
    });

    it('works on a live venue and 404s a removed or unknown one', async () => {
      const live = await seedVenue({ slug: 'live-one' });
      expect(
        (await request('POST', `/v1/admin/venues/${live.id}/ask`)).status,
      ).toBe(200);
      const removed = await seedVenue({
        slug: 'gone',
        removedAt: new Date(),
      });
      expect(
        (await request('POST', `/v1/admin/venues/${removed.id}/ask`)).status,
      ).toBe(404);
      expect(
        (
          await request(
            'POST',
            '/v1/admin/venues/00000000-0000-4000-8000-000000000000/ask',
          )
        ).status,
      ).toBe(404);
    });

    it('refuses a non-admin', async () => {
      const draft = await seedDraft();
      authState.current = { userId: 'u1', sessionClaims: {} };
      const res = await request('POST', `/v1/admin/venues/${draft.id}/ask`);
      expect(res.status).toBeGreaterThanOrEqual(401);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('permission answer', () => {
    it('clears the ask on either answer and records the answer in the audit', async () => {
      const draft = await seedDraft({ permissionAskedAt: new Date() });
      const res = await request(
        'POST',
        `/v1/admin/venues/${draft.id}/permission-answer`,
        { answer: 'yes' },
      );
      expect(res.status).toBe(200);
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.permissionAskedAt).toBeNull();
      const audits = await auditRows('venue.permission_answer');
      expect(audits[0]?.metadata).toEqual({ answer: 'yes' });
    });

    it('409s a venue that was never asked and rejects an unknown answer', async () => {
      const draft = await seedDraft();
      const refused = await request(
        'POST',
        `/v1/admin/venues/${draft.id}/permission-answer`,
        { answer: 'no' },
      );
      expect(refused.status).toBe(409);
      const bad = await request(
        'POST',
        `/v1/admin/venues/${draft.id}/permission-answer`,
        { answer: 'maybe' },
      );
      expect(bad.status).toBe(400);
    });
  });

  describe('go live', () => {
    it('sets active and went_live_at, queues a normal crawl and audits it', async () => {
      const draft = await seedDraft({ permissionAskedAt: new Date() });
      const res = await request('POST', `/v1/admin/venues/${draft.id}/go-live`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: { crawl: { queued: boolean; triggerId?: string } };
      };
      expect(body.data.crawl.queued).toBe(true);

      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.active).toBe(true);
      expect(row?.wentLiveAt).not.toBeNull();
      expect(row?.permissionAskedAt).toBeNull();

      const triggers = await testDb
        .select()
        .from(crawlTriggers)
        .where(eq(crawlTriggers.venueId, draft.id));
      expect(triggers).toHaveLength(1);
      expect(triggers[0]?.mode).toBe('crawl');
      expect(triggers[0]?.triggeredBy).toBe('admin_1');

      const audits = await auditRows('venue.go_live');
      expect(audits).toHaveLength(1);
      expect(audits[0]?.metadata).toEqual({ crawlQueued: true });
    });

    it('409s a venue that is already live, and a second go live changes nothing', async () => {
      const draft = await seedDraft();
      expect(
        (await request('POST', `/v1/admin/venues/${draft.id}/go-live`)).status,
      ).toBe(200);
      const [first] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      const again = await request(
        'POST',
        `/v1/admin/venues/${draft.id}/go-live`,
      );
      expect(again.status).toBe(409);
      const [second] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(second?.wentLiveAt?.getTime()).toBe(first?.wentLiveAt?.getTime());
      expect(await auditRows('venue.go_live')).toHaveLength(1);
    });

    it('refuses a venue whose robots.txt disallows us and leaves it a draft', async () => {
      const draft = await seedDraft({ robotsTxtAllowed: false });
      const res = await request('POST', `/v1/admin/venues/${draft.id}/go-live`);
      expect(res.status).toBe(409);
      expect(((await res.json()) as { code: string }).code).toBe(
        'robots_disallowed',
      );
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.active).toBe(false);
      expect(row?.wentLiveAt).toBeNull();
      expect(await testDb.select().from(crawlTriggers)).toHaveLength(0);
    });

    it('404s a removed venue and an unknown id', async () => {
      const removed = await seedDraft({ removedAt: new Date() });
      expect(
        (await request('POST', `/v1/admin/venues/${removed.id}/go-live`))
          .status,
      ).toBe(404);
      expect(
        (
          await request(
            'POST',
            '/v1/admin/venues/00000000-0000-4000-8000-000000000000/go-live',
          )
        ).status,
      ).toBe(404);
    });

    it('keeps the venue off the site until it goes live', async () => {
      const draft = await seedDraft();
      const show = await request('PATCH', `/v1/admin/venues/${draft.id}`, {
        active: true,
      });
      // Show (unhide) refuses a draft: Go live is the only way in.
      expect(show.status).toBe(409);
      expect(((await show.json()) as { code: string }).code).toBe(
        VENUE_DRAFT_CODE,
      );
      const [row] = await testDb
        .select()
        .from(venues)
        .where(and(eq(venues.id, draft.id)));
      expect(row?.active).toBe(false);
    });
  });

  describe('suggestions', () => {
    it('groups by normalized name, counts fans once and sorts most asked first', async () => {
      await suggest('fan_1', 'Dazzle\ndazzledenver.com');
      await suggest('fan_1', 'dazzle!');
      await suggest('fan_2', 'The Dazzle');
      await suggest('fan_3', 'Dazzle');
      await suggest('fan_4', 'Cervantes');
      await suggest(null, 'Cervantes');
      await suggest('fan_5', '   ');
      const res = await request('GET', '/v1/admin/venues/suggestions');
      expect(res.status).toBe(200);
      const { data } = (await res.json()) as {
        data: { name: string; fans: number; websiteUrl: string | null }[];
      };
      expect(data.map((row) => [row.name, row.fans])).toEqual([
        ['Cervantes', 2],
        ['Dazzle', 2],
        ['The Dazzle', 1],
      ]);
      expect(data.find((row) => row.name === 'Dazzle')?.websiteUrl).toBe(
        'dazzledenver.com',
      );
    });

    it('skips a suggestion an admin already handled', async () => {
      await suggest('fan_1', 'Dazzle');
      await testDb.insert(feedback).values({
        userId: 'fan_2',
        pageUrl: '/venues',
        category: 'venue_suggestion',
        message: 'Cervantes',
        status: 'resolved',
      });
      const res = await request('GET', '/v1/admin/venues/suggestions');
      const { data } = (await res.json()) as { data: { name: string }[] };
      expect(data.map((row) => row.name)).toEqual(['Dazzle']);
    });

    it('is empty when nobody asked', async () => {
      const res = await request('GET', '/v1/admin/venues/suggestions');
      expect(((await res.json()) as { data: unknown[] }).data).toEqual([]);
    });

    it('hides a dismissed name, keeps it hidden on a repeat ask, and Undo brings it back', async () => {
      await suggest('fan_1', 'Dazzle');
      const dismiss = await request(
        'POST',
        '/v1/admin/venues/suggestions/dismiss',
        { name: 'Dazzle' },
      );
      expect(dismiss.status).toBe(200);
      // A second dismissal is a no-op, not an error.
      expect(
        (
          await request('POST', '/v1/admin/venues/suggestions/dismiss', {
            name: 'dazzle',
          })
        ).status,
      ).toBe(200);
      expect(
        await testDb.select().from(venueSuggestionDismissals),
      ).toHaveLength(1);

      await suggest('fan_9', 'Dazzle');
      const hidden = await request('GET', '/v1/admin/venues/suggestions');
      expect(((await hidden.json()) as { data: unknown[] }).data).toEqual([]);

      const undo = await request('POST', '/v1/admin/venues/suggestions/undo', {
        name: 'Dazzle',
      });
      expect(undo.status).toBe(200);
      const shown = await request('GET', '/v1/admin/venues/suggestions');
      const { data } = (await shown.json()) as {
        data: { fans: number }[];
      };
      expect(data).toHaveLength(1);
      expect(data[0]?.fans).toBe(2);

      expect(await auditRows('venue.suggestion.dismiss')).toHaveLength(2);
      expect(await auditRows('venue.suggestion.undo')).toHaveLength(1);
    });

    it('404s an Undo with nothing to undo', async () => {
      const res = await request('POST', '/v1/admin/venues/suggestions/undo', {
        name: 'Dazzle',
      });
      expect(res.status).toBe(404);
    });

    it('rejects a dismissal with no name', async () => {
      const res = await request(
        'POST',
        '/v1/admin/venues/suggestions/dismiss',
        { name: '  ' },
      );
      expect(res.status).toBe(400);
    });
  });
});
