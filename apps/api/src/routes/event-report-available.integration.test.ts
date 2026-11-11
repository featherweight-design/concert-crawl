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

import {
  db,
  eventReportConfirms,
  eventReports,
  notifications,
} from '@concert-crawl/db';
import { ER_POLICY } from '@concert-crawl/types';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();

const setAuth = (userId: string) => {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } };
};

const post = (url: string, body?: unknown) =>
  app.request(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

const isSoldOut = async (eventId: string) => {
  const res = await app.request(`/v1/events/${eventId}`);
  const body = (await res.json()) as { data: { priceStatus: string | null } };
  return body.data.priceStatus === 'soldout';
};

/**
 * B+ A3: Tickets available is a fan report that clears a promoted sold-out at
 * the same confirm threshold, and a confirm now stores how the fan knows.
 */
describe('Tickets available reports', () => {
  let eventId: string;

  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    const venue = await seedVenue();
    // Far future: the threshold is confirmsRequired, not the imminent count.
    const event = await seedEvent(venue.id, { date: '2099-09-01' });
    eventId = event.id;
  });

  const promoteSoldOut = () =>
    seedEventReport(eventId, 'user_sold_reporter', {
      resolution: 'promoted',
      resolvedAt: new Date(),
    });

  it('refuses Tickets available on a show that is not sold out', async () => {
    setAuth('user_reporter');
    const res = await post(`/v1/events/${eventId}/reports`, {
      status: 'available',
      evidenceMethod: 'venue_site',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('not_sold_out');
  });

  it('clears the sold-out and tells watchers once confirms reach the threshold', async () => {
    await promoteSoldOut();
    await seedUserEvent('user_watcher', eventId, { status: 'watching' });
    expect(await isSoldOut(eventId)).toBe(true);

    setAuth('user_reporter');
    const filed = await post(`/v1/events/${eventId}/reports`, {
      status: 'available',
      evidenceMethod: 'venue_site',
    });
    expect(filed.status).toBe(201);
    const { data: report } = (await filed.json()) as { data: { id: string } };

    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      // Still sold out until the last confirm lands.
      expect(await isSoldOut(eventId)).toBe(true);
      setAuth(`user_confirmer_${idx}`);
      const res = await post(
        `/v1/events/${eventId}/reports/${report.id}/confirm`,
        { method: 'own_evidence' },
      );
      expect(res.status).toBe(200);
    }

    expect(await isSoldOut(eventId)).toBe(false);
    const [promoted] = await db
      .select({ resolution: eventReports.resolution })
      .from(eventReports)
      .where(eq(eventReports.id, report.id));
    expect(promoted?.resolution).toBe('promoted');

    const sent = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'user_notification'),
          eq(notifications.category, 'watch.backonsale'),
        ),
      );
    expect(sent.map((row) => row.userId)).toEqual(['user_watcher']);
  });

  it('stores the confirm method, and accepts a confirm without one', async () => {
    await promoteSoldOut();
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
    });
    const url = `/v1/events/${eventId}/reports/${report.id}/confirm`;

    setAuth('user_a');
    expect((await post(url, { method: 'heard_from_venue' })).status).toBe(200);
    setAuth('user_b');
    // An older client posts no body at all.
    expect((await post(url)).status).toBe(200);

    const rows = await db
      .select({
        userId: eventReportConfirms.userId,
        method: eventReportConfirms.method,
      })
      .from(eventReportConfirms)
      .where(eq(eventReportConfirms.reportId, report.id));
    expect(
      Object.fromEntries(rows.map((row) => [row.userId, row.method])),
    ).toEqual({ user_a: 'heard_from_venue', user_b: null });
  });

  it('rejects an unknown confirm method', async () => {
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'cancelled',
    });
    setAuth('user_a');
    const res = await post(
      `/v1/events/${eventId}/reports/${report.id}/confirm`,
      { method: 'psychic' },
    );
    expect(res.status).toBe(422);
  });
});
