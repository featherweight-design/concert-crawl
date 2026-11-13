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

import { createApp } from '../../app.js';
import {
  clearTables,
  seedEvent,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { adminQueueSnoozes, auditLog, feedback } from '@concert-crawl/db';
import { eq } from 'drizzle-orm';
import type {
  NeedsYouCount,
  NeedsYouItem,
  NeedsYouNotUsefulSnooze,
} from '@concert-crawl/types';
import { addDays, denverDate } from './lib/needs-you/keys.js';

const app = createApp();

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
}

const inDays = (days: number): string => addDays(denverDate(new Date()), days);

interface ListBody {
  success: boolean;
  data: NeedsYouItem[];
  // Left out on a ?venueId= view.
  count?: NeedsYouCount;
}

interface SnoozesBody {
  success: boolean;
  data: NeedsYouNotUsefulSnooze[];
}

const list = async (query = ''): Promise<ListBody> => {
  const res = await app.request(`/v1/admin/needs-you${query}`);
  expect(res.status).toBe(200);
  return res.json();
};

const snoozes = async (venueId: string): Promise<SnoozesBody> => {
  const res = await app.request(
    `/v1/admin/needs-you/snoozes?venueId=${venueId}`,
  );
  expect(res.status).toBe(200);
  return res.json();
};

const unsnoozeById = (id: string): Promise<Response> =>
  app.request(`/v1/admin/needs-you/snoozes/${id}`, { method: 'DELETE' });

const itemUrl = (key: string): string =>
  `/v1/admin/needs-you/items/${encodeURIComponent(key)}/snooze`;

const notUseful = (key: string, reason?: string): Promise<Response> =>
  app.request(itemUrl(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notUseful: true, reason }),
  });

const lowKey = (eventId: string): string => `event-low-confidence:${eventId}`;

const seedLowConfidence = (venueId: string, artist: string, date: string) =>
  seedEvent(venueId, { artist, date, verified: false });

const UNKNOWN_VENUE = '11111111-1111-4111-8111-111111111111';

describe('admin needs-you, by venue (3b)', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('requires an admin on the snoozes list', async () => {
    setAuth('user');
    const res = await app.request(
      `/v1/admin/needs-you/snoozes?venueId=${UNKNOWN_VENUE}`,
    );
    expect(res.status).toBe(403);
    authState.current = null;
    expect(
      (
        await app.request(
          `/v1/admin/needs-you/snoozes?venueId=${UNKNOWN_VENUE}`,
        )
      ).status,
    ).toBe(401);
  });

  it('?venueId= narrows data to that venue and leaves the count out', async () => {
    setAuth('admin');
    const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const gothic = await seedVenue({ name: 'Gothic', slug: 'gothic' });
    const here = await seedLowConfidence(levitt.id, 'Here Act', inDays(5));
    await seedLowConfidence(gothic.id, 'There Act', inDays(6));
    await testDb.insert(feedback).values({
      pageUrl: 'https://concertcrawl.app/',
      category: 'bug',
      message: 'Broken thing',
    });

    const all = await list();
    expect(all.data).toHaveLength(3);

    const narrowed = await list(`?venueId=${levitt.id}`);
    expect(narrowed.data.map((item) => item.key)).toEqual([lowKey(here.id)]);
    // The venue view never shows the badge, so the summary isn't computed.
    expect(all.count).toBeDefined();
    expect(narrowed.count).toBeUndefined();
    // ?kind= alone still carries the whole-queue count.
    expect((await list('?kind=bug')).count).toEqual(all.count);

    // Combines with ?kind=.
    expect((await list(`?venueId=${levitt.id}&kind=bug`)).data).toEqual([]);

    // A venue with nothing waiting is an empty list, not an error.
    expect((await list(`?venueId=${UNKNOWN_VENUE}`)).data).toEqual([]);
  });

  it('answers 400 for a venueId that is not a uuid, on both routes', async () => {
    setAuth('admin');
    for (const path of [
      '/v1/admin/needs-you?venueId=not-a-uuid',
      '/v1/admin/needs-you/snoozes?venueId=not-a-uuid',
      '/v1/admin/needs-you/snoozes',
    ]) {
      expect((await app.request(path)).status).toBe(400);
    }
    const res = await app.request('/v1/admin/needs-you/snoozes/not-a-uuid', {
      method: 'DELETE',
    });
    expect(res.status).toBe(400);
  });

  it('lists the venue’s Not useful entries with the handle and reason, and turns one back on by id', async () => {
    setAuth('admin', 'admin-hugh');
    await seedUserProfile('admin-hugh', { handle: 'hugh' });
    const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const gothic = await seedVenue({ name: 'Gothic', slug: 'gothic' });
    const muted = await seedLowConfidence(levitt.id, 'Muted Act', inDays(5));
    const elsewhere = await seedLowConfidence(gothic.id, 'Other', inDays(5));

    expect((await notUseful(lowKey(muted.id), 'Always wrong')).status).toBe(
      200,
    );
    expect((await notUseful(lowKey(elsewhere.id))).status).toBe(200);
    // A timed snooze at the same venue is not a Not useful entry.
    const timed = await seedLowConfidence(levitt.id, 'Timed', inDays(7));
    await testDb.insert(adminQueueSnoozes).values({
      itemKey: lowKey(timed.id),
      kind: 'event-low-confidence',
      until: new Date(Date.now() + 3_600_000),
      createdBy: 'admin-hugh',
    });

    const body = await snoozes(levitt.id);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    const [entry] = body.data;
    expect(entry).toMatchObject({
      kind: 'event-low-confidence',
      venueId: levitt.id,
      reason: 'Always wrong',
      createdByName: 'hugh',
    });
    expect(entry).not.toHaveProperty('itemKey');
    expect(typeof entry?.createdAt).toBe('string');

    // Turn back on by id deletes only that row: the other venue's Not useful
    // and this venue's timed snooze stay.
    const id = entry?.id ?? '';
    const res = await unsnoozeById(id);
    expect(res.status).toBe(200);
    const deleted: { success: boolean; data: { id: string } } =
      await res.json();
    expect(deleted.data).toEqual({ id });
    expect((await snoozes(levitt.id)).data).toEqual([]);
    expect((await snoozes(gothic.id)).data).toHaveLength(1);
    const left = await testDb.select().from(adminQueueSnoozes);
    expect(left).toHaveLength(2);
    expect(left.map((row) => row.itemKey)).toContain(lowKey(timed.id));

    // The muted item is back in the queue; the timed one is still snoozed.
    const keys = (await list(`?venueId=${levitt.id}`)).data.map(
      (item) => item.key,
    );
    expect(keys).toEqual([lowKey(muted.id)]);

    // Audited like the per-item unsnooze.
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'needs_you.unsnooze'));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      targetId: id,
      actorId: 'admin-hugh',
      metadata: {
        notUseful: true,
        kind: 'event-low-confidence',
        venueId: levitt.id,
      },
    });
  });

  it('DELETE /snoozes/:id 404s for a missing row and never removes a timed snooze', async () => {
    setAuth('admin');
    const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const timed = await seedLowConfidence(levitt.id, 'Timed', inDays(7));
    const [row] = await testDb
      .insert(adminQueueSnoozes)
      .values({
        itemKey: lowKey(timed.id),
        kind: 'event-low-confidence',
        until: new Date(Date.now() + 3_600_000),
        createdBy: 'test-admin-1',
      })
      .returning();

    expect((await unsnoozeById(UNKNOWN_VENUE)).status).toBe(404);
    expect((await unsnoozeById(row?.id ?? '')).status).toBe(404);
    expect(await testDb.select().from(adminQueueSnoozes)).toHaveLength(1);
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'needs_you.unsnooze'));
    expect(audits).toEqual([]);
  });

  it('requires an admin to turn a Not useful back on', async () => {
    setAuth('user');
    expect((await unsnoozeById(UNKNOWN_VENUE)).status).toBe(403);
    authState.current = null;
    expect((await unsnoozeById(UNKNOWN_VENUE)).status).toBe(401);
  });

  it('names a former admin when the admin has no handle', async () => {
    setAuth('admin', 'admin-gone');
    const levitt = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    await testDb.insert(adminQueueSnoozes).values({
      kind: 'venue-failing',
      venueId: levitt.id,
      notUseful: true,
      createdBy: 'admin-gone',
    });

    const [entry] = (await snoozes(levitt.id)).data;
    expect(entry).toMatchObject({
      kind: 'venue-failing',
      createdByName: 'a former admin',
      reason: null,
    });
  });

  it('answers an empty list for a venue with nothing turned off', async () => {
    setAuth('admin');
    expect((await snoozes(UNKNOWN_VENUE)).data).toEqual([]);
  });
});
