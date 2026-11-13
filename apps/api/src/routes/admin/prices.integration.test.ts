import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import {
  auditLog,
  events,
  notifications,
  priceSubmissions,
  userCred,
  venues,
} from '@concert-crawl/db';

vi.mock('@sentry/hono/node', async () => {
  const actual =
    await vi.importActual<typeof import('@sentry/hono/node')>(
      '@sentry/hono/node',
    );
  return {
    ...actual,
    captureMessage: vi.fn(),
  };
});

import * as Sentry from '@sentry/hono/node';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

// Prevent the async price pipeline from escaping into adjacent tests and
// causing TRUNCATE/INSERT deadlocks. The pipeline's correctness is covered
// by packages/price-pipeline unit tests.
vi.mock('@concert-crawl/price-pipeline', () => ({
  runPricePipeline: vi.fn().mockResolvedValue(undefined),
}));

import { createApp } from '../../app.js';
import {
  clearTables,
  seedEvent,
  seedPriceRetrievalLog,
  seedPriceSubmission,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { observeBlocking, withLockHolder } from '../../test/helpers/locks.js';

const app = createApp();

function setAdminAuth(): void {
  authState.current = {
    userId: 'admin_user',
    sessionClaims: { metadata: { role: 'admin' } },
  };
}

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
};

describe('GET /v1/admin/prices/activity', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it('returns expected fields for each row', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: '2026-06-15' });
    await seedPriceRetrievalLog(event.id, venue.id, {
      source: 'ticketmaster',
      outcome: 'miss',
      latencyMs: 42,
    });

    const res = await app.request('/v1/admin/prices/activity', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{
        eventId: string;
        eventTitle: string | null;
        venueName: string | null;
        date: string;
        source: string;
        outcome: string;
        latencyMs: number;
        attemptedAt: string;
      }>;
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    const row = body.data[0];
    expect(row?.eventId).toBe(event.id);
    expect(row?.source).toBe('ticketmaster');
    expect(row?.outcome).toBe('miss');
    expect(row?.latencyMs).toBe(42);
    expect(row?.attemptedAt).toBeDefined();
  });

  it('orders rows by event date ascending then attempt time descending', async () => {
    const venue = await seedVenue();
    const near = await seedEvent(venue.id, { date: '2026-06-01' });
    const far = await seedEvent(venue.id, { date: '2026-12-01' });
    await seedPriceRetrievalLog(far.id, venue.id, {
      source: 'seatgeek',
      outcome: 'miss',
      latencyMs: 0,
    });
    await seedPriceRetrievalLog(near.id, venue.id, {
      source: 'ticketmaster',
      outcome: 'hit',
      latencyMs: 50,
    });

    const res = await app.request('/v1/admin/prices/activity', {
      headers: ADMIN_HEADERS,
    });
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ eventId: string }>;
    };
    expect(body.data[0]?.eventId).toBe(near.id);
    expect(body.data[1]?.eventId).toBe(far.id);
  });
});

describe('GET /v1/admin/prices/health', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it('returns pipeline health stats', async () => {
    const res = await app.request('/v1/admin/prices/health', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { stats: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.stats)).toBe(true);
  });
});

describe('GET /v1/admin/prices/log', () => {
  beforeEach(() => {
    setAdminAuth();
  });

  it('returns last retrieval attempts', async () => {
    const res = await app.request('/v1/admin/prices/log', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /v1/admin/prices/pipeline/:eventId', () => {
  beforeEach(() => {
    setAdminAuth();
  });

  it('returns 202 and starts pipeline for existing event', async () => {
    await clearTables();
    const venue = await seedVenue();
    const event = await seedEvent(venue.id);

    const res = await app.request(`/v1/admin/prices/pipeline/${event.id}`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(202);
    const body = (await res.json()) as {
      success: boolean;
      data: { eventId: string };
    };
    expect(body.data.eventId).toBe(event.id);
  });

  it('refuses an event at a venue whose crawling is paused', async () => {
    await clearTables();
    const venue = await seedVenue();
    await testDb
      .update(venues)
      .set({ crawlPausedAt: new Date() })
      .where(eq(venues.id, venue.id));
    const event = await seedEvent(venue.id);

    const res = await app.request(`/v1/admin/prices/pipeline/${event.id}`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown event', async () => {
    const res = await app.request(
      '/v1/admin/prices/pipeline/00000000-0000-0000-0000-000000000000',
      {
        method: 'POST',
        headers: ADMIN_HEADERS,
      },
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /v1/admin/prices/submissions/:id', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  // Regression for #1012: a regular fan has NO user_roles row, so the old
  // UPDATE-user_roles award silently matched zero rows and their cred stayed 0.
  // The award now upserts into user_cred, so the fan gets a row scored 1.
  it('awards cred to a fan with no user_roles row on pending → corroborated', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id);
    const userId = 'user_cred_test';
    const submission = await seedPriceSubmission(event.id, userId);

    const res = await app.request(
      `/v1/admin/prices/submissions/${submission.id}`,
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    );
    expect(res.status).toBe(200);

    const [cred] = await testDb
      .select({ priceCredScore: userCred.priceCredScore })
      .from(userCred)
      .where(eq(userCred.userId, userId))
      .limit(1);
    expect(cred?.priceCredScore).toBe(1);
  });

  it('does not double-increment when status is already corroborated', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id);
    const userId = 'user_no_double';
    const submission = await seedPriceSubmission(event.id, userId, {
      status: 'corroborated',
    });

    const res = await app.request(
      `/v1/admin/prices/submissions/${submission.id}`,
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    );
    expect(res.status).toBe(200);

    // No transition occurred, so no award ran and no user_cred row exists —
    // which the read path treats as 0.
    const [cred] = await testDb
      .select({ priceCredScore: userCred.priceCredScore })
      .from(userCred)
      .where(eq(userCred.userId, userId))
      .limit(1);
    expect(cred?.priceCredScore ?? 0).toBe(0);
  });

  it('does not increment for anonymous submissions (null userId)', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id);
    const submission = await seedPriceSubmission(event.id, 'placeholder', {
      userId: null,
    });

    const res = await app.request(
      `/v1/admin/prices/submissions/${submission.id}`,
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('returns 404 for missing submission', async () => {
    const res = await app.request(
      '/v1/admin/prices/submissions/00000000-0000-0000-0000-000000000000',
      {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ status: 'corroborated' }),
      },
    );
    expect(res.status).toBe(404);
  });

  // Defensive lockout — see spec §4.7 + §11.3 and plan Task 4.
  // The pre-contest-UI PATCH endpoint cannot be allowed to overturn a
  // corroborated price by silently approving a counter row, nor mutate a
  // parent that has a pending counter against it (an active contest). Both
  // cases must return 409 and fire a loud Sentry capture so the
  // `endpoint_lockout: contest_row` tag baseline can be alerted on.
  //
  // The lockout is narrowed (R8) to fire only when a contest actually
  // exists. A row in `status='disputed'` with `disputed_submission_id IS
  // NULL` (e.g. admin moderation denial via PATCH) is NOT a contest and
  // remains PATCH-able.
  describe('contest-row lockout', () => {
    beforeEach(() => {
      vi.mocked(Sentry.captureMessage).mockClear();
    });

    it('rejects PATCH on a counter row (disputedSubmissionId !== null) with 409', async () => {
      const venue = await seedVenue({
        name: 'PATCH Lockout',
        slug: 'patch-lockout-1',
      });
      const event = await seedEvent(venue.id, { date: '2027-06-01' });
      const parent = await seedPriceSubmission(event.id, 'parent-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'corroborated',
      });
      const counter = await seedPriceSubmission(event.id, 'challenger-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '50',
        status: 'pending',
        disputedSubmissionId: parent.id,
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${counter.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );

      expect(res.status).toBe(409);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/contest/i);
      expect(body.error).toMatch(/\/v1\/admin\/contests\/prices/);

      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
      const [, options] = vi.mocked(Sentry.captureMessage).mock.calls[0] ?? [];
      expect(options).toMatchObject({
        level: 'warning',
        tags: { endpoint_lockout: 'contest_row' },
      });
    });

    // R8: the lockout is narrowed to fire only when a contest actually
    // exists. A row in status='disputed' but with disputed_submission_id
    // IS NULL is NOT in a contest — e.g. an admin moderation denial via
    // PATCH. Such rows must remain PATCH-able; locking them out would
    // surface a misleading "part of a contest" 409.
    it('accepts PATCH on a non-contest disputed row (disputed_submission_id IS NULL)', async () => {
      const venue = await seedVenue({
        name: 'PATCH Non-Contest Disputed',
        slug: 'patch-non-contest-disputed',
      });
      const event = await seedEvent(venue.id, { date: '2027-06-01' });
      // status='disputed' but no counter row points at it and
      // disputedSubmissionId is NULL — a moderation denial, not a contest.
      const submission = await seedPriceSubmission(event.id, 'denied-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'disputed',
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        data: { id: string; status: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('corroborated');

      // The lockout Sentry capture must NOT fire for non-contest rows.
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    // R2-2: a parent in status='corroborated' with a pending counter
    // against it must be locked from PATCH too. Both counter-creation
    // routes flip the parent to 'disputed' in the same transaction, so
    // this should be rare — but migration-window orphans and the narrow
    // window inside the resolve transaction can produce this state, and
    // the lockout is defense in depth.
    it('rejects PATCH on a corroborated parent with a pending counter against it', async () => {
      const venue = await seedVenue({
        name: 'PATCH Lockout 3',
        slug: 'patch-lockout-3',
      });
      const event = await seedEvent(venue.id, { date: '2027-06-01' });
      const parent = await seedPriceSubmission(event.id, 'parent-user-3', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'corroborated',
      });
      // Pending counter against the parent — but the parent's status
      // was not flipped (simulating the orphan / race scenarios the R2-2
      // lockout guards against).
      await seedPriceSubmission(event.id, 'challenger-user-3', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '55',
        status: 'pending',
        disputedSubmissionId: parent.id,
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${parent.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'stale' }),
        },
      );

      expect(res.status).toBe(409);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/contest/i);
      expect(body.error).toMatch(/\/v1\/admin\/contests\/prices/);

      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
      const [, options] = vi.mocked(Sentry.captureMessage).mock.calls[0] ?? [];
      expect(options).toMatchObject({
        level: 'warning',
        tags: { endpoint_lockout: 'contest_row' },
      });
    });

    it('still accepts PATCH on a non-contest pending row (regression)', async () => {
      const venue = await seedVenue({ name: 'PATCH OK', slug: 'patch-ok' });
      const event = await seedEvent(venue.id, { date: '2027-06-01' });
      const submission = await seedPriceSubmission(event.id, 'plain-user', {
        tier: 'GA',
        vendor: 'AXS',
        howFound: 'bought_myself',
        priceMin: '40',
        status: 'pending',
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );
      expect(res.status).toBe(200);
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('watch.pricedrop fan-out (#1107)', () => {
    it('fires watch.pricedrop to status=watching users when corroborated price is strictly lower', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        date: '2026-09-01',
        ticketPriceMin: '48',
      });
      const WATCHER = 'user_pricedrop_watcher';
      const GOING = 'user_pricedrop_going';
      await seedUserEvent(WATCHER, event.id, { status: 'watching' });
      await seedUserEvent(GOING, event.id, { status: 'going' });
      const submission = await seedPriceSubmission(event.id, 'submitter_1', {
        priceMin: '32',
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );
      expect(res.status).toBe(200);

      // Event price actually updated to the new floor.
      const [updatedEvent] = await testDb
        .select({ ticketPriceMin: events.ticketPriceMin })
        .from(events)
        .where(eq(events.id, event.id))
        .limit(1);
      expect(updatedEvent?.ticketPriceMin).toBe('32.00');

      // Watcher got exactly one watch.pricedrop bell row; going/interested
      // did not.
      const rows = await testDb
        .select({
          userId: notifications.userId,
          title: notifications.title,
          body: notifications.body,
        })
        .from(notifications)
        .where(eq(notifications.category, 'watch.pricedrop'));
      expect(rows.map((row) => row.userId)).toEqual([WATCHER]);
      // Copy carries the concrete new and old dollar amounts per the design
      // handoff mock.
      expect(rows[0]?.title).toMatch(/\$32.*just went on sale/);
      expect(rows[0]?.body).toMatch(/\$48/);
    });

    it('does not fire when the new corroborated price equals the current event price', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        date: '2026-09-02',
        ticketPriceMin: '35',
      });
      await seedUserEvent('user_equal_watcher', event.id, {
        status: 'watching',
      });
      const submission = await seedPriceSubmission(event.id, 'submitter_eq', {
        priceMin: '35',
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );
      expect(res.status).toBe(200);

      const rows = await testDb
        .select({ id: notifications.id })
        .from(notifications)
        .where(eq(notifications.category, 'watch.pricedrop'));
      expect(rows).toHaveLength(0);
    });

    it('does not fire when the new corroborated price is higher than the current event price', async () => {
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        date: '2026-09-03',
        ticketPriceMin: '30',
      });
      await seedUserEvent('user_higher_watcher', event.id, {
        status: 'watching',
      });
      const submission = await seedPriceSubmission(event.id, 'submitter_hi', {
        priceMin: '40',
      });

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );
      expect(res.status).toBe(200);

      const rows = await testDb
        .select({ id: notifications.id })
        .from(notifications)
        .where(eq(notifications.category, 'watch.pricedrop'));
      expect(rows).toHaveLength(0);
    });

    it('is not blocked by a foreign-key KEY SHARE lock on the event (deadlock guard)', async () => {
      // A concurrent dispute insert holds KEY SHARE on the event via its FK
      // check while waiting on the submission row this request locks. If the
      // event pre-read used FOR UPDATE it would wait on that KEY SHARE and
      // deadlock; FOR NO KEY UPDATE does not conflict with it.
      const venue = await seedVenue();
      const event = await seedEvent(venue.id, {
        date: '2026-09-05',
        ticketPriceMin: '48',
      });
      const submission = await seedPriceSubmission(event.id, 'submitter_ks', {
        priceMin: '32',
      });
      const { blocked, result } = await withLockHolder(
        [sql`SELECT id FROM events WHERE id = ${event.id} FOR KEY SHARE`],
        () =>
          observeBlocking(() =>
            app.request(`/v1/admin/prices/submissions/${submission.id}`, {
              method: 'PATCH',
              headers: ADMIN_HEADERS,
              body: JSON.stringify({ status: 'corroborated' }),
            }),
          ),
      );
      const res = await result;
      expect(blocked).toBe(false);
      expect(res.status).toBe(200);
    });

    it('does not fire when the event had no prior price to compare against', async () => {
      const venue = await seedVenue();
      // ticketPriceMin defaults to null on the seed. A first-ever price
      // isn't a "drop" — it's just data appearing.
      const event = await seedEvent(venue.id, { date: '2026-09-04' });
      await seedUserEvent('user_first_price_watcher', event.id, {
        status: 'watching',
      });
      const submission = await seedPriceSubmission(
        event.id,
        'submitter_first',
        {
          priceMin: '25',
        },
      );

      const res = await app.request(
        `/v1/admin/prices/submissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ status: 'corroborated' }),
        },
      );
      expect(res.status).toBe(200);

      const rows = await testDb
        .select({ id: notifications.id })
        .from(notifications)
        .where(eq(notifications.category, 'watch.pricedrop'));
      expect(rows).toHaveLength(0);
    });
  });
});

describe('GET /v1/admin/prices/events', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it('returns only missing-price events by default', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    });
    await seedEvent(venue.id, {
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: '25.00',
    });

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].priceMin).toBeNull();
  });

  it('returns all upcoming events when missingOnly=false', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    });
    await seedEvent(venue.id, {
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: '25.00',
    });

    const res = await app.request('/v1/admin/prices/events?missingOnly=false', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it('respects limit and offset', async () => {
    const venue = await seedVenue();
    for (let idx = 1; idx <= 5; idx++) {
      await seedEvent(venue.id, {
        date: `2099-07-0${idx}`,
        status: 'upcoming',
        ticketPriceMin: null,
      });
    }

    const res = await app.request(
      '/v1/admin/prices/events?missingOnly=true&limit=2&offset=2',
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].date).toBe('2099-07-03');
    expect(body.data[1].date).toBe('2099-07-04');
  });

  it('excludes past events', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      date: '2020-01-01',
      status: 'upcoming',
      ticketPriceMin: null,
    });
    await seedEvent(venue.id, {
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
    });

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    });
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].date).toBe('2099-07-01');
  });

  // Regression for #732: an event marked non-concert
  // (hidden_from_consumer=true) without a ticket price would otherwise
  // appear in the missing-price queue forever — the admin already
  // triaged it, it's not actionable. Same fix pattern as #712 applied
  // to the Missing tab.
  it('excludes hidden_from_consumer events from missing-price list', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      artist: 'Visible Concert',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    });
    await seedEvent(venue.id, {
      artist: 'Hidden Non-Concert',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: true,
    });

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    });
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].eventTitle).toBeDefined();
    // Visible Concert seeded as artist; default title is 'Test Show'.
    expect(body.data[0].artist).toBe('Visible Concert');
  });

  it('excludes hidden_from_consumer events when missingOnly=false too', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      artist: 'Visible',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: '25.00',
      hiddenFromConsumer: false,
    });
    await seedEvent(venue.id, {
      artist: 'Hidden',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: '30.00',
      hiddenFromConsumer: true,
    });

    const res = await app.request('/v1/admin/prices/events?missingOnly=false', {
      headers: ADMIN_HEADERS,
    });
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].artist).toBe('Visible');
  });

  // The admin UI fetches this surface via ?count=true (see
  // use-admin-review.ts). Pin the hidden filter on the counted shape
  // too — a future regression that applied the filter to rows but not
  // to the count(*) would otherwise slip past the array-shape test
  // above.
  it('excludes hidden_from_consumer from both rows AND total when count=true', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      artist: 'Visible Missing 1',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    });
    await seedEvent(venue.id, {
      artist: 'Visible Missing 2',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    });
    await seedEvent(venue.id, {
      artist: 'Hidden Missing',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-03',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: true,
    });

    const res = await app.request(
      '/v1/admin/prices/events?count=true&limit=10&offset=0',
      { headers: ADMIN_HEADERS },
    );
    const body = (await res.json()) as {
      success: boolean;
      data: { rows: { artist: string }[]; total: number };
    };
    expect(body.data.rows).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.rows.map((row) => row.artist)).not.toContain(
      'Hidden Missing',
    );
  });
});

describe('GET /v1/admin/prices/coverage', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  // Regression for #732: coverage % was deflated by admin-hidden
  // non-concerts (counted as upcoming events that "lack" prices). The
  // metric should reflect only the events that actually need price
  // coverage. Also enforces date >= today (parity with /prices/events)
  // since status='upcoming' alone can persist on stale past rows.
  it('excludes hidden_from_consumer and past dates from total and withPrice counts', async () => {
    const venue = await seedVenue();
    // 2 visible upcoming, 1 with price → coverage 1/2 = 50%
    await seedEvent(venue.id, {
      artist: 'Visible With Price',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-01',
      status: 'upcoming',
      ticketPriceMin: '25.00',
      hiddenFromConsumer: false,
    });
    await seedEvent(venue.id, {
      artist: 'Visible Missing Price',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-02',
      status: 'upcoming',
      ticketPriceMin: null,
      hiddenFromConsumer: false,
    });
    // 1 hidden non-concert with price (should NOT count toward either)
    await seedEvent(venue.id, {
      artist: 'Hidden Non-Concert',
      supportingArtists: null,
      tourName: null,
      date: '2099-07-03',
      status: 'upcoming',
      ticketPriceMin: '20.00',
      hiddenFromConsumer: true,
    });
    // 1 past-date row still marked upcoming (should NOT count — parity
    // with /prices/events which enforces date >= today)
    await seedEvent(venue.id, {
      artist: 'Past Stale',
      supportingArtists: null,
      tourName: null,
      date: '2020-01-01',
      status: 'upcoming',
      ticketPriceMin: '15.00',
      hiddenFromConsumer: false,
    });

    const res = await app.request('/v1/admin/prices/coverage', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBe(2);
    expect(body.data.withPrice).toBe(1);
    expect(body.data.pct).toBe(50);
  });
});

describe('GET /v1/admin/prices/events?count=true', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it('returns { rows, total } with total ignoring limit/offset', async () => {
    const venue = await seedVenue();
    for (let idx = 0; idx < 4; idx++) {
      await seedEvent(venue.id, {
        artist: `Artist ${idx}`,
        supportingArtists: null,
        tourName: null,
        date: `2099-08-0${idx + 1}`,
        status: 'upcoming',
        ticketPriceMin: null,
      });
    }

    const res = await app.request(
      '/v1/admin/prices/events?count=true&limit=2&offset=0',
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { rows: { eventId: string }[]; total: number };
    };
    expect(body.data.rows.length).toBe(2);
    expect(body.data.total).toBe(4);
  });

  it('keeps legacy array shape when count is omitted', async () => {
    const venue = await seedVenue();
    await seedEvent(venue.id, {
      artist: 'Solo',
      supportingArtists: null,
      tourName: null,
      date: '2099-08-15',
      status: 'upcoming',
      ticketPriceMin: null,
    });

    const res = await app.request('/v1/admin/prices/events', {
      headers: ADMIN_HEADERS,
    });
    const body = (await res.json()) as { success: boolean; data: unknown };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('applies missingOnly to both rows and total', async () => {
    const venue = await seedVenue();
    // 2 with price, 1 without — missingOnly=true should count only 1.
    await seedEvent(venue.id, {
      artist: 'Priced 1',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-01',
      status: 'upcoming',
      ticketPriceMin: '30',
    });
    await seedEvent(venue.id, {
      artist: 'Priced 2',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-02',
      status: 'upcoming',
      ticketPriceMin: '40',
    });
    await seedEvent(venue.id, {
      artist: 'Missing',
      supportingArtists: null,
      tourName: null,
      date: '2099-09-03',
      status: 'upcoming',
      ticketPriceMin: null,
    });

    const res = await app.request(
      '/v1/admin/prices/events?count=true&missingOnly=true&limit=10',
      { headers: ADMIN_HEADERS },
    );
    const body = (await res.json()) as {
      data: { rows: { eventId: string }[]; total: number };
    };
    expect(body.data.rows.length).toBe(1);
    expect(body.data.total).toBe(1);
  });
});

describe('GET /v1/admin/prices/submissions?count=true', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it('returns { rows, total } with total ignoring limit/offset', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: '2099-10-01' });
    for (let idx = 0; idx < 3; idx++) {
      await seedPriceSubmission(event.id, `user-${idx}`, {
        priceMin: `${20 + idx}`,
      });
    }

    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&limit=2&offset=0',
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { rows: { id: string }[]; total: number };
    };
    expect(body.data.rows.length).toBe(2);
    expect(body.data.total).toBe(3);
  });

  it('keeps legacy array shape when count is omitted', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: '2099-11-01' });
    await seedPriceSubmission(event.id, 'lone-user');

    const res = await app.request('/v1/admin/prices/submissions', {
      headers: ADMIN_HEADERS,
    });
    const body = (await res.json()) as { success: boolean; data: unknown };
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('GET /v1/admin/prices/submissions — status filter (#708)', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  // Regression for #708: the moderation queue must default to status='pending'
  // so the panel badge and the /admin/review pill agree. The submissions
  // endpoint historically returned every status — that's how 14 rows showed
  // under a "pending" label when only 1 was actually pending.
  it('defaults to status=pending and excludes corroborated/disputed/stale', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    await seedPriceSubmission(event.id, 'user-pending', { status: 'pending' });
    await seedPriceSubmission(event.id, 'user-corroborated', {
      status: 'corroborated',
    });
    await seedPriceSubmission(event.id, 'user-disputed', {
      status: 'disputed',
    });
    await seedPriceSubmission(event.id, 'user-stale', { status: 'stale' });

    const res = await app.request('/v1/admin/prices/submissions', {
      headers: ADMIN_HEADERS,
    });
    const body = (await res.json()) as {
      success: boolean;
      data: { userId: string; status: string }[];
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.userId).toBe('user-pending');
    expect(body.data[0]?.status).toBe('pending');
  });

  // The admin table is the only place a human can see who reported a price
  // still on sale, so the projection has to carry both columns through.
  it('projects the sighting timestamp and actor', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    const seenAt = new Date('2026-08-20T00:00:00Z');
    await seedPriceSubmission(event.id, 'user-pending', {
      status: 'pending',
      lastSeenAt: seenAt,
      lastSeenBy: 'user-sighter',
    });
    await seedPriceSubmission(event.id, 'user-unseen', { status: 'pending' });

    const res = await app.request('/v1/admin/prices/submissions', {
      headers: ADMIN_HEADERS,
    });
    const body = (await res.json()) as {
      data: {
        userId: string;
        lastSeenAt: string | null;
        lastSeenBy: string | null;
      }[];
    };
    const seen = body.data.find((row) => row.userId === 'user-pending');
    expect(seen?.lastSeenAt).toBe(seenAt.toISOString());
    expect(seen?.lastSeenBy).toBe('user-sighter');

    const unseen = body.data.find((row) => row.userId === 'user-unseen');
    expect(unseen?.lastSeenAt).toBeNull();
    expect(unseen?.lastSeenBy).toBeNull();
  });

  it('applies the pending filter to the count when count=true', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    await seedPriceSubmission(event.id, 'user-pending-1', {
      status: 'pending',
    });
    await seedPriceSubmission(event.id, 'user-pending-2', {
      status: 'pending',
    });
    await seedPriceSubmission(event.id, 'user-stale', { status: 'stale' });

    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&limit=10&offset=0',
      { headers: ADMIN_HEADERS },
    );
    const body = (await res.json()) as {
      success: boolean;
      data: { rows: unknown[]; total: number };
    };
    expect(body.data.total).toBe(2);
    expect(body.data.rows).toHaveLength(2);
  });

  it('returns all statuses when status=all is passed', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    await seedPriceSubmission(event.id, 'user-pending', { status: 'pending' });
    await seedPriceSubmission(event.id, 'user-corroborated', {
      status: 'corroborated',
    });

    const res = await app.request('/v1/admin/prices/submissions?status=all', {
      headers: ADMIN_HEADERS,
    });
    const body = (await res.json()) as {
      success: boolean;
      data: { userId: string }[];
    };
    expect(body.data).toHaveLength(2);
  });

  // R1-1 (PR #754): contest counter rows (status='pending' AND
  // disputed_submission_id IS NOT NULL) belong to the dedicated contest
  // queue at /v1/admin/contests/prices and are blocked from PATCH on the
  // legacy submissions endpoint (#754 lockout returns 409). Including them
  // here meant admins saw rows they couldn't action AND they would be
  // double-counted in BOTH the `prices` pill and the `priceContests` pill
  // on /admin/review.
  it('excludes contest counter rows (disputed_submission_id IS NOT NULL)', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    const parent = await seedPriceSubmission(event.id, 'parent-user', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'bought_myself',
      priceMin: '40',
      status: 'corroborated',
    });
    await seedPriceSubmission(event.id, 'counter-user', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'bought_myself',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parent.id,
    });
    // Non-contest pending row to prove the filter is precise — should be
    // the ONLY row returned.
    await seedPriceSubmission(event.id, 'plain-pending-user', {
      status: 'pending',
      priceMin: '45',
    });

    const res = await app.request('/v1/admin/prices/submissions', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { userId: string; disputedSubmissionId: string | null }[];
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.userId).toBe('plain-pending-user');
    // disputedSubmissionId is surfaced on the wire so any future UI can
    // tell contest rows apart without re-querying. Always null in the
    // filtered result.
    expect(body.data[0]?.disputedSubmissionId).toBeNull();
  });

  it('excludes contest counter rows from the count when count=true', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    const parent = await seedPriceSubmission(event.id, 'parent-user', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'bought_myself',
      priceMin: '40',
      status: 'corroborated',
    });
    await seedPriceSubmission(event.id, 'counter-user', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'bought_myself',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parent.id,
    });
    await seedPriceSubmission(event.id, 'plain-pending-1', {
      status: 'pending',
      priceMin: '45',
    });
    await seedPriceSubmission(event.id, 'plain-pending-2', {
      status: 'pending',
      priceMin: '50',
    });

    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&limit=10&offset=0',
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { rows: unknown[]; total: number };
    };
    expect(body.data.total).toBe(2);
    expect(body.data.rows).toHaveLength(2);
  });
});

// Redesign 4d: editing the price on a waiting or published submission (the row
// menu's "Edit price"). Audited; bounded; Price check rows are locked out.
describe('PATCH /v1/admin/prices/submissions/:id/price', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  const edit = (id: string, body: unknown) =>
    app.request(`/v1/admin/prices/submissions/${id}/price`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify(body),
    });

  const seedShow = async (slug: string, overrides = {}) => {
    const venue = await seedVenue({ name: 'Edit Hall', slug });
    return seedEvent(venue.id, {
      title: `Show ${slug}`,
      artist: `Artist ${slug}`,
      date: '2099-11-01',
      ...overrides,
    });
  };

  const priceOf = async (id: string) => {
    const [row] = await testDb
      .select({
        min: priceSubmissions.priceMin,
        max: priceSubmissions.priceMax,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id));
    return row;
  };

  it('edits a waiting price and audits before and after', async () => {
    const event = await seedShow('edit-pending');
    const row = await seedPriceSubmission(event.id, 'edit_user', {
      status: 'pending',
      priceMin: '40.00',
    });
    const res = await edit(row.id, { priceMin: '45', priceMax: '60.50' });
    expect(res.status).toBe(200);
    expect(await priceOf(row.id)).toEqual({ min: '45.00', max: '60.50' });

    const [audit] = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'price.submission.edit_price'));
    expect(audit?.targetId).toBe(row.id);
    expect(audit?.metadata).toMatchObject({
      before: { priceMin: '40.00' },
      after: { priceMin: '45', priceMax: '60.50' },
      eventUpdated: false,
    });
  });

  it("moves the show's price when the published price is what it shows", async () => {
    const event = await seedShow('edit-projected', {
      ticketPriceMin: '40.00',
      ticketPriceMax: '40.00',
      priceSource: 'community',
    });
    const row = await seedPriceSubmission(event.id, 'edit_pub_user', {
      status: 'corroborated',
      priceMin: '40.00',
      priceMax: '40.00',
    });
    expect(
      (await edit(row.id, { priceMin: '42', priceMax: '42' })).status,
    ).toBe(200);
    const [after] = await testDb
      .select({ min: events.ticketPriceMin, max: events.ticketPriceMax })
      .from(events)
      .where(eq(events.id, event.id));
    expect(after).toEqual({ min: '42.00', max: '42.00' });
  });

  it('leaves the show alone when its price came from somewhere else', async () => {
    const event = await seedShow('edit-not-projected', {
      ticketPriceMin: '99.00',
      priceSource: 'community',
    });
    const row = await seedPriceSubmission(event.id, 'edit_other_user', {
      status: 'corroborated',
      priceMin: '40.00',
    });
    expect(
      (await edit(row.id, { priceMin: '42', priceMax: null })).status,
    ).toBe(200);
    const [after] = await testDb
      .select({ min: events.ticketPriceMin })
      .from(events)
      .where(eq(events.id, event.id));
    expect(after?.min).toBe('99.00');
  });

  it('refuses a price that is not waiting or published', async () => {
    const event = await seedShow('edit-archived');
    const row = await seedPriceSubmission(event.id, 'edit_arch_user', {
      status: 'archived',
    });
    expect(
      (await edit(row.id, { priceMin: '42', priceMax: null })).status,
    ).toBe(409);
  });

  it('refuses a price with an open Price check, and a counter row', async () => {
    const event = await seedShow('edit-contest');
    const parent = await seedPriceSubmission(event.id, 'edit_parent', {
      status: 'pending',
    });
    const counter = await seedPriceSubmission(event.id, 'edit_counter', {
      status: 'pending',
      disputedSubmissionId: parent.id,
    });
    expect(
      (await edit(parent.id, { priceMin: '42', priceMax: null })).status,
    ).toBe(409);
    expect(
      (await edit(counter.id, { priceMin: '42', priceMax: null })).status,
    ).toBe(409);
  });

  it('422s a bad amount and 404s an unknown id', async () => {
    const event = await seedShow('edit-bad');
    const row = await seedPriceSubmission(event.id, 'edit_bad_user');
    for (const body of [
      { priceMin: '42' },
      { priceMin: '0042', priceMax: null },
      { priceMin: '-5', priceMax: null },
      { priceMin: '12.345' },
      { priceMin: 'free' },
      { priceMin: '2001' },
      { priceMin: '50', priceMax: '40' },
      {},
    ]) {
      expect((await edit(row.id, body)).status).toBe(422);
    }
    expect(
      (
        await edit('00000000-0000-0000-0000-000000000000', {
          priceMin: '42',
          priceMax: null,
        })
      ).status,
    ).toBe(404);
  });
});

// Redesign 4d: rejecting a waiting price. A rejection is `archived` with the
// reason in archived_reason, never `disputed` (that is a Price check).
describe('POST /v1/admin/prices/submissions/:id/reject', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  const reject = (id: string, body: unknown) =>
    app.request(`/v1/admin/prices/submissions/${id}/reject`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify(body),
    });

  const seedShow = async (slug: string) => {
    const venue = await seedVenue({ name: 'Reject Hall', slug });
    return seedEvent(venue.id, {
      title: `Show ${slug}`,
      artist: `Artist ${slug}`,
      date: '2099-11-01',
    });
  };

  it('archives a waiting price with the reason and clears the hold', async () => {
    const event = await seedShow('reject-ok');
    const row = await seedPriceSubmission(event.id, 'rej_user', {
      status: 'pending',
      heldForAdminAt: new Date(),
    });
    const res = await reject(row.id, {
      reason: 'wrong-amount',
      note: 'that is the VIP tier',
    });
    expect(res.status).toBe(200);
    const [after] = await testDb
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, row.id));
    expect(after?.status).toBe('archived');
    expect(after?.archivedReason).toBe(
      'rejected:wrong-amount|that is the VIP tier',
    );
    expect(after?.heldForAdminAt).toBeNull();

    const [audit] = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'price.submission.reject'));
    expect(audit?.targetId).toBe(row.id);
  });

  it('lists the rejection parsed, in the "not-used" state', async () => {
    const event = await seedShow('reject-list');
    const row = await seedPriceSubmission(event.id, 'rej_list_user', {
      status: 'pending',
    });
    await reject(row.id, { reason: 'resale' });
    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&state=all',
      { headers: ADMIN_HEADERS },
    );
    const body = (await res.json()) as {
      data: {
        rows: Array<{
          id: string;
          state: string;
          rejection: { reason: string; note: string | null } | null;
        }>;
      };
    };
    const found = body.data.rows.find((entry) => entry.id === row.id);
    expect(found?.state).toBe('not-used');
    expect(found?.rejection).toEqual({ reason: 'resale', note: null });
  });

  it('does not read a re-approved price as rejected', async () => {
    const event = await seedShow('reject-reapprove');
    const row = await seedPriceSubmission(event.id, 'rej_re_user', {
      status: 'pending',
    });
    await reject(row.id, { reason: 'other' });
    await app.request(`/v1/admin/prices/submissions/${row.id}`, {
      method: 'PATCH',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: 'corroborated' }),
    });
    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&state=all',
      { headers: ADMIN_HEADERS },
    );
    const body = (await res.json()) as {
      data: {
        rows: Array<{ id: string; state: string; rejection: unknown }>;
      };
    };
    const found = body.data.rows.find((entry) => entry.id === row.id);
    expect(found?.state).toBe('published');
    expect(found?.rejection).toBeNull();
  });

  it('a bare "@" search does not match every handle', async () => {
    const event = await seedShow('reject-at');
    await seedUserProfile('rej_at_user', { handle: 'someone' });
    await seedPriceSubmission(event.id, 'rej_at_user');
    const res = await app.request(
      '/v1/admin/prices/submissions?count=true&state=all&search=%40',
      { headers: ADMIN_HEADERS },
    );
    const body = (await res.json()) as { data: { total: number } };
    expect(body.data.total).toBe(0);
  });

  it('refuses a price that is not waiting', async () => {
    const event = await seedShow('reject-published');
    const row = await seedPriceSubmission(event.id, 'rej_pub_user', {
      status: 'corroborated',
    });
    const res = await reject(row.id, { reason: 'other' });
    expect(res.status).toBe(409);
  });

  it('refuses a price that has an open Price check, and a counter row', async () => {
    const event = await seedShow('reject-contest');
    const parent = await seedPriceSubmission(event.id, 'rej_parent', {
      status: 'pending',
    });
    const counter = await seedPriceSubmission(event.id, 'rej_counter', {
      status: 'pending',
      disputedSubmissionId: parent.id,
    });
    expect((await reject(parent.id, { reason: 'other' })).status).toBe(409);
    expect((await reject(counter.id, { reason: 'other' })).status).toBe(409);
    const [after] = await testDb
      .select({ status: priceSubmissions.status })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, parent.id));
    expect(after?.status).toBe('pending');
  });

  it('422s an unknown reason and 404s an unknown id', async () => {
    const event = await seedShow('reject-bad');
    const row = await seedPriceSubmission(event.id, 'rej_bad_user');
    expect((await reject(row.id, { reason: 'because' })).status).toBe(422);
    expect(
      (
        await reject('00000000-0000-0000-0000-000000000000', {
          reason: 'other',
        })
      ).status,
    ).toBe(404);
  });
});

describe('GET /v1/admin/prices/submissions/:id/fan-others', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it("lists the same fan's other prices and nobody else's", async () => {
    const venue = await seedVenue({ name: 'Fan Hall', slug: 'fan-hall' });
    const first = await seedEvent(venue.id, {
      title: 'First',
      artist: 'First Artist',
      date: '2099-12-01',
    });
    const second = await seedEvent(venue.id, {
      title: 'Second',
      artist: 'Second Artist',
      date: '2099-12-02',
    });
    await seedUserProfile('fan_a', { handle: 'fana' });
    const own = await seedPriceSubmission(first.id, 'fan_a');
    await seedPriceSubmission(second.id, 'fan_a');
    await seedPriceSubmission(second.id, 'fan_b');

    const res = await app.request(
      `/v1/admin/prices/submissions/${own.id}/fan-others`,
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { handle: string | null; rows: Array<{ eventTitle: string }> };
    };
    expect(body.data.handle).toBe('fana');
    expect(body.data.rows.map((row) => row.eventTitle)).toEqual(['Second']);
  });

  it('404s an unknown submission', async () => {
    const res = await app.request(
      '/v1/admin/prices/submissions/00000000-0000-0000-0000-000000000000/fan-others',
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(404);
  });
});

// Redesign 4d: the Missing a price tab. Soonest show first, then the one most
// fans are Watching; a "next" cursor; the tab-strip numbers; and adding a price
// only to a show that has none.
describe('Missing a price tab', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  const seedMissing = async () => {
    const venue = await seedVenue({
      name: 'Missing Hall',
      slug: 'missing-hall',
    });
    const soonQuiet = await seedEvent(venue.id, {
      title: 'Soon Quiet',
      artist: 'Soon Quiet',
      date: '2099-01-01',
    });
    const laterBusy = await seedEvent(venue.id, {
      title: 'Later Busy',
      artist: 'Later Busy',
      date: '2099-01-02',
    });
    const laterQuiet = await seedEvent(venue.id, {
      title: 'Later Quiet',
      artist: 'Later Quiet',
      date: '2099-01-02',
    });
    const priced = await seedEvent(venue.id, {
      title: 'Priced',
      artist: 'Priced',
      date: '2099-01-01',
      ticketPriceMin: '30',
    });
    await seedUserEvent('watcher_1', laterBusy.id, { status: 'watching' });
    await seedUserEvent('watcher_2', laterBusy.id, { status: 'watching' });
    await seedUserEvent('watcher_1', soonQuiet.id, { status: 'watching' });
    return { soonQuiet, laterBusy, laterQuiet, priced };
  };

  type MissingRow = {
    eventId: string;
    eventTitle: string;
    venueSlug: string;
    watching: number;
  };
  const getJson = async <T>(path: string): Promise<T> => {
    const res = await app.request(`/v1/admin/prices${path}`, {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    return ((await res.json()) as { data: T }).data;
  };
  const nextAfter = async (after?: string): Promise<MissingRow | null> =>
    getJson<MissingRow | null>(
      after === undefined ? '/missing/next' : `/missing/next?after=${after}`,
    );

  it('lists soonest first, then most Watched, with the Watching count', async () => {
    await seedMissing();
    const data = await getJson<{ rows: MissingRow[] }>('/events?count=true');
    expect(data.rows.map((row) => row.eventTitle)).toEqual([
      'Soon Quiet',
      'Later Busy',
      'Later Quiet',
    ]);
    expect(data.rows.map((row) => row.watching)).toEqual([1, 2, 0]);
    expect(data.rows.every((row) => row.venueSlug === 'missing-hall')).toBe(
      true,
    );
  });

  it('walks the same order with /missing/next and ends with null', async () => {
    const { soonQuiet, laterBusy, laterQuiet } = await seedMissing();
    expect((await nextAfter())?.eventId).toBe(soonQuiet.id);
    expect((await nextAfter(soonQuiet.id))?.eventId).toBe(laterBusy.id);
    expect((await nextAfter(laterBusy.id))?.eventId).toBe(laterQuiet.id);
    expect(await nextAfter(laterQuiet.id)).toBeNull();
  });

  it('/missing/next still finds the neighbour of a show that just got a price', async () => {
    const { soonQuiet, laterBusy } = await seedMissing();
    await testDb
      .update(events)
      .set({ ticketPriceMin: '25' })
      .where(eq(events.id, soonQuiet.id));
    expect((await nextAfter(soonQuiet.id))?.eventId).toBe(laterBusy.id);
  });

  it('/missing/next 404s an unknown show and 422s a bad id', async () => {
    const unknown = await app.request(
      '/v1/admin/prices/missing/next?after=00000000-0000-0000-0000-000000000000',
      { headers: ADMIN_HEADERS },
    );
    expect(unknown.status).toBe(404);
    const bad = await app.request('/v1/admin/prices/missing/next?after=nope', {
      headers: ADMIN_HEADERS,
    });
    expect(bad.status).toBe(422);
  });

  it('/tabs counts missing shows, submitted prices, open checks and people', async () => {
    const { priced, soonQuiet } = await seedMissing();
    const parent = await seedPriceSubmission(priced.id, 'tabs_a');
    await seedPriceSubmission(priced.id, 'tabs_b', {
      status: 'pending',
      disputedSubmissionId: parent.id,
    });
    await seedPriceSubmission(soonQuiet.id, 'tabs_a');
    expect(await getJson<unknown>('/tabs')).toEqual({
      missing: 3,
      submitted: 2,
      checksOpen: 1,
      checksResolved: 0,
      peopleSubmitting: 2,
    });
  });

  it('refuses to add a price to a show that already has one', async () => {
    const { priced, soonQuiet } = await seedMissing();
    const add = (eventId: string) =>
      app.request('/v1/admin/prices/submissions', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          eventId,
          priceMin: '40',
          vendor: 'Ticketmaster',
          howFound: 'saw_listing',
        }),
      });
    expect((await add(priced.id)).status).toBe(409);
    expect((await add(soonQuiet.id)).status).toBe(201);
    expect((await add(soonQuiet.id)).status).toBe(409);
  });
});

// Redesign 4d: the Submitted prices tab shows the fan's @handle (never the
// Clerk id), how many fans back each price, one of four exclusive states, and
// a search over the show, the venue and the handle.
describe('GET /v1/admin/prices/submissions — the Submitted prices tab', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  type Row = {
    id: string;
    handle: string | null;
    backedBy: number;
    state: string;
    eventTitle: string | null;
  };
  const list = async (query = ''): Promise<Row[]> => {
    const res = await app.request(
      `/v1/admin/prices/submissions?count=true&state=all${query}`,
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { rows: Row[] } };
    return body.data.rows;
  };

  const seedTab = async () => {
    const venue = await seedVenue({
      name: 'Mission Ballroom',
      slug: 'mission',
    });
    const waitingEvent = await seedEvent(venue.id, {
      title: 'Vince Staples',
      artist: 'Vince Staples',
      date: '2099-10-01',
    });
    const publishedEvent = await seedEvent(venue.id, {
      title: 'Japanese Breakfast',
      artist: 'Japanese Breakfast',
      date: '2099-10-02',
    });
    const checkedEvent = await seedEvent(venue.id, {
      title: 'Big Thief',
      artist: 'Big Thief',
      date: '2099-10-03',
    });
    await seedUserProfile('user_anna', { handle: 'annab' });
    const waiting = await seedPriceSubmission(waitingEvent.id, 'user_anna', {
      status: 'pending',
    });
    // The submitter plus two fans who confirmed it.
    const published = await seedPriceSubmission(publishedEvent.id, 'user_b', {
      status: 'corroborated',
      corroborationCount: 3,
    });
    const checked = await seedPriceSubmission(checkedEvent.id, 'user_e', {
      status: 'corroborated',
    });
    await seedPriceSubmission(checkedEvent.id, 'user_f', {
      status: 'pending',
      disputedSubmissionId: checked.id,
    });
    const rejected = await seedPriceSubmission(waitingEvent.id, 'user_g', {
      status: 'archived',
    });
    return { waiting, published, checked, rejected };
  };

  it("shows the fan's handle and how many fans back each price", async () => {
    const { waiting, published } = await seedTab();
    const rows = await list();
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(waiting.id)?.handle).toBe('annab');
    expect(byId.get(published.id)?.handle).toBeNull();
    expect(byId.get(published.id)?.backedBy).toBe(3);
    expect(byId.get(waiting.id)?.backedBy).toBe(1);
  });

  it('puts every row in exactly one state: a price with an open Price check is a price-check', async () => {
    const { waiting, published, checked, rejected } = await seedTab();
    const byId = new Map((await list()).map((row) => [row.id, row.state]));
    expect(byId.get(waiting.id)).toBe('waiting');
    expect(byId.get(published.id)).toBe('published');
    expect(byId.get(checked.id)).toBe('price-check');
    expect(byId.get(rejected.id)).toBe('not-used');
  });

  it('filters by chip, and the chip counts add up', async () => {
    const { waiting, published, checked } = await seedTab();
    const only = async (state: string) =>
      (
        await (
          await app.request(
            `/v1/admin/prices/submissions?count=true&state=${state}`,
            { headers: ADMIN_HEADERS },
          )
        ).json()
      ).data.rows.map((row: { id: string }) => row.id);
    expect(await only('waiting')).toEqual([waiting.id]);
    expect(await only('published')).toEqual([published.id]);
    expect(await only('price-check')).toEqual([checked.id]);

    const counts = async (query = '') => {
      const res = await app.request(
        `/v1/admin/prices/submissions/state-counts${query}`,
        { headers: ADMIN_HEADERS },
      );
      expect(res.status).toBe(200);
      return ((await res.json()) as { data: Record<string, number> }).data;
    };
    // The counter row is not a row of this tab; the rejected price is under All.
    expect(await counts()).toEqual({
      all: 4,
      waiting: 1,
      published: 1,
      priceCheck: 1,
    });
    // With a search the chips count the matches, so they agree with the list.
    expect(await counts('?search=annab')).toEqual({
      all: 1,
      waiting: 1,
      published: 0,
      priceCheck: 0,
    });
  });

  it('searches the show, the venue and the handle (with or without "@"), and treats % literally', async () => {
    const { waiting } = await seedTab();
    expect((await list('&search=vince')).map((row) => row.eventTitle)).toEqual([
      'Vince Staples',
      'Vince Staples',
    ]);
    expect(await list('&search=annab')).toHaveLength(1);
    expect((await list('&search=@annab')).map((row) => row.id)).toEqual([
      waiting.id,
    ]);
    expect(await list('&search=mission')).toHaveLength(4);

    // "50%" must match a title that contains it, not act as a wildcard that
    // would also match "Fifty off".
    const venue = await seedVenue({ name: 'Ogden', slug: 'ogden' });
    const literal = await seedEvent(venue.id, {
      title: '50% off night',
      artist: '50% off night',
      date: '2099-11-01',
    });
    const other = await seedEvent(venue.id, {
      title: '50 cent night',
      artist: '50 cent night',
      date: '2099-11-02',
    });
    await seedPriceSubmission(literal.id, 'user_h', { status: 'pending' });
    await seedPriceSubmission(other.id, 'user_i', { status: 'pending' });
    expect((await list('&search=50%25')).map((row) => row.eventTitle)).toEqual([
      '50% off night',
    ]);
  });

  it('refuses status and state together instead of choosing one', async () => {
    const res = await app.request(
      '/v1/admin/prices/submissions?status=pending&state=all',
      { headers: ADMIN_HEADERS },
    );
    expect(res.status).toBe(422);
  });
});

describe('GET /v1/admin/prices/submissions/count', () => {
  beforeEach(() => {
    setAdminAuth();
    return clearTables();
  });

  it('returns the pending count for plain submissions', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: '2099-10-01' });
    await seedPriceSubmission(event.id, 'user-pending-1', {
      status: 'pending',
      priceMin: '20',
    });
    await seedPriceSubmission(event.id, 'user-pending-2', {
      status: 'pending',
      priceMin: '25',
    });
    await seedPriceSubmission(event.id, 'user-corroborated', {
      status: 'corroborated',
      priceMin: '30',
    });

    const res = await app.request('/v1/admin/prices/submissions/count', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { pending: number };
    };
    expect(body.data.pending).toBe(2);
  });

  // R11-1 (PR #754): the dashboard count must stay in lock-step with the
  // list endpoint (/v1/admin/prices/submissions) and the `prices` field on
  // /v1/admin/review/counts. Both already exclude contest counter rows
  // (`disputed_submission_id IS NOT NULL`) — the count endpoint previously
  // included them, so dashboard count > list count > review counts and
  // admins saw three disagreeing numbers for the same surface.
  it('excludes contest counter rows (disputed_submission_id IS NOT NULL)', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: '2099-10-01',
      verified: true,
    });
    const parent = await seedPriceSubmission(event.id, 'parent-user', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'bought_myself',
      priceMin: '40',
      status: 'corroborated',
    });
    await seedPriceSubmission(event.id, 'counter-user', {
      tier: 'GA',
      vendor: 'AXS',
      howFound: 'bought_myself',
      priceMin: '60',
      status: 'pending',
      disputedSubmissionId: parent.id,
    });
    // Two plain pending rows — the count should return exactly these and
    // exclude the counter above.
    await seedPriceSubmission(event.id, 'plain-pending-1', {
      status: 'pending',
      priceMin: '45',
    });
    await seedPriceSubmission(event.id, 'plain-pending-2', {
      status: 'pending',
      priceMin: '50',
    });

    const res = await app.request('/v1/admin/prices/submissions/count', {
      headers: ADMIN_HEADERS,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { pending: number };
    };
    expect(body.data.pending).toBe(2);
  });
});
