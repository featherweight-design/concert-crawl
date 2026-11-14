import { describe, it, expect, beforeEach, vi } from 'vitest';

interface AuthState {
  current: {
    userId: string;
    sessionClaims: { metadata?: { role?: string } };
  } | null;
}

const { authState } = vi.hoisted(() => {
  const state: AuthState = { current: null };
  return { authState: state };
});

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
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createApp } from '../app.js';
import { todayInDenver } from '../lib/time.js';
import { countLockWaiters, withLockHolder } from '../test/helpers/locks.js';
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js';

const app = createApp();

const confirmBody = z.object({ data: z.object({ resolved: z.boolean() }) });

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

  const seedShow = async (
    date: string,
    status?: 'postponed' | 'cancelled',
    delistedAt?: Date,
  ) => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date,
      ...(status && { status }),
      ...(delistedAt && { delistedAt }),
    });
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
      const body = confirmBody.parse(await res.json());
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

  // True once `count` backends are waiting on a lock, false after `maxMs`.
  const waitForWaiters = async (count: number, maxMs = 30_000) => {
    const start = Date.now();
    while (Date.now() - start <= maxMs) {
      if ((await countLockWaiters()) >= count) return true;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return false;
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

        // Hold the event's row lock until BOTH requests are waiting on it, so
        // both are past every unlocked read before either can write: an
        // unlocked "is this news" read would see the old status twice and
        // notify twice.
        const { pending, bothWaited } = await withLockHolder(
          [sql`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`],
          async () => {
            const requests = Promise.all([
              adminPromote(first.id),
              adminPromote(second.id),
            ]);
            // Never rejects unobserved, even if the wait below throws; the
            // test still awaits `pending` and fails on the rejection there.
            requests.catch((err: unknown) => {
              console.error('concurrent admin promotes failed', err);
            });
            return { pending: requests, bothWaited: await waitForWaiters(2) };
          },
        );
        const responses = await pending;

        expect(bothWaited).toBe(true);
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

  // A postponed show whose date passed "stays Postponed until you set the new
  // date or mark it cancelled" (addendum 6), so a cancelled report still
  // promotes on it; anything else stays past-locked.
  describe('a postponed show whose date has passed', () => {
    const cancelledNotices = () =>
      db
        .select({ userId: notifications.userId })
        .from(notifications)
        .where(eq(notifications.category, 'watch.cancelled'));

    it('lets an admin promote a cancelled report, telling watchers', async () => {
      await seedShow(daysFromToday(-7), 'postponed');
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'cancelled',
      });

      const res = await adminPromote(report.id);

      expect(res.status).toBe(200);
      expect((await reportState(report.id))?.resolution).toBe('promoted');
      expect(await showStatus()).toBe('cancelled');
      expect((await cancelledNotices()).map((row) => row.userId)).toEqual([
        WATCHER,
      ]);
    });

    it('promotes a fan cancelled report at the threshold, telling watchers', async () => {
      await seedShow(daysFromToday(-7), 'postponed');
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'cancelled',
      });

      await confirmToThreshold(report.id);

      expect((await reportState(report.id))?.resolution).toBe('promoted');
      expect(await showStatus()).toBe('cancelled');
      expect((await cancelledNotices()).map((row) => row.userId)).toEqual([
        WATCHER,
      ]);
    });

    it('still refuses an admin promote of a postponed report', async () => {
      await seedShow(daysFromToday(-7), 'postponed');
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'postponed',
      });

      const res = await adminPromote(report.id);

      expect(res.status).toBe(409);
      expect(await reportState(report.id)).toEqual(PENDING);
      expect(await showStatus()).toBe('postponed');
      expect(await noticesSent()).toEqual([]);
    });
  });

  // A confirmed cancellation is final, and a postponed show has no sale to
  // sell out: such reports close as moot and tell nobody, on both paths.
  describe('reports a cancelled or postponed show makes moot', () => {
    const closedMoot = (adminNote: string) => ({
      resolvedAt: expect.any(Date),
      resolution: 'rejected',
      adminNote,
    });

    const cases = [
      {
        name: 'a postponed report on a cancelled show',
        show: 'cancelled',
        report: 'postponed',
        note: 'show already cancelled',
      },
      {
        name: 'a sold-out report on a cancelled show',
        show: 'cancelled',
        report: 'sold-out',
        note: 'show already cancelled',
      },
      {
        name: 'a sold-out report on a postponed show',
        show: 'postponed',
        report: 'sold-out',
        note: 'show is postponed',
      },
    ] as const;

    for (const { name, show, report: reportStatus, note } of cases) {
      it(`closes ${name} as moot at the fan threshold`, async () => {
        await seedShow(daysFromToday(30), show);
        const report = await seedEventReport(eventId, 'user_reporter', {
          status: reportStatus,
        });

        await confirmToThreshold(report.id);

        expect(await reportState(report.id)).toEqual(closedMoot(note));
        expect(await showStatus()).toBe(show);
        expect(await noticesSent()).toEqual([]);
      });

      it(`closes ${name} as moot on an admin promote`, async () => {
        await seedShow(daysFromToday(30), show);
        const report = await seedEventReport(eventId, 'user_reporter', {
          status: reportStatus,
        });

        const res = await adminPromote(report.id);

        expect(res.status).toBe(200);
        expect(await reportState(report.id)).toEqual(closedMoot(note));
        expect(await showStatus()).toBe(show);
        expect(await noticesSent()).toEqual([]);
      });
    }

    it('still promotes a postponed report on a show the sweep delisted', async () => {
      await seedShow(daysFromToday(30), 'cancelled', new Date());
      const report = await seedEventReport(eventId, 'user_reporter', {
        status: 'postponed',
      });

      const res = await adminPromote(report.id);

      expect(res.status).toBe(200);
      expect((await reportState(report.id))?.resolution).toBe('promoted');
      expect(await showStatus()).toBe('postponed');
    });
  });

  // A reject or needs-more-info never writes over a report resolved after
  // the route's first read (by a fan threshold, say).
  describe('an admin reject racing a promotion', () => {
    it.each(['rejected', 'needs-more-info'] as const)(
      'answers already resolved, and keeps the promotion, for %s',
      async (resolution) => {
        await seedShow(daysFromToday(30));
        const report = await seedEventReport(eventId, 'user_reporter', {
          status: 'cancelled',
        });
        authState.current = {
          userId: 'admin_user',
          sessionClaims: { metadata: { role: 'admin' } },
        };

        // A committing transaction holds the report's row lock while the
        // reject starts: its first (unlocked) read sees the report pending,
        // and its write waits on the lock. The transaction then promotes the
        // report and commits, as a fan threshold would.
        let pending: Promise<Response> | undefined;
        let waited = false;
        await db.transaction(async (tx) => {
          await tx
            .select({ id: eventReports.id })
            .from(eventReports)
            .where(eq(eventReports.id, report.id))
            .for('update');
          pending = app.request(
            `/v1/admin/events/reports/${report.id}/resolve`,
            {
              method: 'PATCH',
              headers: {
                Authorization: 'Bearer test-token',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ resolution }),
            },
          );
          pending.catch((err: unknown) => {
            console.error('admin reject failed', err);
          });
          waited = await waitForWaiters(1);
          await tx
            .update(eventReports)
            .set({ resolvedAt: new Date(), resolution: 'promoted' })
            .where(eq(eventReports.id, report.id));
        });
        if (!pending) throw new Error('the reject was never sent');
        const res = await pending;

        expect(waited).toBe(true);
        expect(res.status).toBe(400);
        expect((await reportState(report.id))?.resolution).toBe('promoted');
      },
    );
  });
});
