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

import { auditLog } from '@concert-crawl/db';
import type { AuditLogItem } from '@concert-crawl/types';
import { createApp } from '../../app.js';
import { clearTables, seedUserProfile } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

function setAuth(role: 'admin' | 'user'): void {
  authState.current = {
    userId: 'test-admin-1',
    sessionClaims: { metadata: { role } },
  };
}

interface ListBody {
  data: AuditLogItem[];
  nextCursor: string | null;
}

const list = async (
  query = '',
): Promise<{ status: number; body: ListBody }> => {
  const res = await app.request(`/v1/admin/audit-log${query}`);
  return { status: res.status, body: (await res.json()) as ListBody };
};

const at = (minutesAgo: number): Date =>
  new Date(Date.now() - minutesAgo * 60_000);

describe('GET /v1/admin/audit-log', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    expect((await list()).status).toBe(403);
  });

  it('filters by system and admin actors and returns handles, never Clerk ids', async () => {
    setAuth('admin');
    await seedUserProfile('user_clerk_abc123', { handle: 'huey' });
    await testDb.insert(auditLog).values([
      {
        actorId: 'system:crawler',
        action: 'venue.crawl_auto_paused',
        targetId: 'venue-1',
        createdAt: at(3),
      },
      {
        actorId: 'user_clerk_abc123',
        action: 'venue.update',
        targetId: 'venue-2',
        createdAt: at(2),
      },
      {
        actorId: 'user_clerk_nohandle',
        action: 'venue.update',
        targetId: 'venue-3',
        createdAt: at(1),
      },
    ]);

    const system = await list('?actor=system');
    expect(system.body.data.map((row) => row.actor)).toEqual([
      'system:crawler',
    ]);
    expect(system.body.data[0]?.actorKind).toBe('system');

    const admin = await list('?actor=admin');
    expect(admin.body.data.map((row) => row.actor)).toEqual([
      'an admin',
      'huey',
    ]);
    expect(JSON.stringify(admin.body)).not.toContain('user_clerk');

    expect((await list()).body.data).toHaveLength(3);
  });

  it('honours since', async () => {
    setAuth('admin');
    await testDb.insert(auditLog).values([
      { actorId: 'system:crawler', action: 'old', createdAt: at(120) },
      { actorId: 'system:crawler', action: 'new', createdAt: at(10) },
    ]);

    const since = encodeURIComponent(at(60).toISOString());
    const { body } = await list(`?since=${since}`);
    expect(body.data.map((row) => row.action)).toEqual(['new']);
  });

  it('pages newest first with a cursor, including rows that share a timestamp', async () => {
    setAuth('admin');
    const same = at(5);
    await testDb.insert(auditLog).values([
      { actorId: 'system:crawler', action: 'a1', createdAt: at(30) },
      { actorId: 'system:crawler', action: 'a2', createdAt: same },
      { actorId: 'system:crawler', action: 'a3', createdAt: same },
      { actorId: 'system:crawler', action: 'a4', createdAt: same },
      { actorId: 'system:crawler', action: 'a5', createdAt: at(1) },
    ]);

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const query: string =
        cursor === null ? '?limit=2' : `?limit=2&cursor=${cursor}`;
      const { body } = await list(query);
      seen.push(...body.data.map((row) => row.action));
      cursor = body.nextCursor;
      if (cursor === null) break;
    }

    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    expect(seen[0]).toBe('a5');
    expect(seen.at(-1)).toBe('a1');
  });

  it('rejects a malformed cursor and an over-large limit', async () => {
    setAuth('admin');
    expect((await list('?cursor=not-a-cursor')).status).toBe(400);
    expect((await list('?limit=101')).status).toBe(400);
    expect((await list('?actor=robot')).status).toBe(400);
  });
});
