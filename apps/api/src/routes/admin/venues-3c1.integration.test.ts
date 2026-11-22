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
import { auditLog, venues } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { VENUE_DRAFT_CODE } from './lib/venue-hide.js';

// Admin 3c-1, draft safety: a draft is `active = false` and
// `went_live_at IS NULL`. It is saved like any venue, stays off every public
// read and out of every crawl, and reaches the site only through Go live.

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

const NEW_VENUE = {
  name: 'The Bug Theatre',
  slug: 'bug-theatre',
  websiteUrl: 'https://bugtheatre.example.com',
  // Skips the background vendor detection, which would fetch the site.
  ticketVendor: 'unknown',
};

const auditRows = (action: string, targetId: string) =>
  testDb
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.action, action), eq(auditLog.targetId, targetId)));

const seedDraft = () =>
  seedVenue({
    name: 'The Bug Theatre',
    slug: 'bug-theatre',
    active: false,
    wentLiveAt: null,
  });

describe('admin venues API, 3c-1 draft safety', () => {
  beforeEach(async () => {
    setAuth();
    await clearTables();
  });

  describe('create', () => {
    it('saves a draft as hidden with no went_live_at, audited as a draft', async () => {
      const res = await request('POST', '/v1/admin/venues', {
        ...NEW_VENUE,
        draft: true,
      });
      expect(res.status).toBe(201);
      const { data } = (await res.json()) as { data: { id: string } };

      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, data.id));
      expect(row?.active).toBe(false);
      expect(row?.wentLiveAt).toBeNull();

      const audits = await auditRows('venue.create', data.id);
      expect(audits).toHaveLength(1);
      expect(audits[0]?.metadata).toEqual({ draft: true });
    });

    it('a draft stays a draft even when the body says active', async () => {
      const res = await request('POST', '/v1/admin/venues', {
        ...NEW_VENUE,
        active: true,
        draft: true,
      });
      const { data } = (await res.json()) as { data: { id: string } };
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, data.id));
      expect(row?.active).toBe(false);
      expect(row?.wentLiveAt).toBeNull();
    });

    it('without draft, creates a live venue stamped went_live_at', async () => {
      const res = await request('POST', '/v1/admin/venues', NEW_VENUE);
      expect(res.status).toBe(201);
      const { data } = (await res.json()) as { data: { id: string } };
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, data.id));
      expect(row?.active).toBe(true);
      expect(row?.wentLiveAt).toBeInstanceOf(Date);
    });

    it('an update cannot make a venue a draft', async () => {
      const venue = await seedVenue();
      const res = await request('PATCH', `/v1/admin/venues/${venue.id}`, {
        draft: true,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('saving a draft step', () => {
    it('saves edits and leaves it a hidden draft', async () => {
      const draft = await seedDraft();
      const res = await request('PATCH', `/v1/admin/venues/${draft.id}`, {
        address: '1940 Lowell Blvd, Denver',
      });
      expect(res.status).toBe(200);
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.address).toBe('1940 Lowell Blvd, Denver');
      expect(row?.active).toBe(false);
      expect(row?.wentLiveAt).toBeNull();
    });
  });

  describe('Hide', () => {
    it('writes no hide record on a draft, which was never on the site', async () => {
      const draft = await seedDraft();
      const res = await request('PATCH', `/v1/admin/venues/${draft.id}`, {
        active: false,
        hideReason: 'other',
        hideNote: 'not yet',
      });
      expect(res.status).toBe(200);
      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.hiddenAt).toBeNull();
      expect(row?.hiddenReason).toBeNull();
      expect(await auditRows('venue.hide', draft.id)).toHaveLength(0);
    });
  });

  describe('Show', () => {
    it('refuses a draft with 409, writing nothing and auditing nothing', async () => {
      const draft = await seedDraft();
      const res = await request('PATCH', `/v1/admin/venues/${draft.id}`, {
        active: true,
      });
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: VENUE_DRAFT_CODE });

      const [row] = await testDb
        .select()
        .from(venues)
        .where(eq(venues.id, draft.id));
      expect(row?.active).toBe(false);
      expect(await auditRows('venue.show', draft.id)).toHaveLength(0);
    });

    it('still shows a hidden venue that has been live', async () => {
      const hidden = await seedVenue({ active: false });
      const res = await request('PATCH', `/v1/admin/venues/${hidden.id}`, {
        active: true,
      });
      expect(res.status).toBe(200);
      expect(await auditRows('venue.show', hidden.id)).toHaveLength(1);
    });
  });

  describe('stays off the site and out of crawls', () => {
    it('is absent from the public venue list and its page', async () => {
      await seedVenue({ name: 'Gothic', slug: 'gothic' });
      await seedDraft();

      const list = await request('GET', '/v1/venues');
      expect(list.status).toBe(200);
      const { data } = (await list.json()) as { data: { slug: string }[] };
      expect(data.map((venue) => venue.slug)).toEqual(['gothic']);

      const page = await request('GET', '/v1/venues/bug-theatre');
      expect(page.status).toBe(404);
    });

    it('refuses an on-demand crawl', async () => {
      const draft = await seedDraft();
      const res = await request('POST', `/v1/admin/crawl/${draft.id}`);
      expect(res.status).toBe(400);
    });

    it('has no next daily crawl on its detail', async () => {
      const draft = await seedDraft();
      const res = await request('GET', `/v1/admin/venues/${draft.id}`);
      expect(res.status).toBe(200);
      const { data } = (await res.json()) as {
        data: { nextCrawlAt: string | null; wentLiveAt: string | null };
      };
      expect(data.nextCrawlAt).toBeNull();
      expect(data.wentLiveAt).toBeNull();
    });
  });
});
