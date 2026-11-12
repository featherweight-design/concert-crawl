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
import { createApp } from '../../app.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedPriceSubmission,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { artists, auditLog, events, priceSubmissions } from '@concert-crawl/db';
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
    await clearTables();
  });

  it('answers keep_this_match (confirming an auto-match) and undoes it', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const autoMatchedAt = new Date(Date.now() - 60_000);
    const artist = await seedArtist({
      name: 'Auto Act',
      matchStatus: 'ambiguous',
      spotifyArtistId: 'sp-auto',
      autoMatchedAt,
    });
    await seedEvent(venue.id, { artist: artist.name, date: inDays(10) });
    const [item] = await itemsOf('artist');
    expect(item?.key).toBe(`artist:${artist.id}:ambiguous`);

    const res = await answer(item?.key ?? '', { answer: 'keep_this_match' });
    expect(res.status).toBe(200);
    const body: AnswerBody = await res.json();
    expect(body.data.undoable).toBe(true);
    const [confirmed] = await testDb
      .select()
      .from(artists)
      .where(eq(artists.id, artist.id));
    expect(confirmed?.autoMatchedAt).toBeNull();
    expect(confirmed?.matchStatus).toBe('matched');

    expect((await undo(body.data.auditId)).status).toBe(200);
    const [restored] = await testDb
      .select()
      .from(artists)
      .where(eq(artists.id, artist.id));
    expect(restored?.autoMatchedAt?.getTime()).toBe(autoMatchedAt.getTime());
    expect(restored?.matchStatus).toBe('ambiguous');
    expect(await auditRows('needs_you.undo')).toHaveLength(1);
  });

  it('approve_all promotes every batch submission once, through the approve path', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const event = await seedEvent(venue.id, {
      artist: 'Batch Act',
      date: inDays(10),
    });
    const first = await seedPriceSubmission(event.id, 'user-1', {
      corroborationCount: 2,
      priceMin: '30',
    });
    const [item] = await itemsOf('price-batch');
    expect(item?.key).toBe('price-batch:all');

    const res = await answer('price-batch:all', { answer: 'approve_all' });
    expect(res.status).toBe(200);
    const [approved] = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, first.id));
    expect(approved?.status).toBe('corroborated');
    const [projected] = await testDb
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(projected?.ticketPriceMin).toBe('30.00');
    expect(await auditRows('needs_you.answer')).toHaveLength(1);

    // The batch is now empty, so a second approve is a stale key.
    expect(
      (await answer('price-batch:all', { answer: 'approve_all' })).status,
    ).toBe(404);
  });
});
