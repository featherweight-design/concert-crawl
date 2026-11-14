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
  eventReports,
  events,
  notifications,
} from '@concert-crawl/db';
import { ER_POLICY } from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.js';
import { todayInDenver } from '../lib/time.js';
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();

/**
 * Cancelled and postponed reports promote through promoteReport, the one
 * locked write every report status shares. On a show dated before today in
 * Denver, a fan confirm crossing the threshold closes the report as moot
 * (`rejected`, "show already played") and an admin promote is 409
 * `past_locked`; either way the show's status is untouched and nobody hears.
 * Whether a promotion is news is read under the event's row lock, so two
 * reports promoted at once notify watchers once.
 */
describe('cancelled and postponed reports under the shared write', () => {
  const WATCHER = 'user_status_watcher';
  const STATUSES = ['cancelled', 'postponed'] as const;
  let eventId: string;

  const daysFromToday = (days: number) => {
    const day = new Date(`${todayInDenver()}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + days);
    return day.toISOString().slice(0, 10);
  };

  const seedShow = async (date: string) => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date });
    eventId = event.id;
    await seedUserEvent(WATCHER, eventId, { status: 'watching' });
  };

  beforeEach(async () => {
    authState.current = null;
    await clearTables();
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

  const showStatus = async () => {
    const [row] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, eventId));
    return row?.status;
  };

  const PENDING = { resolvedAt: null, resolution: null, adminNote: null };

  const confirmToThreshold = async (reportId: string) => {
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      authState.current = {
        userId: `user_status_confirmer_${idx}`,
        sessionClaims: { metadata: { role: 'user' } },
      };
      const res = await app.request(
        `/v1/events/${eventId}/reports/${reportId}/confirm`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { resolved: boolean } };
      expect(body.data.resolved).toBe(idx === ER_POLICY.confirmsRequired - 1);
    }
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

  for (const status of STATUSES) {
    describe(status, () => {
      it('closes a fan report on a past show as moot at the threshold', async () => {
        await seedShow(daysFromToday(-7));
        const report = await seedEventReport(eventId, 'user_reporter', {
          status,
        });

        await confirmToThreshold(report.id);

        expect(await reportState(report.id)).toEqual({
          resolvedAt: expect.any(Date),
          resolution: 'rejected',
          adminNote: 'show already played',
        });
        expect(await showStatus()).toBe('upcoming');
        expect(await noticesSent()).toEqual([]);
      });

      it('refuses an admin promote on a past show with 409 past_locked', async () => {
        await seedShow(daysFromToday(-7));
        const report = await seedEventReport(eventId, 'user_reporter', {
          status,
        });

        const res = await adminPromote(report.id);

        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
          success: false,
          error: 'past_locked',
        });
        expect(await reportState(report.id)).toEqual(PENDING);
        expect(await showStatus()).toBe('upcoming');
        expect(await auditRows()).toEqual([]);
        expect(await noticesSent()).toEqual([]);
      });

      it('lets an admin promote on a show dated today, telling watchers', async () => {
        await seedShow(todayInDenver());
        const report = await seedEventReport(eventId, 'user_reporter', {
          status,
        });

        const res = await adminPromote(report.id);

        expect(res.status).toBe(200);
        expect((await reportState(report.id))?.resolution).toBe('promoted');
        expect(await showStatus()).toBe(status);
        const sent = await db
          .select({ userId: notifications.userId })
          .from(notifications)
          .where(eq(notifications.category, `watch.${status}`));
        expect(sent.map((row) => row.userId)).toEqual([WATCHER]);
      });

      it('promotes a fan report on an upcoming show at the threshold, telling watchers', async () => {
        await seedShow(daysFromToday(30));
        const report = await seedEventReport(eventId, 'user_reporter', {
          status,
        });

        await confirmToThreshold(report.id);

        expect((await reportState(report.id))?.resolution).toBe('promoted');
        expect(await showStatus()).toBe(status);
        const sent = await db
          .select({ userId: notifications.userId })
          .from(notifications)
          .where(eq(notifications.category, `watch.${status}`));
        expect(sent.map((row) => row.userId)).toEqual([WATCHER]);
      });

      it('notifies once when two reports are promoted at the same time', async () => {
        await seedShow(daysFromToday(30));
        const first = await seedEventReport(eventId, 'user_reporter_a', {
          status,
        });
        const second = await seedEventReport(eventId, 'user_reporter_b', {
          status,
        });

        // Hold the event's row lock while both requests start, so both have
        // read the show before either can write: an unlocked "is this news"
        // read would see the old status twice and notify twice.
        let pending: Promise<Response[]> | undefined;
        await db.transaction(async (tx) => {
          await tx
            .select({ id: events.id })
            .from(events)
            .where(eq(events.id, eventId))
            .for('update');
          pending = Promise.all([
            adminPromote(first.id),
            adminPromote(second.id),
          ]);
          await new Promise((resolve) => setTimeout(resolve, 500));
        });
        if (!pending) throw new Error('the requests were never sent');
        const responses = await pending;

        expect(responses.map((res) => res.status)).toEqual([200, 200]);
        expect((await reportState(first.id))?.resolution).toBe('promoted');
        expect((await reportState(second.id))?.resolution).toBe('promoted');
        expect(await showStatus()).toBe(status);
        const sent = await db
          .select({ userId: notifications.userId })
          .from(notifications)
          .where(eq(notifications.category, `watch.${status}`));
        expect(sent.map((row) => row.userId)).toEqual([WATCHER]);
      });
    });
  }
});
