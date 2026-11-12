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

import { z } from 'zod';
import { auditLog, emailSendLog } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { IN_FLIGHT_SEND_GRACE_MS } from './notifications.js';
import { clearTables } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
}

const get = (query = ''): Promise<Response> =>
  app.request(`/v1/admin/notifications/delivery${query}`);

const deliverySchema = z.object({
  success: z.literal(true),
  data: z.object({
    lastSentAt: z.string().nullable(),
    sent: z.number(),
    failed: z.number(),
    suppressed: z.number(),
    other: z.number(),
    hours: z.number(),
  }),
});

const validationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.literal('ZodError'),
    issues: z.array(z.object({ path: z.array(z.unknown()) })),
  }),
});

const HOUR_MS = 3_600_000;
let nonce = 0;

async function logSendAt(
  status: string,
  msAgo: number,
  resendId: string | null = null,
): Promise<Date> {
  nonce += 1;
  const createdAt = new Date(Date.now() - msAgo);
  await testDb.insert(emailSendLog).values({
    templateKey: 'spotify_digest',
    userId: `user_${nonce}`,
    dedupeKey: `delivery_${nonce}`,
    status,
    resendId,
    createdAt,
  });
  return createdAt;
}

const logSend = (status: string, hoursAgo: number): Promise<Date> =>
  logSendAt(status, hoursAgo * HOUR_MS);

describe('GET /v1/admin/notifications/delivery', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    expect((await get()).status).toBe(403);
  });

  it('reports zeros and a null lastSentAt on an empty log', async () => {
    setAuth('admin');
    const res = await get();
    expect(res.status).toBe(200);
    expect(deliverySchema.parse(await res.json()).data).toEqual({
      lastSentAt: null,
      sent: 0,
      failed: 0,
      suppressed: 0,
      other: 0,
      hours: 24,
    });
  });

  it('leaves a failed claim still inside the grace period out of failed', async () => {
    setAuth('admin');
    const SECOND_MS = 1000;
    // Claimed seconds ago, Resend not answered yet: in flight, not failed.
    await logSendAt('failed', 30 * SECOND_MS);
    // Past the grace period: a real failure.
    await logSendAt('failed', IN_FLIGHT_SEND_GRACE_MS + 60 * SECOND_MS);
    // A young sent row is never held back.
    await logSendAt('sent', 30 * SECOND_MS, 're_sent');

    const data = deliverySchema.parse(await (await get()).json()).data;
    expect(data).toMatchObject({ sent: 1, failed: 1, suppressed: 0, other: 0 });
  });

  it('counts any status other than sent, failed or suppressed as other', async () => {
    setAuth('admin');
    await logSend('sent', 1);
    await logSend('bounced', 2);
    await logSend('queued', 3);
    await logSend('queued', 4);
    // Outside the window, so not counted.
    await logSend('bounced', 30);

    const data = deliverySchema.parse(await (await get()).json()).data;
    expect(data).toMatchObject({ sent: 1, failed: 0, suppressed: 0, other: 3 });
  });

  it('counts each status inside the window and leaves older rows out', async () => {
    setAuth('admin');
    await logSend('sent', 1);
    await logSend('sent', 23);
    await logSend('failed', 2);
    await logSend('suppressed', 5);
    await logSend('suppressed', 6);
    await logSend('suppressed', 7);
    // Outside the default 24-hour window.
    await logSend('sent', 30);
    await logSend('failed', 48);
    await logSend('suppressed', 100);

    const day = deliverySchema.parse(await (await get()).json()).data;
    expect(day).toMatchObject({ sent: 2, failed: 1, suppressed: 3, hours: 24 });

    const week = deliverySchema.parse(
      await (await get('?hours=168')).json(),
    ).data;
    expect(week).toMatchObject({
      sent: 3,
      failed: 2,
      suppressed: 4,
      hours: 168,
    });

    const lastHours = deliverySchema.parse(
      await (await get('?hours=3')).json(),
    ).data;
    expect(lastHours).toMatchObject({ sent: 1, failed: 1, suppressed: 0 });
  });

  it('reports the newest sent row as lastSentAt, even outside the window', async () => {
    setAuth('admin');
    await logSend('sent', 80);
    const newestSent = await logSend('sent', 50);
    // Newer, but not sent, so it never counts as the last send.
    await logSend('failed', 1);
    await logSend('suppressed', 2);

    const data = deliverySchema.parse(await (await get()).json()).data;
    expect(data.sent).toBe(0);
    expect(data.lastSentAt).toBe(newestSent.toISOString());
  });

  it('rejects an out-of-range or non-integer hours with the house error shape', async () => {
    setAuth('admin');
    for (const hours of ['0', '169', '-1', '1.5', 'abc']) {
      const res = await get(`?hours=${hours}`);
      expect(res.status).toBe(400);
      const body = validationErrorSchema.parse(await res.json());
      expect(body.error.issues[0]?.path).toEqual(['hours']);
    }
  });

  it('accepts the bounds and writes no audit row', async () => {
    setAuth('admin');
    for (const hours of [1, 168]) {
      const res = await get(`?hours=${hours}`);
      expect(res.status).toBe(200);
      expect(deliverySchema.parse(await res.json()).data.hours).toBe(hours);
    }
    expect(await testDb.select().from(auditLog)).toHaveLength(0);
  });
});
