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

// A removed venue never reaches Needs you, so its re-crawl refusal can only
// happen when a removal lands between the item load and the answer. This
// stands in for that race; otherwise the real queueVenueCrawl runs.
const { removalRace } = vi.hoisted(() => {
  const state: { landed: boolean } = { landed: false };
  return { removalRace: state };
});

vi.mock('./lib/crawl-trigger.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('./lib/crawl-trigger.js')>();
  return {
    ...real,
    queueVenueCrawl: (...args: Parameters<typeof real.queueVenueCrawl>) =>
      removalRace.landed
        ? Promise.resolve({ ok: 'removed' } as const)
        : real.queueVenueCrawl(...args),
  };
});

import { eq } from 'drizzle-orm';
import { createApp } from '../../app.js';
import { clearTables, seedEvent, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { auditLog, events } from '@concert-crawl/db';
import type { NeedsYouItem } from '@concert-crawl/types';
import { addDays, denverDate } from './lib/needs-you/keys.js';

const app = createApp();

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
}

const inDays = (days: number): string => addDays(denverDate(new Date()), days);

const itemsOf = async (kind: string): Promise<NeedsYouItem[]> => {
  const res = await app.request(`/v1/admin/needs-you?kind=${kind}`);
  expect(res.status).toBe(200);
  const body: { data: NeedsYouItem[] } = await res.json();
  return body.data;
};

const answer = (key: string, body: unknown): Promise<Response> =>
  app.request(`/v1/admin/needs-you/items/${encodeURIComponent(key)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const undo = (auditId: string): Promise<Response> =>
  app.request(`/v1/admin/needs-you/answers/${auditId}/undo`, {
    method: 'POST',
  });

interface AnswerBody {
  success: boolean;
  data: { auditId: string; undoable: boolean };
}

const auditRows = (action: string) =>
  testDb.select().from(auditLog).where(eq(auditLog.action, action));

describe('admin needs-you answers', () => {
  beforeEach(async () => {
    authState.current = null;
    removalRace.landed = false;
    await clearTables();
  });

  it('carries venue_removed through when a re-crawl answer meets a removal', async () => {
    setAuth('admin');
    const venue = await seedVenue({
      name: 'Blocked Hall',
      slug: 'blocked-hall',
      blockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
    const key = `venue-blocked:${venue.id}`;
    expect((await itemsOf('venue-blocked')).map((item) => item.key)).toEqual([
      key,
    ]);

    removalRace.landed = true;
    const res = await answer(key, { answer: 're_crawl_once' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      success: false,
      error:
        'This venue asked us to remove its data, so it stays off the site.',
      code: 'venue_removed',
    });
    expect(await auditRows('needs_you.answer')).toHaveLength(0);
  });

  it('does not offer a removed venue at all', async () => {
    setAuth('admin');
    const venue = await seedVenue({
      name: 'Gone Hall',
      slug: 'gone-hall',
      active: false,
      blockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      crawlPausedAt: new Date(),
      removedAt: new Date(),
    });
    expect(await itemsOf('venue-blocked')).toEqual([]);
    const res = await answer(`venue-blocked:${venue.id}`, {
      answer: 're_crawl_once',
    });
    expect(res.status).toBe(404);
  });

  it('requires an admin role', async () => {
    setAuth('user');
    const res = await answer('bug:abc', { answer: 'resolve' });
    expect(res.status).toBe(403);
    const undoRes = await undo('5eeded00-0000-0000-0000-000000000001');
    expect(undoRes.status).toBe(403);
  });

  it('404s for a key that is not a current item', async () => {
    setAuth('admin');
    const res = await answer(
      'event-low-confidence:5eeded00-0000-0000-0000-000000000009',
      {
        answer: 'its_a_show',
      },
    );
    expect(res.status).toBe(404);
  });

  it('400s for a slug the item does not offer, listing the allowed ones', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedEvent(venue.id, {
      artist: 'Some Act',
      date: inDays(5),
      verified: false,
    });
    const res = await answer(`event-low-confidence:${event.id}`, {
      answer: 'cancelled',
    });
    expect(res.status).toBe(400);
    const body: { allowed: string[] } = await res.json();
    expect(body.allowed).toEqual([
      'not_a_concert',
      'its_a_show',
      'edit_then_list',
    ]);
    expect(await auditRows('needs_you.answer')).toHaveLength(0);
  });

  it('rejects a navigation-only answer', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedEvent(venue.id, {
      artist: 'Some Act',
      date: inDays(5),
      verified: false,
    });
    const res = await answer(`event-low-confidence:${event.id}`, {
      answer: 'edit_then_list',
    });
    expect(res.status).toBe(400);
    const body: { code: string } = await res.json();
    expect(body.code).toBe('navigation');
  });

  it('answers still_on and undoes it, with an audit row each', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const missingSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const event = await seedEvent(venue.id, {
      artist: 'Gone Act',
      date: inDays(10),
      firstMissingAt: missingSince,
    });
    const [item] = await itemsOf('show-dropped');
    expect(item?.key).toMatch(/^show-dropped:/);

    const res = await answer(item?.key ?? '', { answer: 'still_on' });
    expect(res.status).toBe(200);
    const body: AnswerBody = await res.json();
    expect(body.data.undoable).toBe(true);

    const [cleared] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(cleared?.firstMissingAt).toBeNull();
    const answered = await auditRows('needs_you.answer');
    expect(answered).toHaveLength(1);
    expect(answered[0]?.targetId).toBe(item?.key);
    expect(answered[0]?.metadata).toMatchObject({
      slug: 'still_on',
      kind: 'show-dropped',
      before: { eventId: event.id },
    });

    const undone = await undo(body.data.auditId);
    expect(undone.status).toBe(200);
    const [restored] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(restored?.firstMissingAt?.getTime()).toBe(missingSince.getTime());
    expect(await auditRows('needs_you.undo')).toHaveLength(1);

    // Already undone.
    expect((await undo(body.data.auditId)).status).toBe(409);
  });

  it('answers not_a_concert and undoes it', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedEvent(venue.id, {
      artist: 'Trivia Night',
      date: inDays(5),
      verified: false,
    });
    const key = `event-low-confidence:${event.id}`;
    const res = await answer(key, { answer: 'not_a_concert' });
    expect(res.status).toBe(200);
    const body: AnswerBody = await res.json();

    const [hidden] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(hidden?.hiddenFromConsumer).toBe(true);
    expect(
      (await itemsOf('event-low-confidence')).map((i) => i.key),
    ).not.toContain(key);

    expect((await undo(body.data.auditId)).status).toBe(200);
    const [shown] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(shown?.hiddenFromConsumer).toBe(false);
    expect(await auditRows('needs_you.undo')).toHaveLength(1);
  });

  it('answers its_a_show and undoes it; 409 when the state changed', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedEvent(venue.id, {
      artist: 'Real Act',
      date: inDays(5),
      verified: false,
    });
    const key = `event-low-confidence:${event.id}`;
    const first: AnswerBody = await (
      await answer(key, { answer: 'its_a_show' })
    ).json();
    expect(first.data.undoable).toBe(true);

    // Someone hides the event after the answer: the answer no longer
    // describes it, so the undo is refused and nothing is restored.
    await testDb
      .update(events)
      .set({ hiddenFromConsumer: true })
      .where(eq(events.id, event.id));
    expect((await undo(first.data.auditId)).status).toBe(409);
    const [still] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(still?.verified).toBe(true);
    expect(await auditRows('needs_you.undo')).toHaveLength(0);

    await testDb
      .update(events)
      .set({ hiddenFromConsumer: false })
      .where(eq(events.id, event.id));
    expect((await undo(first.data.auditId)).status).toBe(200);
    const [reverted] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(reverted?.verified).toBe(false);
  });

  it('refuses to undo a notifying answer', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    await seedEvent(venue.id, {
      artist: 'Gone Act',
      date: inDays(10),
      firstMissingAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const [item] = await itemsOf('show-dropped');
    const res = await answer(item?.key ?? '', { answer: 'cancelled' });
    expect(res.status).toBe(200);
    const body: AnswerBody = await res.json();
    expect(body.data.undoable).toBe(false);
    const [row] = await auditRows('needs_you.answer');
    expect(row?.metadata).toMatchObject({ slug: 'cancelled', before: null });

    expect((await undo(body.data.auditId)).status).toBe(400);
    expect(await auditRows('needs_you.undo')).toHaveLength(0);
  });
});
