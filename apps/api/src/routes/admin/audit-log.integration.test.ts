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

import { auditLog, events, inviteCodes, venues } from '@concert-crawl/db';
import type { AuditLogItem } from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { createApp } from '../../app.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedEventReport,
  seedPriceSubmission,
  seedUserProfile,
  seedVenue,
} from '../../test/helpers/seed.js';
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

  it('filters to one admin by handle, ignoring a leading @', async () => {
    setAuth('admin');
    await seedUserProfile('user_clerk_hugh', { handle: 'hugh' });
    await seedUserProfile('user_clerk_jules', { handle: 'jules' });
    await testDb.insert(auditLog).values([
      { actorId: 'user_clerk_hugh', action: 'venue.update', createdAt: at(3) },
      { actorId: 'user_clerk_jules', action: 'venue.update', createdAt: at(2) },
      { actorId: 'system:crawler', action: 'venue.update', createdAt: at(1) },
    ]);

    const bare = await list('?actorHandle=hugh');
    expect(bare.body.data.map((row) => row.actor)).toEqual(['hugh']);

    const prefixed = await list(
      `?actorHandle=${encodeURIComponent(' @jules ')}`,
    );
    expect(prefixed.body.data.map((row) => row.actor)).toEqual(['jules']);
  });

  it('returns an empty list for an unknown handle, and 400 for an empty one', async () => {
    setAuth('admin');
    await seedUserProfile('user_clerk_hugh', { handle: 'hugh' });
    await testDb
      .insert(auditLog)
      .values([
        {
          actorId: 'user_clerk_hugh',
          action: 'venue.update',
          createdAt: at(1),
        },
      ]);

    const unknown = await list('?actorHandle=nobody');
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toEqual([]);
    expect(unknown.body.nextCursor).toBeNull();

    expect((await list('?actorHandle=%40')).status).toBe(400);
    expect((await list(`?actorHandle=${'a'.repeat(101)}`)).status).toBe(400);
  });

  it('filters by one or many areas, comma-separated or repeated, and returns each row area', async () => {
    setAuth('admin');
    await testDb.insert(auditLog).values([
      { actorId: 'system:crawler', action: 'venue.update', createdAt: at(9) },
      {
        actorId: 'system:crawler',
        action: 'invite_code.revoke',
        createdAt: at(8),
      },
      {
        actorId: 'system:crawler',
        action: 'user.email_shown',
        createdAt: at(7),
      },
      {
        actorId: 'system:crawler',
        action: 'feature_flag.toggle',
        createdAt: at(6),
      },
      {
        actorId: 'system:crawler',
        action: 'contest.resolve',
        createdAt: at(5),
      },
      { actorId: 'system:crawler', action: 'price.promoted', createdAt: at(4) },
      {
        actorId: 'system:crawler',
        action: 'settings.update',
        createdAt: at(3),
      },
      // The prefix is matched whole, so a near miss belongs to no area.
      {
        actorId: 'system:crawler',
        action: 'userXemail.shown',
        createdAt: at(2),
      },
      { actorId: 'system:crawler', action: 'mystery', createdAt: at(1) },
    ]);

    const people = await list('?area=people');
    expect(people.body.data.map((row) => row.action)).toEqual([
      'user.email_shown',
      'invite_code.revoke',
    ]);
    expect(people.body.data.every((row) => row.area === 'people')).toBe(true);

    const comma = await list('?area=prices,feature-flags');
    expect(comma.body.data.map((row) => row.action)).toEqual([
      'price.promoted',
      'contest.resolve',
      'feature_flag.toggle',
    ]);

    const repeated = await list('?area=health&area=venues');
    expect(repeated.body.data.map((row) => row.action)).toEqual([
      'settings.update',
      'venue.update',
    ]);

    const all = await list();
    const areaOf = new Map(all.body.data.map((row) => [row.action, row.area]));
    expect(areaOf.get('venue.update')).toBe('venues');
    expect(areaOf.get('settings.update')).toBe('health');
    expect(areaOf.get('mystery')).toBeNull();
    expect(areaOf.get('userXemail.shown')).toBeNull();
  });

  it('rejects an unknown or empty area with 400', async () => {
    setAuth('admin');
    expect((await list('?area=billing')).status).toBe(400);
    expect((await list('?area=people,billing')).status).toBe(400);
    expect((await list('?area=')).status).toBe(400);
    expect((await list('?area=People')).status).toBe(400);
  });

  it('honours until as an exclusive upper bound, and since plus until as a window', async () => {
    setAuth('admin');
    const edge = at(60);
    await testDb.insert(auditLog).values([
      { actorId: 'system:crawler', action: 'before', createdAt: at(180) },
      { actorId: 'system:crawler', action: 'inside', createdAt: at(90) },
      { actorId: 'system:crawler', action: 'edge', createdAt: edge },
      { actorId: 'system:crawler', action: 'after', createdAt: at(10) },
    ]);

    const until = encodeURIComponent(edge.toISOString());
    const upTo = await list(`?until=${until}`);
    expect(upTo.body.data.map((row) => row.action)).toEqual([
      'inside',
      'before',
    ]);

    const since = encodeURIComponent(at(120).toISOString());
    const window = await list(`?since=${since}&until=${until}`);
    expect(window.body.data.map((row) => row.action)).toEqual(['inside']);

    expect((await list('?until=yesterday')).status).toBe(400);
  });

  it('combines filters and keeps paging with a cursor under them', async () => {
    setAuth('admin');
    await seedUserProfile('user_clerk_hugh', { handle: 'hugh' });
    await seedUserProfile('user_clerk_jules', { handle: 'jules' });
    const rows: (typeof auditLog.$inferInsert)[] = [];
    for (let i = 0; i < 5; i++) {
      rows.push({
        actorId: 'user_clerk_hugh',
        action: 'venue.update',
        metadata: { n: i },
        createdAt: at(50 - i),
      });
      rows.push({
        actorId: 'user_clerk_hugh',
        action: 'user.email_shown',
        createdAt: at(50 - i),
      });
      rows.push({
        actorId: 'user_clerk_jules',
        action: 'venue.update',
        createdAt: at(50 - i),
      });
    }
    // Outside the window.
    rows.push({
      actorId: 'user_clerk_hugh',
      action: 'venue.update',
      metadata: { n: 99 },
      createdAt: at(500),
    });
    await testDb.insert(auditLog).values(rows);

    const since = encodeURIComponent(at(60).toISOString());
    const until = encodeURIComponent(at(0).toISOString());
    const base = `?actorHandle=hugh&area=venues&since=${since}&until=${until}&limit=2`;

    const seen: unknown[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const { body, status } = await list(
        cursor === null ? base : `${base}&cursor=${cursor}`,
      );
      expect(status).toBe(200);
      for (const row of body.data) {
        expect(row.actor).toBe('hugh');
        expect(row.area).toBe('venues');
        seen.push(row.metadata?.['n']);
      }
      cursor = body.nextCursor;
      if (cursor === null) break;
    }

    expect(seen).toEqual([4, 3, 2, 1, 0]);
  });

  it('resolves each target kind to a name and an admin link, without an N+1', async () => {
    setAuth('admin');
    await seedUserProfile('user_clerk_mira', { handle: 'mira.k' });
    const venue = await seedVenue({ name: 'Levitt Pavilion' });
    const event = await seedEvent(venue.id, {
      artist: 'Vince Staples',
      title: 'Vince Staples',
    });
    const artist = await seedArtist({ name: 'Cashmere' });
    const submission = await seedPriceSubmission(event.id, 'user_clerk_mira');
    const report = await seedEventReport(event.id, 'user_clerk_mira');
    const [code] = await testDb
      .insert(inviteCodes)
      .values({ code: 'SHARED1', createdBy: 'test-admin-1', maxUses: 5 })
      .returning();
    if (!code) throw new Error('invite code insert returned no rows');

    await testDb.insert(auditLog).values([
      {
        actorId: 'system:crawler',
        action: 'venue.crawl_pause',
        targetId: venue.id,
        createdAt: at(13),
      },
      {
        actorId: 'system:crawler',
        action: 'event.update',
        targetId: event.id,
        createdAt: at(12),
      },
      {
        actorId: 'system:crawler',
        action: 'event.report.resolve',
        targetId: report.id,
        createdAt: at(11),
      },
      {
        actorId: 'system:crawler',
        action: 'artist.match.update',
        targetId: artist.id,
        createdAt: at(10),
      },
      {
        actorId: 'system:crawler',
        action: 'user.email_shown',
        targetId: 'user_clerk_mira',
        createdAt: at(9),
      },
      {
        actorId: 'system:crawler',
        action: 'invite_code.revoke',
        targetId: code.id,
        createdAt: at(8),
      },
      {
        actorId: 'system:crawler',
        action: 'feature_flag.toggle',
        targetId: 'feature_flag:crews',
        createdAt: at(7),
      },
      {
        actorId: 'system:crawler',
        action: 'price.submission.update',
        targetId: submission.id,
        createdAt: at(6),
      },
      {
        actorId: 'system:crawler',
        action: 'contest.resolve',
        targetId: submission.id,
        createdAt: at(5),
      },
      {
        actorId: 'system:crawler',
        action: 'price.submission.admin_add',
        targetId: event.id,
        createdAt: at(4),
      },
      {
        actorId: 'system:crawler',
        action: 'crawl.trigger',
        targetId: venue.id,
        createdAt: at(3),
      },
      {
        actorId: 'system:crawler',
        action: 'needs_you.snooze',
        targetId: 'venue-failing:x',
        createdAt: at(2),
      },
      {
        actorId: 'system:crawler',
        action: 'notification.test_email',
        createdAt: at(1),
      },
    ]);

    const { body } = await list();
    const byAction = new Map(body.data.map((row) => [row.action, row.target]));

    expect(byAction.get('venue.crawl_pause')).toEqual({
      kind: 'venue',
      name: 'Levitt Pavilion',
      href: `/admin/venues/${venue.id}`,
    });
    expect(byAction.get('crawl.trigger')).toEqual({
      kind: 'venue',
      name: 'Levitt Pavilion',
      href: `/admin/venues/${venue.id}`,
    });
    expect(byAction.get('event.update')).toEqual({
      kind: 'event',
      name: 'Vince Staples',
      href: `/admin/events/${event.id}/edit`,
    });
    expect(byAction.get('event.report.resolve')).toEqual({
      kind: 'event',
      name: 'Vince Staples',
      href: `/admin/events/${event.id}/edit`,
    });
    expect(byAction.get('artist.match.update')).toEqual({
      kind: 'artist',
      name: 'Cashmere',
      href: '/admin/artists',
    });
    expect(byAction.get('user.email_shown')).toEqual({
      kind: 'person',
      name: '@mira.k',
      href: '/admin/people/user_clerk_mira',
    });
    expect(byAction.get('invite_code.revoke')).toEqual({
      kind: 'invite-code',
      name: 'SHARED1',
      href: '/admin/people/invite-codes',
    });
    expect(byAction.get('feature_flag.toggle')).toEqual({
      kind: 'feature-flag',
      name: 'Crews',
      href: '/admin/feature-flags',
    });
    expect(byAction.get('price.submission.update')).toEqual({
      kind: 'price',
      name: 'Vince Staples',
      href: '/admin/prices?tab=submitted',
    });
    expect(byAction.get('contest.resolve')).toEqual({
      kind: 'price',
      name: 'Vince Staples',
      href: '/admin/prices?tab=checks',
    });
    expect(byAction.get('price.submission.admin_add')).toEqual({
      kind: 'price',
      name: 'Vince Staples',
      href: '/admin/prices',
    });
    expect(byAction.get('needs_you.snooze')).toBeNull();
    expect(byAction.get('notification.test_email')).toBeNull();
  });

  it('keeps the kind and nulls the name and link when the target is gone', async () => {
    setAuth('admin');
    const venue = await seedVenue({ name: 'Gone Hall' });
    const event = await seedEvent(venue.id, { title: 'Gone Show' });
    await testDb.delete(events).where(eq(events.id, event.id));
    await testDb.delete(venues).where(eq(venues.id, venue.id));

    await testDb.insert(auditLog).values([
      {
        actorId: 'system:crawler',
        action: 'venue.delete',
        targetId: venue.id,
        createdAt: at(6),
      },
      {
        actorId: 'system:crawler',
        action: 'event.delete',
        targetId: event.id,
        createdAt: at(5),
      },
      {
        actorId: 'system:crawler',
        action: 'user.role.update',
        targetId: 'user_clerk_gone',
        createdAt: at(4),
      },
      {
        actorId: 'system:crawler',
        action: 'feature_flag.toggle',
        targetId: 'feature_flag:retired-flag',
        createdAt: at(3),
      },
      // A non-uuid id on a uuid kind is unresolvable, not an error.
      {
        actorId: 'system:crawler',
        action: 'venue.update',
        targetId: 'venue-1',
        createdAt: at(2),
      },
      {
        actorId: 'system:crawler',
        action: 'price.submission.reject',
        targetId: event.id,
        createdAt: at(1),
      },
    ]);

    const { body, status } = await list();
    expect(status).toBe(200);
    const byAction = new Map(body.data.map((row) => [row.action, row.target]));
    expect(byAction.get('venue.delete')).toEqual({
      kind: 'venue',
      name: null,
      href: null,
    });
    expect(byAction.get('event.delete')).toEqual({
      kind: 'event',
      name: null,
      href: null,
    });
    expect(byAction.get('user.role.update')).toEqual({
      kind: 'person',
      name: null,
      href: null,
    });
    expect(byAction.get('feature_flag.toggle')).toEqual({
      kind: 'feature-flag',
      name: null,
      href: null,
    });
    expect(byAction.get('venue.update')).toEqual({
      kind: 'venue',
      name: null,
      href: null,
    });
    expect(byAction.get('price.submission.reject')).toEqual({
      kind: 'price',
      name: null,
      href: null,
    });
  });
});
