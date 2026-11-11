import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { auditLog, events, notifications } from '@concert-crawl/db';
import { ER_POLICY } from '@concert-crawl/types';

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

import { createApp } from '../app.js';
import {
  clearTables,
  seedEvent,
  seedEventReport,
  seedUserEvent,
  seedVenue,
} from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';

const app = createApp();

const as = (userId: string, role = 'user') => {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
};
const headers = {
  Authorization: 'Bearer t',
  'Content-Type': 'application/json',
};

const FUTURE = '2099-09-01';

const seedDelisted = async () => {
  const venue = await seedVenue();
  const event = await seedEvent(venue.id, {
    date: FUTURE,
    status: 'cancelled',
    // What the sweep leaves: still missing, and now delisted.
    firstMissingAt: new Date('2098-12-15T00:00:00Z'),
    delistedAt: new Date('2099-01-01T00:00:00Z'),
  });
  await seedUserEvent('user_watcher', event.id, { status: 'watching' });
  return event;
};

const delistedAtOf = async (id: string) => {
  const [row] = await testDb
    .select({ status: events.status, delistedAt: events.delistedAt })
    .from(events)
    .where(eq(events.id, id));
  return row;
};

const cancelNotices = () =>
  testDb
    .select({ userId: notifications.userId })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, 'user_notification'),
        eq(notifications.category, 'watch.cancelled'),
      ),
    );

/**
 * B+ A5: a show the stale sweep cancelled is No longer listed. A confirmed
 * status ends that state, and a confirmed cancellation tells the watchers the
 * sweep never told.
 */
describe('No longer listed (delisted_at)', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('comes back on its own page, but lists keep hiding it', async () => {
    const event = await seedDelisted();
    // The sweep's main input is a title-drift duplicate of a live show, so
    // browse keeps #607 suppression.
    const list = (await (await app.request('/v1/events')).json()) as {
      data: { data: { id: string }[] };
    };
    expect(list.data.data.map((row) => row.id)).not.toContain(event.id);
    const detail = (await (
      await app.request(`/v1/events/${event.id}`)
    ).json()) as { data: { delistedAt: string | null } };
    expect(detail.data.delistedAt).toBe('2099-01-01T00:00:00.000Z');
  });

  it('shows on Watching, but a show missing and not yet swept stays hidden', async () => {
    const event = await seedDelisted();
    const missing = await seedEvent(event.venueId, {
      artist: 'Blip',
      date: FUTURE,
      firstMissingAt: new Date(),
    });
    await seedUserEvent('user_watcher', missing.id, { status: 'watching' });
    as('user_watcher');
    const watching = (await (
      await app.request('/v1/watching', { headers })
    ).json()) as {
      data: { eventId: string; eventDelistedAt: string | null }[];
    };
    expect(watching.data.map((show) => show.eventId)).toEqual([event.id]);
    expect(watching.data[0]?.eventDelistedAt).toBe('2099-01-01T00:00:00.000Z');
    expect((await app.request(`/v1/events/${missing.id}`)).status).toBe(404);
  });

  it('a fan-confirmed cancellation clears it and notifies watchers', async () => {
    const event = await seedDelisted();
    const report = await seedEventReport(event.id, 'user_reporter', {
      status: 'cancelled',
    });
    for (let idx = 0; idx < ER_POLICY.confirmsRequired; idx++) {
      as(`user_confirmer_${idx}`);
      const res = await app.request(
        `/v1/events/${event.id}/reports/${report.id}/confirm`,
        { method: 'POST', headers },
      );
      expect(res.status).toBe(200);
    }
    expect(await delistedAtOf(event.id)).toEqual({
      status: 'cancelled',
      delistedAt: null,
    });
    expect((await cancelNotices()).map((row) => row.userId)).toEqual([
      'user_watcher',
    ]);
  });

  it('an admin marking it cancelled clears it and notifies watchers', async () => {
    const event = await seedDelisted();
    as('admin_user', 'admin');
    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'cancelled' }),
    });
    expect(res.status).toBe(200);
    expect((await delistedAtOf(event.id))?.delistedAt).toBeNull();
    expect(await cancelNotices()).toHaveLength(1);
  });

  it('an admin setting it back to upcoming clears it', async () => {
    const event = await seedDelisted();
    as('admin_user', 'admin');
    const res = await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'upcoming' }),
    });
    expect(res.status).toBe(200);
    expect(await delistedAtOf(event.id)).toEqual({
      status: 'upcoming',
      delistedAt: null,
    });
    // Restored means still on: the next sweep must not find it missing.
    const [row] = await testDb
      .select({ firstMissingAt: events.firstMissingAt })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row?.firstMissingAt).toBeNull();
    expect(await cancelNotices()).toHaveLength(0);
  });

  it('an edit that leaves the status alone keeps it', async () => {
    const event = await seedDelisted();
    as('admin_user', 'admin');
    await app.request(`/v1/admin/events/${event.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ tourName: 'Farewell' }),
    });
    expect((await delistedAtOf(event.id))?.delistedAt).not.toBeNull();
  });
});

describe('migration 0097 backfill', () => {
  beforeEach(async () => {
    await clearTables();
  });

  // The UPDATE half of the migration, re-run against fixtures.
  const backfill = () => {
    const file = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../packages/db/migrations/0097_event_delisted_at.sql',
    );
    const statement = readFileSync(file, 'utf8')
      .split('--> statement-breakpoint')
      .find((part) => part.includes('UPDATE'));
    if (!statement) throw new Error('0097 has no UPDATE');
    return testDb.execute(sql.raw(statement));
  };

  it('marks the sweep cancellations that are still cancelled', async () => {
    const venue = await seedVenue();
    const sweptAt = new Date('2026-10-01T09:00:00Z');
    const laterRun = new Date('2026-10-02T09:00:00Z');
    const swept = await seedEvent(venue.id, { status: 'cancelled' });
    // A background job touching the row after the sweep doesn't matter.
    const touched = await seedEvent(venue.id, {
      artist: 'Touched',
      status: 'cancelled',
      updatedAt: new Date('2026-10-05T09:00:00Z'),
    });
    // Someone moved it off cancelled since.
    const restored = await seedEvent(venue.id, {
      artist: 'Restored',
      status: 'upcoming',
    });
    const humanCancel = await seedEvent(venue.id, {
      artist: 'Human',
      status: 'cancelled',
    });
    const audit = (targetId: string, createdAt: Date) =>
      testDb.insert(auditLog).values({
        actorId: 'system:stale-event-sweep',
        action: 'event.auto_cancel.stale',
        targetId,
        createdAt,
      });
    await audit(swept.id, laterRun);
    await audit(swept.id, sweptAt); // two runs: the first one counts
    await audit(touched.id, sweptAt);
    await audit(restored.id, sweptAt);

    await backfill();
    await backfill(); // idempotent

    expect((await delistedAtOf(swept.id))?.delistedAt).toEqual(sweptAt);
    expect((await delistedAtOf(touched.id))?.delistedAt).toEqual(sweptAt);
    expect((await delistedAtOf(restored.id))?.delistedAt).toBeNull();
    expect((await delistedAtOf(humanCancel.id))?.delistedAt).toBeNull();
  });
});
