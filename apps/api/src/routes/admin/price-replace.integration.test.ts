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

// GET /v1/users/me reads the Clerk user; the replace path never does.
vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: () =>
        Promise.resolve({
          emailAddresses: [{ emailAddress: 'fan@example.com' }],
          publicMetadata: {},
          createdAt: Date.now(),
        }),
    },
  }),
}));

import {
  auditLog,
  events,
  notifications,
  priceSubmissions,
} from '@concert-crawl/db';
import { REPLACED_BY_ADMIN_REASON } from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createApp } from '../../app.js';
import { testDb } from '../../test/helpers/db.js';
import {
  clearTables,
  seedEvent,
  seedPriceSubmission,
  seedUserEvent,
  seedVenue,
} from '../../test/helpers/seed.js';

const app = createApp();
const ADMIN = 'user_admin_replacer';
const FAN_A = 'user_fan_a';
const FAN_B = 'user_fan_b';
const WATCHER = 'user_price_watcher';
const CHECKER = 'user_price_checker';

const asAdmin = () => {
  authState.current = {
    userId: ADMIN,
    sessionClaims: { metadata: { role: 'admin' } },
  };
};
const asFan = (userId: string) => {
  authState.current = { userId, sessionClaims: { metadata: { role: 'user' } } };
};

const replace = (eventId: string, priceMin: string, priceMax: string | null) =>
  app.request(`/v1/admin/prices/events/${eventId}/replace`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceMin, priceMax }),
  });

const detailBody = z.object({
  data: z.object({
    priceByTier: z
      .array(
        z.object({
          tier: z.string(),
          headline: z.object({ priceMin: z.string() }).nullable(),
        }),
      )
      .nullable(),
  }),
});

const meBody = z.object({
  data: z.object({
    submissionCounts: z.object({
      total: z.number(),
      live: z.number(),
      pending: z.number(),
      priceChecks: z.number(),
      closed: z.number(),
    }),
  }),
});

const submissionsBody = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      closedReason: z.string().optional(),
    }),
  ),
});

/**
 * The event editor's Edit price on a show with a fan price (Hugh,
 * 2026-11-14, 06/edit-price-desktop): the admin's price replaces the listed
 * one as their own submission, audited, and the fans who sent the old price
 * are not told.
 */
describe('POST /v1/admin/prices/events/:eventId/replace', () => {
  let eventId: string;
  let fanRows: string[];

  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-09-01',
      ticketPriceMin: '12',
      priceSource: 'community',
    });
    eventId = event.id;
    await seedUserEvent(WATCHER, eventId, { status: 'watching' });
    const rows = await Promise.all(
      [FAN_A, FAN_B].map((fan) =>
        seedPriceSubmission(eventId, fan, {
          priceMin: '12',
          status: 'corroborated',
        }),
      ),
    );
    fanRows = rows.map((row) => row.id);
  });

  it('makes the admin price the listed one on the event page', async () => {
    asAdmin();
    const res = await replace(eventId, '14', null);
    expect(res.status).toBe(201);

    authState.current = null;
    const detail = detailBody.parse(
      await (await app.request(`/v1/events/${eventId}`)).json(),
    );
    const ga = detail.data.priceByTier?.find((block) => block.tier === 'GA');
    expect(Number(ga?.headline?.priceMin)).toBe(14);
  });

  it('replaces the cheapest headline across every tier, archiving each tier’s fan price', async () => {
    await testDb
      .delete(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId));
    const [ga, vip] = await Promise.all([
      seedPriceSubmission(eventId, FAN_A, {
        tier: 'GA',
        priceMin: '40',
        status: 'corroborated',
      }),
      seedPriceSubmission(eventId, FAN_B, {
        tier: 'VIP',
        priceMin: '25',
        status: 'corroborated',
      }),
    ]);

    asAdmin();
    expect((await replace(eventId, '35', null)).status).toBe(201);

    authState.current = null;
    const detail = detailBody.parse(
      await (await app.request(`/v1/events/${eventId}`)).json(),
    );
    const headlines = (detail.data.priceByTier ?? []).flatMap((block) =>
      block.headline === null ? [] : [Number(block.headline.priceMin)],
    );
    expect(Math.min(...headlines)).toBe(35);

    const fans = await testDb
      .select({
        id: priceSubmissions.id,
        status: priceSubmissions.status,
        archivedReason: priceSubmissions.archivedReason,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId));
    for (const id of [ga.id, vip.id]) {
      const row = fans.find((fan) => fan.id === id);
      expect(row?.status).toBe('archived');
      expect(row?.archivedReason).toBe(REPLACED_BY_ADMIN_REASON);
    }
  });

  it('archives the fan prices it replaces, keeps them, and enters the admin price corroborated', async () => {
    asAdmin();
    expect((await replace(eventId, '14', '20')).status).toBe(201);

    const rows = await testDb
      .select({
        id: priceSubmissions.id,
        userId: priceSubmissions.userId,
        status: priceSubmissions.status,
        archivedReason: priceSubmissions.archivedReason,
        priceMin: priceSubmissions.priceMin,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId));
    const fans = rows.filter((row) => fanRows.includes(row.id));
    expect(fans).toHaveLength(2);
    for (const fan of fans) {
      expect(fan.status).toBe('archived');
      expect(fan.archivedReason).toBe(REPLACED_BY_ADMIN_REASON);
    }
    const mine = rows.find((row) => row.userId === ADMIN);
    expect(mine?.status).toBe('corroborated');
    expect(Number(mine?.priceMin)).toBe(14);

    const [event] = await testDb
      .select({ min: events.ticketPriceMin, max: events.ticketPriceMax })
      .from(events)
      .where(eq(events.id, eventId));
    expect(Number(event?.min)).toBe(14);
    expect(Number(event?.max)).toBe(20);
  });

  it('tells nobody, even when the price drops', async () => {
    asAdmin();
    expect((await replace(eventId, '8', null)).status).toBe(201);
    expect(await testDb.select().from(notifications)).toEqual([]);
  });

  it('audits the replacement with what it replaced', async () => {
    asAdmin();
    await replace(eventId, '14', null);
    const rows = await testDb
      .select({ action: auditLog.action, meta: auditLog.metadata })
      .from(auditLog)
      .where(eq(auditLog.targetId, eventId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('price.submission.replace_listed');
    expect(JSON.stringify(rows[0]?.meta)).toContain(fanRows[0] ?? 'missing');
  });

  it('reads as it did before on a fan’s own Submitted prices', async () => {
    asFan(FAN_A);
    const before = submissionsBody.parse(
      await (await app.request('/v1/users/me/submissions')).json(),
    );
    asAdmin();
    await replace(eventId, '14', null);
    asFan(FAN_A);
    const after = submissionsBody.parse(
      await (await app.request('/v1/users/me/submissions')).json(),
    );

    expect(after.data).toEqual(before.data);
    expect(after.data[0]?.status).toBe('confirmed');
    expect(after.data[0]?.closedReason).toBeUndefined();
  });

  it('refuses while a Price check is open on the show, writing nothing', async () => {
    const [disputed] = fanRows;
    if (!disputed) throw new Error('no fan row');
    // An open check: the parent disputed, with a pending counter on it.
    await testDb
      .update(priceSubmissions)
      .set({ status: 'disputed' })
      .where(eq(priceSubmissions.id, disputed));
    await seedPriceSubmission(eventId, CHECKER, {
      priceMin: '10',
      status: 'pending',
      disputedSubmissionId: disputed,
    });

    asAdmin();
    const res = await replace(eventId, '14', null);
    expect(res.status).toBe(409);
    const rows = await testDb
      .select({ userId: priceSubmissions.userId })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId));
    expect(rows.some((row) => row.userId === ADMIN)).toBe(false);
    expect(await testDb.select().from(auditLog)).toEqual([]);
  });

  it('does not count a disputed row with no pending counter as a Price check', async () => {
    const [denied] = fanRows;
    if (!denied) throw new Error('no fan row');
    // An admin denial: disputed, but no counter is open on it.
    await testDb
      .update(priceSubmissions)
      .set({ status: 'disputed' })
      .where(eq(priceSubmissions.id, denied));

    asAdmin();
    expect((await replace(eventId, '14', null)).status).toBe(201);
  });

  it('serializes two replaces fired together, leaving one listed admin price', async () => {
    asAdmin();
    const results = await Promise.all([
      replace(eventId, '14', null),
      replace(eventId, '16', null),
    ]);
    expect(results.map((res) => res.status)).toEqual([201, 201]);

    const rows = await testDb
      .select({
        userId: priceSubmissions.userId,
        status: priceSubmissions.status,
        archivedReason: priceSubmissions.archivedReason,
        priceMin: priceSubmissions.priceMin,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.eventId, eventId));
    const corroborated = rows.filter((row) => row.status === 'corroborated');
    expect(corroborated).toHaveLength(1);
    const admins = rows.filter((row) => row.userId === ADMIN);
    expect(admins).toHaveLength(2);
    const [listed] = corroborated;
    expect(listed?.userId).toBe(ADMIN);
    const archived = admins.find((row) => row.status === 'archived');
    expect(archived?.archivedReason).toBe(REPLACED_BY_ADMIN_REASON);
    // Whichever ran second archived the first's row and holds the listing,
    // so the two admin rows carry the two prices, one each.
    expect(
      [Number(listed?.priceMin), Number(archived?.priceMin)].sort(
        (left, right) => left - right,
      ),
    ).toEqual([14, 16]);

    const [event] = await testDb
      .select({ min: events.ticketPriceMin })
      .from(events)
      .where(eq(events.id, eventId));
    expect(Number(event?.min)).toBe(Number(listed?.priceMin));
  });

  it('leaves a fan’s submission counts unchanged', async () => {
    asFan(FAN_A);
    const before = meBody.parse(
      await (await app.request('/v1/users/me')).json(),
    );
    asAdmin();
    expect((await replace(eventId, '14', null)).status).toBe(201);
    asFan(FAN_A);
    const after = meBody.parse(
      await (await app.request('/v1/users/me')).json(),
    );

    expect(after.data.submissionCounts).toEqual(before.data.submissionCounts);
    expect(after.data.submissionCounts.live).toBe(1);
    expect(after.data.submissionCounts.closed).toBe(0);
  });

  it('rejects a bad price and an unknown show', async () => {
    asAdmin();
    expect((await replace(eventId, '20', '10')).status).toBe(422);
    expect(
      (await replace('11111111-1111-4111-8111-111111111111', '14', null))
        .status,
    ).toBe(404);
  });
});
