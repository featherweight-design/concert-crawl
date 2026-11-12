import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: { current: null as { userId: string } | null },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { events, userEventDismissals } from '@concert-crawl/db';
import { createApp } from '../app.js';
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';

const app = createApp();
const as = (userId: string | null): void => {
  authState.current = userId === null ? null : { userId };
};
const send = (method: string, path: string) =>
  app.request(`/v1/watching${path}`, {
    method,
    headers: { Authorization: 'Bearer t' },
  });
const listed = async (): Promise<string[]> => {
  const res = await send('GET', '');
  const body = (await res.json()) as { data: { eventId: string }[] };
  return body.data.map((row) => row.eventId);
};

describe('dismissing a No longer listed show', () => {
  let delistedId: string;
  let liveId: string;

  beforeEach(async () => {
    await clearTables();
    const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
    const delisted = await seedEvent(venue.id, {
      artist: 'Gone Band',
      date: '2099-01-01',
      firstMissingAt: new Date('2026-11-01T00:00:00Z'),
      delistedAt: new Date('2026-11-02T00:00:00Z'),
    });
    const live = await seedEvent(venue.id, {
      artist: 'Live Band',
      date: '2099-01-02',
    });
    delistedId = delisted.id;
    liveId = live.id;
    for (const user of ['user_a', 'user_b']) {
      await seedUserEvent(user, delistedId);
      await seedUserEvent(user, liveId);
    }
  });

  it('hides it from my watching list only, and the DELETE is the Undo', async () => {
    as('user_a');
    expect(await listed()).toEqual(
      expect.arrayContaining([delistedId, liveId]),
    );

    const dismissed = await send('POST', `/${delistedId}/dismiss`);
    expect(dismissed.status).toBe(200);
    expect(await dismissed.json()).toMatchObject({ data: { dismissed: true } });
    expect(await listed()).toEqual([liveId]);

    as('user_b');
    expect(await listed()).toEqual(
      expect.arrayContaining([delistedId, liveId]),
    );

    as('user_a');
    const undone = await send('DELETE', `/${delistedId}/dismiss`);
    expect(undone.status).toBe(200);
    expect(await undone.json()).toMatchObject({ data: { dismissed: false } });
    expect(await listed()).toEqual(expect.arrayContaining([delistedId]));
  });

  it('is idempotent both ways', async () => {
    as('user_a');
    expect((await send('POST', `/${delistedId}/dismiss`)).status).toBe(200);
    expect((await send('POST', `/${delistedId}/dismiss`)).status).toBe(200);
    expect(await testDb.select().from(userEventDismissals)).toHaveLength(1);
    expect((await send('DELETE', `/${delistedId}/dismiss`)).status).toBe(200);
    expect((await send('DELETE', `/${delistedId}/dismiss`)).status).toBe(200);
    expect(await testDb.select().from(userEventDismissals)).toHaveLength(0);
  });

  it('refuses a show that is still listed, and a show I do not watch', async () => {
    as('user_a');
    const live = await send('POST', `/${liveId}/dismiss`);
    expect(live.status).toBe(409);
    expect(await live.json()).toMatchObject({ code: 'not_delisted' });

    as('user_stranger');
    expect((await send('POST', `/${delistedId}/dismiss`)).status).toBe(404);
    expect(await testDb.select().from(userEventDismissals)).toHaveLength(0);
  });

  it('shows the show again if it returns to the calendar, and hides it again when delisted again', async () => {
    as('user_a');
    await send('POST', `/${delistedId}/dismiss`);
    await testDb
      .update(events)
      .set({ delistedAt: null, firstMissingAt: null })
      .where(eq(events.id, delistedId));
    expect(await listed()).toEqual(
      expect.arrayContaining([delistedId, liveId]),
    );
    await testDb
      .update(events)
      .set({
        delistedAt: new Date('2026-11-09T00:00:00Z'),
        firstMissingAt: new Date('2026-11-08T00:00:00Z'),
      })
      .where(eq(events.id, delistedId));
    expect(await listed()).toEqual([liveId]);
  });

  it('forgets the dismissal when I stop watching, so watching it again shows it', async () => {
    as('user_a');
    await send('POST', `/${delistedId}/dismiss`);
    expect(await listed()).toEqual([liveId]);
    // PUT toggles: the second one un-watches the show I am watching.
    expect((await send('PUT', `/${delistedId}`)).status).toBe(200);
    expect(await testDb.select().from(userEventDismissals)).toHaveLength(0);
    // Watching it again while it is still delisted: not hidden.
    expect((await send('PUT', `/${delistedId}`)).status).toBe(200);
    expect(await listed()).toEqual(expect.arrayContaining([delistedId]));
  });

  it('is a personal read that no shared cache may hold', async () => {
    as('user_a');
    const res = await send('GET', '');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('needs a signed-in caller and a real id', async () => {
    as(null);
    expect((await send('POST', `/${delistedId}/dismiss`)).status).toBe(401);
    expect((await send('DELETE', `/${delistedId}/dismiss`)).status).toBe(401);
    as('user_a');
    expect((await send('POST', '/not-an-id/dismiss')).status).toBe(400);
  });

  it('goes with the event', async () => {
    as('user_a');
    await send('POST', `/${delistedId}/dismiss`);
    await testDb.delete(events).where(eq(events.id, delistedId));
    expect(await testDb.select().from(userEventDismissals)).toHaveLength(0);
  });
});
