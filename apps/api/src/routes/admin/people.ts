// /v1/admin/people — the admin People list (redesign 5a). It reads Clerk, which
// owns identity, and adds what only our database knows: the handle and how many
// shows each person is Watching. There is no mirror table: the whole user list
// (about 200 people) is scanned from Clerk and cached for a few seconds, and
// search and the role counts run over that scan.
//
// Emails are masked in the list. Showing one is its own audited action
// (`user.email_shown`), as is signing someone out everywhere.

import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createClerkClient } from '@clerk/backend';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, userEvents, userProfiles } from '@concert-crawl/db';
import type { Role } from '@concert-crawl/types';
import { ROLE_HIERARCHY, isRole } from '@concert-crawl/types';
import { isClerkNotFound } from '../../lib/clerk-errors.js';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';

const secretKey = process.env['CLERK_SECRET_KEY'] ?? '';
const clerkClient = createClerkClient({ secretKey });

const SCAN_PAGE = 100;
// A hard stop for the scan, far above today's ~200 users. Past it the list
// says so (`truncated`) instead of silently missing people.
const SCAN_CAP = 5000;
const SCAN_TTL_MS = 30_000;
const SESSION_PAGE = 100;
const MAX_REVOKE_ROUNDS = 10;

interface ScannedUser {
  id: string;
  email: string;
  username: string | null;
  role: Role;
  createdAt: number | null;
  lastActiveAt: number | null;
}

interface Scan {
  users: ScannedUser[];
  truncated: boolean;
  at: number;
}

let cachedScan: Scan | null = null;
let scanInFlight: Promise<Scan> | null = null;
// Bumped by forgetPeopleScan, so a scan that started before a change never
// writes its stale result into the cache.
let scanGeneration = 0;

const fetchScan = async (): Promise<Scan> => {
  const users: ScannedUser[] = [];
  let totalCount = 0;
  for (let offset = 0; users.length < SCAN_CAP; offset += SCAN_PAGE) {
    const page = await clerkClient.users.getUserList({
      limit: SCAN_PAGE,
      offset,
      orderBy: '-created_at',
    });
    totalCount = page.totalCount;
    for (const user of page.data) {
      const rawRole = (user.publicMetadata as { role?: unknown }).role;
      users.push({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? '',
        username: user.username ?? null,
        role: isRole(rawRole) ? rawRole : 'user',
        createdAt: user.createdAt ?? null,
        lastActiveAt: user.lastActiveAt ?? null,
      });
    }
    if (page.data.length < SCAN_PAGE || users.length >= totalCount) break;
  }
  const truncated = users.length > SCAN_CAP || users.length < totalCount;
  return { users: users.slice(0, SCAN_CAP), truncated, at: Date.now() };
};

const scanClerkUsers = async (now: number): Promise<Scan> => {
  if (cachedScan !== null && now - cachedScan.at < SCAN_TTL_MS) {
    return cachedScan;
  }
  // Concurrent requests after the TTL share one scan instead of each paging
  // through all of Clerk.
  if (scanInFlight !== null) return scanInFlight;
  const generation = scanGeneration;
  const running = fetchScan()
    .then((scan) => {
      if (generation === scanGeneration) cachedScan = scan;
      return scan;
    })
    .finally(() => {
      scanInFlight = null;
    });
  scanInFlight = running;
  return running;
};

/** Drops the cached scan, so the next list sees a change made just now. */
export const forgetPeopleScan = (): void => {
  cachedScan = null;
  scanInFlight = null;
  scanGeneration += 1;
};

/** `h***@example.com`: enough to tell people apart, not to contact them. */
export const maskEmail = (email: string): string => {
  const at = email.lastIndexOf('@');
  if (at < 1) return email === '' ? '' : '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
};

const iso = (ms: number | null): string | null =>
  ms === null ? null : new Date(ms).toISOString();

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(['admin', 'sub_admin', 'promoter', 'beta', 'user']).optional(),
  sort: z.enum(['last-active', 'newest']).default('last-active'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const userIdParamSchema = z.object({ userId: z.string().min(1).max(255) });

const roleBodySchema = z.object({
  role: z.enum(['admin', 'promoter', 'beta', 'user']),
});

export const peopleAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/people — one page of people, newest activity first.
peopleAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { search, role, sort, limit, offset } = ctx.req.valid('query');
    const scan = await scanClerkUsers(Date.now());

    const profiles = await db
      .select({ userId: userProfiles.userId, handle: userProfiles.handle })
      .from(userProfiles);
    const handleOf = new Map(
      profiles.map((profile) => [profile.userId, profile.handle]),
    );

    const needle = (search ?? '').toLowerCase();
    const matches = (user: ScannedUser): boolean => {
      if (role !== undefined && user.role !== role) return false;
      if (needle === '') return true;
      // An email matches only as the whole address, so search cannot be used
      // to read a masked email out piece by piece without the audited Show
      // email action.
      if (user.email !== '' && user.email.toLowerCase() === needle) return true;
      return [handleOf.get(user.id) ?? '', user.username ?? '', user.id].some(
        (field) => field.toLowerCase().includes(needle),
      );
    };
    const filtered = scan.users.filter(matches);

    const byLastActive = (left: ScannedUser, right: ScannedUser): number =>
      (right.lastActiveAt ?? -1) - (left.lastActiveAt ?? -1) ||
      (right.createdAt ?? 0) - (left.createdAt ?? 0);
    const byNewest = (left: ScannedUser, right: ScannedUser): number =>
      (right.createdAt ?? 0) - (left.createdAt ?? 0);
    const page = [...filtered]
      .sort(sort === 'newest' ? byNewest : byLastActive)
      .slice(offset, offset + limit);

    // Watching: shows a person has marked Watching, for this page only.
    const watching = new Map<string, number>();
    if (page.length > 0) {
      const rows = await db
        .select({
          userId: userEvents.userId,
          value: sql<number>`count(*)::int`,
        })
        .from(userEvents)
        .where(
          and(
            eq(userEvents.status, 'watching'),
            inArray(
              userEvents.userId,
              page.map((user) => user.id),
            ),
          ),
        )
        .groupBy(userEvents.userId);
      for (const row of rows) watching.set(row.userId, row.value);
    }

    // Every role in the hierarchy, so a role with nobody in it reads 0.
    const counts: Record<string, number> = { total: scan.users.length };
    for (const known of ROLE_HIERARCHY) counts[known] = 0;
    for (const user of scan.users) {
      counts[user.role] = (counts[user.role] ?? 0) + 1;
    }

    return ctx.json({
      success: true,
      data: {
        people: page.map((user) => ({
          id: user.id,
          handle: handleOf.get(user.id) ?? user.username,
          emailMasked: maskEmail(user.email),
          role: user.role,
          createdAt: iso(user.createdAt),
          lastActiveAt: iso(user.lastActiveAt),
          watching: watching.get(user.id) ?? 0,
        })),
        total: filtered.length,
        counts,
        truncated: scan.truncated,
      },
    });
  },
);

// POST /v1/admin/people/:userId/show-email — the full email, audited. The list
// only ever carries a masked one.
peopleAdminRouter.post(
  '/:userId/show-email',
  zValidator('param', userIdParamSchema, validationHook),
  async (ctx) => {
    const { userId } = ctx.req.valid('param');
    let email: string;
    try {
      const user = await clerkClient.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress ?? '';
    } catch (err: unknown) {
      if (isClerkNotFound(err)) {
        return ctx.json({ success: false, error: 'Person not found' }, 404);
      }
      throw err;
    }

    ctx.set('auditAction', 'user.email_shown');
    ctx.set('auditTargetId', userId);
    ctx.set('auditActorId', getAuth(ctx)?.userId ?? 'unknown');
    return ctx.json({ success: true, data: { email } });
  },
);

// POST /v1/admin/people/:userId/sign-out-everywhere — revoke every active
// session of a person through Clerk. Not for yourself: it would end the very
// session making the request.
peopleAdminRouter.post(
  '/:userId/sign-out-everywhere',
  zValidator('param', userIdParamSchema, validationHook),
  async (ctx) => {
    const { userId } = ctx.req.valid('param');
    const actorId = getAuth(ctx)?.userId ?? 'unknown';
    if (actorId === userId) {
      return ctx.json(
        { success: false, error: 'Cannot sign yourself out everywhere' },
        400,
      );
    }

    // Clerk lists a page of sessions at a time, and a revoked session drops
    // out of the active list, so go on until none are left (bounded).
    let revoked = 0;
    try {
      for (let round = 0; round < MAX_REVOKE_ROUNDS; round += 1) {
        const sessions = await clerkClient.sessions.getSessionList({
          userId,
          status: 'active',
          limit: SESSION_PAGE,
        });
        if (sessions.data.length === 0) break;
        for (const session of sessions.data) {
          try {
            await clerkClient.sessions.revokeSession(session.id);
            revoked += 1;
          } catch (err: unknown) {
            // Expired or revoked since the list: already signed out.
            if (!isClerkNotFound(err)) throw err;
          }
        }
      }
    } catch (err: unknown) {
      if (isClerkNotFound(err)) {
        return ctx.json({ success: false, error: 'Person not found' }, 404);
      }
      throw err;
    }

    ctx.set('auditAction', 'user.sessions_revoked');
    ctx.set('auditTargetId', userId);
    ctx.set('auditActorId', actorId);
    ctx.set('auditMeta', { revoked });
    return ctx.json({ success: true, data: { revoked } });
  },
);

// PATCH /v1/admin/people/:userId/role — change a role. The response carries the
// previous one, so the caller can offer Undo by sending it back.
peopleAdminRouter.patch(
  '/:userId/role',
  zValidator('param', userIdParamSchema, validationHook),
  zValidator('json', roleBodySchema, validationHook),
  async (ctx) => {
    const { userId } = ctx.req.valid('param');
    const { role } = ctx.req.valid('json');
    const actorId = getAuth(ctx)?.userId ?? 'unknown';

    let previousRole: Role;
    try {
      const target = await clerkClient.users.getUser(userId);
      const rawRole = (target.publicMetadata as { role?: unknown }).role;
      previousRole = isRole(rawRole) ? rawRole : 'user';
    } catch (err: unknown) {
      if (isClerkNotFound(err)) {
        return ctx.json({ success: false, error: 'Person not found' }, 404);
      }
      throw err;
    }

    // sub_admin is not assignable here (as in the old users route), so a
    // change away from it could never be undone; leave those accounts alone.
    if (previousRole === 'sub_admin') {
      return ctx.json(
        { success: false, error: 'A sub_admin role is not changed here' },
        403,
      );
    }

    // Never demote your own admin account: it could leave nobody able to undo.
    if (
      actorId === userId &&
      previousRole === 'admin' &&
      ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf('admin')
    ) {
      return ctx.json(
        { success: false, error: 'Cannot demote your own admin account' },
        403,
      );
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
    forgetPeopleScan();

    ctx.set('auditAction', 'user.role.update');
    ctx.set('auditTargetId', userId);
    ctx.set('auditActorId', actorId);
    ctx.set('auditMeta', { role, previousRole });
    return ctx.json({ success: true, data: { role, previousRole } });
  },
);
