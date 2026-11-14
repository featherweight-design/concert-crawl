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
  auditLog,
  db,
  eventReportConfirms,
  eventReports,
  events,
  notifications,
} from '@concert-crawl/db';
import { ER_POLICY } from '@concert-crawl/types';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import type { DbTransaction } from '../lib/db-executor.js';
import { todayInDenver } from '../lib/time.js';
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

  it('closes a pending Tickets available when the sold-out is cleared, so it cannot clear a later one', async () => {
    await promoteSoldOut();
    const stale = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
    });
    authState.current = {
      userId: 'admin_user',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    const res = await post(`/v1/admin/events/${eventId}/available`, {});
    expect(res.status).toBe(204);

    const [row] = await db
      .select({
        resolvedAt: eventReports.resolvedAt,
        resolution: eventReports.resolution,
      })
      .from(eventReports)
      .where(eq(eventReports.id, stale.id));
    expect(row?.resolution).toBe('promoted');
    expect(row?.resolvedAt).not.toBeNull();

    // The show sells out again; the old report can no longer be confirmed.
    await seedEventReport(eventId, 'user_sold_again', {
      resolution: 'promoted',
      resolvedAt: new Date(),
    });
    setAuth('user_late');
    const late = await post(
      `/v1/events/${eventId}/reports/${stale.id}/confirm`,
      { method: 'own_evidence' },
    );
    expect(late.status).toBe(400);
    expect(await isSoldOut(eventId)).toBe(true);
  });

  it('confirms with a JSON content type and no body at all', async () => {
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'cancelled',
    });
    setAuth('user_a');
    const res = await app.request(
      `/v1/events/${eventId}/reports/${report.id}/confirm`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      },
    );
    expect(res.status).toBe(200);
  });

  it('never clears a sold-out promoted after the report was filed', async () => {
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
      createdAt: new Date('2099-01-01T00:00:00Z'),
    });
    // The only live sold-out came later than the report.
    await seedEventReport(eventId, 'user_sold_later', {
      resolution: 'promoted',
      resolvedAt: new Date('2099-02-01T00:00:00Z'),
    });
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_confirmer_${idx}`);
      await post(`/v1/events/${eventId}/reports/${report.id}/confirm`, {});
    }
    expect(await isSoldOut(eventId)).toBe(true);
    const [row] = await db
      .select({ resolution: eventReports.resolution })
      .from(eventReports)
      .where(eq(eventReports.id, report.id));
    expect(row?.resolution).toBe('rejected');
  });

  it('lets an admin promote it, clearing the sold-out and auditing what it cleared', async () => {
    const soldOut = await promoteSoldOut();
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
    });
    authState.current = {
      userId: 'admin_user',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    const res = await app.request(
      `/v1/admin/events/reports/${report.id}/resolve`,
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolution: 'promoted' }),
      },
    );
    expect(res.status).toBe(200);
    expect(await isSoldOut(eventId)).toBe(false);
    const [audit] = await db
      .select({ metadata: auditLog.metadata })
      .from(auditLog)
      .where(eq(auditLog.action, 'event.report.resolve'));
    expect(audit?.metadata).toMatchObject({
      clearedSoldOutReportIds: [soldOut.id],
    });
  });

  it('refuses an admin promote when nothing is sold out', async () => {
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
    });
    authState.current = {
      userId: 'admin_user',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    const res = await app.request(
      `/v1/admin/events/reports/${report.id}/resolve`,
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolution: 'promoted' }),
      },
    );
    expect(res.status).toBe(409);
  });

  it('refuses a malformed confirm body rather than counting it', async () => {
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'cancelled',
    });
    setAuth('user_a');
    const res = await app.request(
      `/v1/events/${eventId}/reports/${report.id}/confirm`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: '{"method":"own_evidence"',
      },
    );
    expect(res.status).toBe(422);
  });
});

/**
 * The shared sale writes (clearSoldOut, promoteSoldOutReport), decided under
 * the event's and the report's row locks. On a show dated before today in
 * Denver, played or still postponed, a fan confirm crossing the threshold
 * closes the report as moot (`rejected`, "show already played") and tells
 * nobody, and an admin promote is 409 `past_locked` with no write and no
 * audit row. A sold-out on a show already sold out closes as moot too, and a
 * report resolved before the lock is never written over.
 */
describe('sale reports under the shared writes', () => {
  const WATCHER = 'user_past_watcher';
  let eventId: string;

  const daysFromToday = (days: number) => {
    const day = new Date(`${todayInDenver()}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + days);
    return day.toISOString().slice(0, 10);
  };

  const seedShow = async (overrides: {
    date: string;
    status?: 'postponed';
  }) => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, overrides);
    eventId = event.id;
    await seedUserEvent(WATCHER, eventId, { status: 'watching' });
  };

  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  const promoteSoldOut = () =>
    seedEventReport(eventId, 'user_sold_reporter', {
      status: 'sold-out',
      resolution: 'promoted',
      resolvedAt: new Date(),
    });

  const reportState = async (reportId: string) => {
    const [row] = await db
      .select({
        resolvedAt: eventReports.resolvedAt,
        resolution: eventReports.resolution,
        adminNote: eventReports.adminNote,
      })
      .from(eventReports)
      .where(eq(eventReports.id, reportId));
    return row;
  };

  const PENDING = { resolvedAt: null, resolution: null, adminNote: null };

  const closedMoot = (adminNote: string) => ({
    resolvedAt: expect.any(Date),
    resolution: 'rejected',
    adminNote,
  });

  // Every show here is past or weeks away, so none is imminent: the last of
  // confirmsRequired confirms crosses the threshold and resolves the report.
  const confirmToThreshold = async (reportId: string) => {
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      setAuth(`user_threshold_confirmer_${idx}`);
      const res = await post(
        `/v1/events/${eventId}/reports/${reportId}/confirm`,
        {},
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { resolved: boolean } };
      expect(body.data.resolved).toBe(idx === ER_POLICY.confirmsRequired - 1);
    }
  };

  // Holds the event's row lock in a second connection while `during` runs,
  // so the request it starts blocks on the lock and decides only after this
  // commits, as a concurrent admin edit would make it.
  const withEventLocked = async <T>(
    start: () => Promise<T>,
    during: (tx: DbTransaction) => Promise<unknown>,
  ): Promise<T> => {
    let pending: Promise<T> | undefined;
    await db.transaction(async (tx) => {
      await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, eventId))
        .for('update');
      pending = start();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await during(tx);
    });
    if (!pending) throw new Error('the request was never sent');
    return pending;
  };

  const adminPromote = (reportId: string) => {
    authState.current = {
      userId: 'admin_user',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    return app.request(`/v1/admin/events/reports/${reportId}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resolution: 'promoted' }),
    });
  };

  const noticesSent = () => db.select().from(notifications);
  const auditRows = () => db.select().from(auditLog);

  it('closes a fan Tickets available on a past show as moot at the threshold, leaving the sold-out live', async () => {
    await seedShow({ date: daysFromToday(-7) });
    const soldOut = await promoteSoldOut();
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
    });

    await confirmToThreshold(report.id);

    expect(await reportState(report.id)).toEqual(
      closedMoot('show already played'),
    );
    expect((await reportState(soldOut.id))?.resolution).toBe('promoted');
    expect(await noticesSent()).toEqual([]);
  });

  it('closes a fan sold-out report on a postponed past show as moot at the threshold', async () => {
    await seedShow({ date: daysFromToday(-6), status: 'postponed' });
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'sold-out',
    });

    await confirmToThreshold(report.id);

    expect(await reportState(report.id)).toEqual(
      closedMoot('show already played'),
    );
    expect(await noticesSent()).toEqual([]);
  });

  it('refuses an admin promote of a Tickets available on a past show', async () => {
    await seedShow({ date: daysFromToday(-7) });
    const soldOut = await promoteSoldOut();
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'available',
    });

    const res = await adminPromote(report.id);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ success: false, error: 'past_locked' });
    expect(await reportState(report.id)).toEqual(PENDING);
    expect((await reportState(soldOut.id))?.resolution).toBe('promoted');
    expect(await auditRows()).toEqual([]);
    expect(await noticesSent()).toEqual([]);
  });

  it('refuses an admin promote of a sold-out report on a played or postponed past show', async () => {
    for (const status of [undefined, 'postponed'] as const) {
      await clearTables();
      await seedShow({
        date: daysFromToday(-7),
        ...(status && { status }),
      });
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'sold-out',
      });

      const res = await adminPromote(report.id);

      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        success: false,
        error: 'past_locked',
      });
      expect(await reportState(report.id)).toEqual(PENDING);
      expect(await auditRows()).toEqual([]);
      expect(await noticesSent()).toEqual([]);
    }
  });

  it('still lets an admin promote a sold-out report on a show dated today, telling watchers', async () => {
    await seedShow({ date: todayInDenver() });
    const report = await seedEventReport(eventId, 'user_reporter', {
      status: 'sold-out',
    });

    const res = await adminPromote(report.id);

    expect(res.status).toBe(200);
    expect((await reportState(report.id))?.resolution).toBe('promoted');
    const sent = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(eq(notifications.category, 'watch.soldout'));
    expect(sent.map((row) => row.userId)).toEqual([WATCHER]);
  });

  describe('a second sold-out on a show already sold out', () => {
    const markSoldOut = () => {
      authState.current = {
        userId: 'admin_user',
        sessionClaims: { metadata: { role: 'admin' } },
      };
      return post(`/v1/admin/events/${eventId}/sold-out`, {});
    };

    const soldOutNotices = () =>
      db
        .select({ userId: notifications.userId })
        .from(notifications)
        .where(eq(notifications.category, 'watch.soldout'));

    beforeEach(async () => {
      await seedShow({ date: daysFromToday(30) });
      expect((await markSoldOut()).status).toBe(201);
      expect(await soldOutNotices()).toEqual([{ userId: WATCHER }]);
    });

    it('closes a fan report reaching the threshold as moot, with no 500 and no second notice', async () => {
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'sold-out',
      });

      await confirmToThreshold(report.id);

      expect(await reportState(report.id)).toEqual(
        closedMoot('already sold out'),
      );
      expect(await isSoldOut(eventId)).toBe(true);
      expect(await soldOutNotices()).toEqual([{ userId: WATCHER }]);
    });

    it('closes it as moot when an admin promotes it, with no second notice', async () => {
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'sold-out',
      });

      const res = await adminPromote(report.id);

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { resolution: string } };
      expect(body.data.resolution).toBe('rejected');
      expect(await reportState(report.id)).toEqual(
        closedMoot('already sold out'),
      );
      expect(await isSoldOut(eventId)).toBe(true);
      expect(await soldOutNotices()).toEqual([{ userId: WATCHER }]);
      const [audit] = await db
        .select({ metadata: auditLog.metadata })
        .from(auditLog)
        .where(eq(auditLog.action, 'event.report.resolve'));
      expect(audit?.metadata).toMatchObject({ closedAsMoot: true });
    });
  });

  describe('a report rejected before the locked write', () => {
    const reject = async (tx: DbTransaction, reportId: string) =>
      tx
        .update(eventReports)
        .set({ resolvedAt: new Date(), resolution: 'rejected' })
        .where(eq(eventReports.id, reportId));

    it('is not flipped to promoted by an admin promote of a sold-out report', async () => {
      await seedShow({ date: daysFromToday(30) });
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'sold-out',
      });

      const res = await withEventLocked(
        () => adminPromote(report.id),
        (tx) => reject(tx, report.id),
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        success: false,
        error: 'Report already resolved',
      });
      expect((await reportState(report.id))?.resolution).toBe('rejected');
      expect(await isSoldOut(eventId)).toBe(false);
      expect(await auditRows()).toEqual([]);
      expect(await noticesSent()).toEqual([]);
    });

    it('does not clear the sold-out on an admin promote of a Tickets available', async () => {
      await seedShow({ date: daysFromToday(30) });
      const soldOut = await promoteSoldOut();
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'available',
      });

      const res = await withEventLocked(
        () => adminPromote(report.id),
        (tx) => reject(tx, report.id),
      );

      expect(res.status).toBe(400);
      expect((await reportState(report.id))?.resolution).toBe('rejected');
      expect((await reportState(soldOut.id))?.resolution).toBe('promoted');
      expect(await auditRows()).toEqual([]);
      expect(await noticesSent()).toEqual([]);
    });
  });
});
