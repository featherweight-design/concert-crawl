import { describe, it, expect, beforeEach, vi } from 'vitest';

// The Activity log's day picker dots and Anyone menu (addendum 6 #37).

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState, staff } = vi.hoisted(() => ({
  authState: { current: null as TestAuth | null },
  staff: { ids: [] as string[], fail: false },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

// Staff comes from People's Clerk scan; the scan itself is People's to test.
vi.mock('./people.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./people.js')>()),
  staffUserIds: async () => {
    if (staff.fail) throw new Error('clerk down');
    return staff.ids;
  },
}));

import { auditLog } from '@concert-crawl/db';
import type { AuditLogActor, AuditLogItem } from '@concert-crawl/types';
import { createApp } from '../../app.js';
import { clearTables, seedUserProfile } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();
const ME = 'test-admin-1';

const setAuth = (role: 'admin' | 'user'): void => {
  authState.current = { userId: ME, sessionClaims: { metadata: { role } } };
};

/** An instant on a Mountain Time calendar day, at local `hour`. */
const mt = (day: string, hour: number): Date => {
  // From Nov 1 (2026) Denver is on MST, UTC-7.
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, hour + 7));
};

const seedRow = (actorId: string, createdAt: Date, action = 'venue.update') =>
  testDb.insert(auditLog).values({ actorId, action, createdAt });

const get = async <T>(path: string): Promise<{ status: number; data: T }> => {
  const res = await app.request(`/v1/admin/audit-log${path}`);
  const body = (await res.json()) as { data: T };
  return { status: res.status, data: body.data };
};

describe('GET /v1/admin/audit-log/days', () => {
  beforeEach(async () => {
    authState.current = null;
    staff.ids = [];
    staff.fail = false;
    await clearTables();
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    expect((await get('/days?month=2026-11')).status).toBe(403);
  });

  it('rejects a malformed month', async () => {
    setAuth('admin');
    expect((await get('/days?month=2026-13')).status).toBe(400);
    expect((await get('/days')).status).toBe(400);
  });

  it('lists each MT day of the month with a change, once, in order', async () => {
    setAuth('admin');
    await seedRow(ME, mt('2026-11-10', 9));
    await seedRow(ME, mt('2026-11-10', 15));
    await seedRow(ME, mt('2026-11-03', 12));
    // 10 PM on Nov 30 in Denver is Dec 1 in UTC: still November here.
    await seedRow(ME, mt('2026-11-30', 22));
    // 11 PM on Oct 31 in Denver is Nov 1 in UTC (MDT): not November.
    await testDb.insert(auditLog).values({
      actorId: ME,
      action: 'venue.update',
      createdAt: new Date('2026-11-01T05:00:00Z'),
    });
    await seedRow(ME, mt('2026-12-01', 9));

    const { status, data } = await get<string[]>('/days?month=2026-11');
    expect(status).toBe(200);
    expect(data).toEqual(['2026-11-03', '2026-11-10', '2026-11-30']);
  });

  it('applies the log filters, so a dot never leads to an empty day', async () => {
    setAuth('admin');
    await seedUserProfile(ME, { handle: 'huey' });
    await seedUserProfile('other', { handle: 'sam' });
    await seedRow(ME, mt('2026-11-04', 9), 'venue.update');
    await seedRow('other', mt('2026-11-05', 9), 'venue.update');
    await seedRow(ME, mt('2026-11-06', 9), 'price.promoted');

    expect(
      (await get<string[]>('/days?month=2026-11&actorHandle=huey')).data,
    ).toEqual(['2026-11-04', '2026-11-06']);
    expect(
      (await get<string[]>('/days?month=2026-11&area=prices')).data,
    ).toEqual(['2026-11-06']);
  });
});

describe('GET /v1/admin/audit-log/actors', () => {
  beforeEach(async () => {
    authState.current = null;
    staff.ids = [];
    staff.fail = false;
    await clearTables();
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    expect((await get('/actors')).status).toBe(403);
  });

  it('lists staff and that day’s actors with counts, you first', async () => {
    setAuth('admin');
    await seedUserProfile(ME, { handle: 'huey', avatarColor: 'pulse' });
    await seedUserProfile('sub-1', { handle: 'sam' });
    await seedUserProfile('sub-2', { handle: 'alex' });
    await seedUserProfile('former', { handle: 'zed' });
    await seedUserProfile('no-handle');
    staff.ids = [ME, 'sub-1', 'sub-2', 'no-handle'];

    await seedRow('sub-1', mt('2026-11-10', 9));
    await seedRow('sub-1', mt('2026-11-10', 10));
    await seedRow('former', mt('2026-11-10', 11));
    await seedRow(ME, mt('2026-11-09', 11)); // another day
    await seedRow('system:crawler', mt('2026-11-10', 3));

    const { status, data } = await get<AuditLogActor[]>(
      '/actors?day=2026-11-10',
    );
    expect(status).toBe(200);
    expect(data).toEqual([
      {
        handle: 'huey',
        avatarColor: 'pulse',
        avatarSecondColor: null,
        count: 0,
        you: true,
      },
      expect.objectContaining({ handle: 'sam', count: 2, you: false }),
      expect.objectContaining({ handle: 'zed', count: 1 }),
      expect.objectContaining({ handle: 'alex', count: 0 }),
    ]);
  });

  it('still lists that day’s actors when the staff scan fails', async () => {
    setAuth('admin');
    staff.fail = true;
    await seedUserProfile('sub-1', { handle: 'sam' });
    await seedRow('sub-1', mt('2026-11-10', 9));

    const { status, data } = await get<AuditLogActor[]>(
      '/actors?day=2026-11-10',
    );
    expect(status).toBe(200);
    expect(data.map((row) => row.handle)).toEqual(['sam']);
  });

  it('rejects a malformed day', async () => {
    setAuth('admin');
    expect((await get('/actors?day=2026-11-31')).status).toBe(400);
  });
});

describe('GET /v1/admin/audit-log rows', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('carries the admin actor’s avatar colours, and none for system', async () => {
    setAuth('admin');
    await seedUserProfile(ME, {
      handle: 'huey',
      avatarColor: 'pulse',
      avatarSecondColor: 'drip',
    });
    await seedRow(ME, new Date(Date.now() - 60_000));
    await seedRow('system:crawler', new Date());

    const { data } = await get<AuditLogItem[]>('');
    expect(data.map((row) => row.actorAvatar)).toEqual([
      null,
      { avatarColor: 'pulse', avatarSecondColor: 'drip' },
    ]);
  });
});
