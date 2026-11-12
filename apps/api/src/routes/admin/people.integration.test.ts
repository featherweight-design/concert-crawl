import { describe, it, expect, beforeEach, vi } from 'vitest';

interface FakeClerkUser {
  id: string;
  username: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  publicMetadata: { role?: string };
  createdAt: number;
  lastActiveAt: number | null;
}

const { authState, clerk } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
  clerk: {
    users: [] as FakeClerkUser[],
    sessions: [] as Array<{ id: string; userId: string }>,
    revoked: [] as string[],
    updates: [] as Array<{ id: string; role: string }>,
    listCalls: 0,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUserList: vi.fn(async (params: { limit: number; offset: number }) => {
        clerk.listCalls += 1;
        return {
          data: clerk.users.slice(params.offset, params.offset + params.limit),
          totalCount: clerk.users.length,
        };
      }),
      getUser: vi.fn(async (id: string) => {
        const user = clerk.users.find((candidate) => candidate.id === id);
        if (!user) throw Object.assign(new Error('not found'), { status: 404 });
        return user;
      }),
      updateUserMetadata: vi.fn(
        async (id: string, input: { publicMetadata: { role: string } }) => {
          clerk.updates.push({ id, role: input.publicMetadata.role });
          const user = clerk.users.find((candidate) => candidate.id === id);
          if (user) user.publicMetadata = { role: input.publicMetadata.role };
        },
      ),
    },
    sessions: {
      getSessionList: vi.fn(
        async (params: { userId: string; limit?: number }) => ({
          data: clerk.sessions
            .filter(
              (session) =>
                session.userId === params.userId &&
                !clerk.revoked.includes(session.id),
            )
            .slice(0, params.limit ?? 10),
        }),
      ),
      revokeSession: vi.fn(async (id: string) => {
        clerk.revoked.push(id);
      }),
    },
  }),
}));

import { eq } from 'drizzle-orm';
import { auditLog } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import {
  clearTables,
  seedEvent,
  seedUserEvent,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { forgetPeopleScan, maskEmail } from './people.js';

const app = createApp();

const setAuth = (role: 'admin' | 'user', userId = 'user_admin'): void => {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
};

const person = (
  id: string,
  over: Partial<FakeClerkUser> = {},
): FakeClerkUser => ({
  id,
  username: null,
  emailAddresses: [{ emailAddress: `${id}@example.com` }],
  publicMetadata: {},
  createdAt: Date.parse('2026-10-01T00:00:00Z'),
  lastActiveAt: null,
  ...over,
});

const get = (path: string) => app.request(`/v1/admin/people${path}`);
const post = (path: string, body?: unknown) =>
  app.request(`/v1/admin/people${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const patch = (path: string, body: unknown) =>
  app.request(`/v1/admin/people${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

interface ListBody {
  data: {
    people: Array<{
      id: string;
      handle: string | null;
      emailMasked: string;
      role: string;
      lastActiveAt: string | null;
      watching: number;
    }>;
    total: number;
    counts: Record<string, number>;
    truncated: boolean;
  };
}

describe('admin people', () => {
  beforeEach(async () => {
    authState.current = null;
    clerk.users = [];
    clerk.sessions = [];
    clerk.revoked = [];
    clerk.updates = [];
    clerk.listCalls = 0;
    forgetPeopleScan();
    await clearTables();
  });

  it('is admin only', async () => {
    setAuth('user');
    expect((await get('')).status).toBe(403);
    expect((await post('/user_a/show-email')).status).toBe(403);
  });

  it('lists people newest activity first with a masked email, a handle and Watching', async () => {
    setAuth('admin');
    clerk.users = [
      person('user_quiet', { lastActiveAt: null }),
      person('user_recent', {
        lastActiveAt: Date.parse('2026-11-12T00:00:00Z'),
        publicMetadata: { role: 'beta' },
      }),
      person('user_older', {
        lastActiveAt: Date.parse('2026-11-01T00:00:00Z'),
      }),
    ];
    await seedUserProfile('user_recent', { handle: 'recent_fan' });
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const e1 = await seedEvent(venue.id, { artist: 'A', date: '2099-01-01' });
    const e2 = await seedEvent(venue.id, { artist: 'B', date: '2099-01-02' });
    await seedUserEvent('user_recent', e1.id, { status: 'watching' });
    await seedUserEvent('user_recent', e2.id, { status: 'going' });

    const res = await get('');
    expect(res.status).toBe(200);
    const body: ListBody = await res.json();
    expect(body.data.people.map((row) => row.id)).toEqual([
      'user_recent',
      'user_older',
      'user_quiet',
    ]);
    const [first] = body.data.people;
    expect(first).toMatchObject({
      handle: 'recent_fan',
      emailMasked: 'u***@example.com',
      role: 'beta',
      watching: 1,
    });
    expect(JSON.stringify(body)).not.toContain('user_recent@example.com');
    expect(body.data.total).toBe(3);
    expect(body.data.counts).toMatchObject({
      total: 3,
      beta: 1,
      user: 2,
      admin: 0,
      sub_admin: 0,
    });
    expect(body.data.truncated).toBe(false);
  });

  it('searches handle, email and id over the whole scan, and filters by role', async () => {
    setAuth('admin');
    clerk.users = [
      person('user_a', { publicMetadata: { role: 'admin' } }),
      person('user_b'),
      person('user_c', { username: 'zed' }),
    ];
    await seedUserProfile('user_b', { handle: 'findme' });

    const byHandle: ListBody = await (await get('?search=FINDME')).json();
    expect(byHandle.data.people.map((row) => row.id)).toEqual(['user_b']);
    const byUsername: ListBody = await (await get('?search=zed')).json();
    expect(byUsername.data.people.map((row) => row.id)).toEqual(['user_c']);
    const byRole: ListBody = await (await get('?role=admin')).json();
    expect(byRole.data.people.map((row) => row.id)).toEqual(['user_a']);
    // The counts are over everyone, not the filtered page.
    expect(byRole.data.counts['total']).toBe(3);
    expect(byRole.data.total).toBe(1);
  });

  it('matches an email only as the whole address, never a fragment', async () => {
    setAuth('admin');
    clerk.users = [person('user_a'), person('user_b')];
    const fragment: ListBody = await (await get('?search=user_a%40')).json();
    expect(fragment.data.people).toEqual([]);
    const whole: ListBody = await (
      await get('?search=USER_A%40example.com')
    ).json();
    expect(whole.data.people.map((row) => row.id)).toEqual(['user_a']);
  });

  it('signs out a person with more sessions than one Clerk page', async () => {
    setAuth('admin');
    clerk.users = [person('user_a')];
    clerk.sessions = Array.from({ length: 25 }, (_, index) => ({
      id: `sess_${index}`,
      userId: 'user_a',
    }));
    const res = await post('/user_a/sign-out-everywhere');
    expect(await res.json()).toEqual({ success: true, data: { revoked: 25 } });
  });

  it('pages through the scan', async () => {
    setAuth('admin');
    clerk.users = Array.from({ length: 5 }, (_, index) =>
      person(`user_${index}`, { lastActiveAt: 1_000 + index }),
    );
    const page: ListBody = await (await get('?limit=2&offset=2')).json();
    expect(page.data.people.map((row) => row.id)).toEqual(['user_2', 'user_1']);
    expect(page.data.total).toBe(5);
  });

  it('caches the Clerk scan between requests', async () => {
    setAuth('admin');
    clerk.users = [person('user_a')];
    await get('');
    await get('');
    expect(clerk.listCalls).toBe(1);
  });

  it('shows the full email only through an audited action', async () => {
    setAuth('admin');
    clerk.users = [person('user_a')];
    const res = await post('/user_a/show-email');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { email: 'user_a@example.com' },
    });
    const [audit] = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'user.email_shown'));
    expect(audit).toMatchObject({
      actorId: 'user_admin',
      targetId: 'user_a',
    });
    expect((await post('/user_missing/show-email')).status).toBe(404);
  });

  it('signs a person out everywhere, audited, and refuses it for yourself', async () => {
    setAuth('admin');
    clerk.users = [person('user_a'), person('user_admin')];
    clerk.sessions = [
      { id: 'sess_1', userId: 'user_a' },
      { id: 'sess_2', userId: 'user_a' },
      { id: 'sess_3', userId: 'user_other' },
    ];

    const res = await post('/user_a/sign-out-everywhere');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { revoked: 2 } });
    expect(clerk.revoked).toEqual(['sess_1', 'sess_2']);
    const [audit] = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'user.sessions_revoked'));
    expect(audit).toMatchObject({
      actorId: 'user_admin',
      targetId: 'user_a',
      metadata: { revoked: 2 },
    });

    expect((await post('/user_admin/sign-out-everywhere')).status).toBe(400);
    expect(clerk.revoked).toHaveLength(2);
  });

  it('changes a role and returns the previous one for Undo; undoing restores it', async () => {
    setAuth('admin');
    clerk.users = [person('user_a', { publicMetadata: { role: 'beta' } })];

    const res = await patch('/user_a/role', { role: 'promoter' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      data: { role: 'promoter', previousRole: 'beta' },
    });
    const undone = await patch('/user_a/role', { role: 'beta' });
    expect(undone.status).toBe(200);
    expect(clerk.updates).toEqual([
      { id: 'user_a', role: 'promoter' },
      { id: 'user_a', role: 'beta' },
    ]);
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'user.role.update'));
    expect(audits.map((row) => row.metadata)).toEqual(
      expect.arrayContaining([
        { role: 'promoter', previousRole: 'beta' },
        { role: 'beta', previousRole: 'promoter' },
      ]),
    );
  });

  it('leaves a sub_admin alone, since that role could not be restored by Undo', async () => {
    setAuth('admin');
    clerk.users = [
      person('user_sub', { publicMetadata: { role: 'sub_admin' } }),
    ];
    expect((await patch('/user_sub/role', { role: 'user' })).status).toBe(403);
    expect(clerk.updates).toEqual([]);
  });

  it('refuses to demote your own admin account, and 404s an unknown person', async () => {
    setAuth('admin', 'user_admin');
    clerk.users = [person('user_admin', { publicMetadata: { role: 'admin' } })];
    expect((await patch('/user_admin/role', { role: 'user' })).status).toBe(
      403,
    );
    expect(clerk.updates).toEqual([]);
    expect((await patch('/user_missing/role', { role: 'user' })).status).toBe(
      404,
    );
  });
});

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('hugh@example.com')).toBe('h***@example.com');
  });
  it('hides an address with no usable local part', () => {
    expect(maskEmail('@example.com')).toBe('***');
    expect(maskEmail('nonsense')).toBe('***');
    expect(maskEmail('')).toBe('');
  });
});
