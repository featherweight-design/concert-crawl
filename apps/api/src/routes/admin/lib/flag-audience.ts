// What the admin Feature flags page draws about people: a named person's
// handle, role and test mark, the handle of whoever verified, and how many
// people a flag reaches at Beta. Handles and the test mark live in our own
// `user_profiles`; the role lives only in Clerk, so it is read from there and
// a failed read leaves it null rather than failing the page.

import { createClerkClient } from '@clerk/backend';
import { db, userProfiles } from '@concert-crawl/db';
import { isRole } from '@concert-crawl/types';
import { inArray } from 'drizzle-orm';

const clerkClient = createClerkClient({
  secretKey: process.env['CLERK_SECRET_KEY'] ?? '',
});

export interface Identity {
  handle: string | null;
  isTest: boolean;
}

/** Handle and test mark for each id; an id with no profile row is absent. */
export const identitiesOf = async (
  userIds: readonly string[],
): Promise<Map<string, Identity>> => {
  const ids = [...new Set(userIds)];
  const found = new Map<string, Identity>();
  if (ids.length === 0) return found;
  const rows = await db
    .select({
      userId: userProfiles.userId,
      handle: userProfiles.handle,
      isTest: userProfiles.isTestAccount,
    })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, ids));
  for (const row of rows) {
    found.set(row.userId, {
      handle: row.handle === '' ? null : row.handle,
      isTest: row.isTest,
    });
  }
  return found;
};

const PAGE = 500;
const ROLE_TTL_MS = 60_000;

let betaRoleCache: { ids: ReadonlySet<string>; at: number } | null = null;

/** Drops the memoized Beta-role list (tests, and after a role change). */
export const clearBetaRoleCache = (): void => {
  betaRoleCache = null;
};

/**
 * Every Clerk user whose role is Beta. Clerk cannot filter on a metadata
 * field, so this pages the whole user list; it is memoized for a minute and
 * returns null when Clerk cannot be read.
 */
export const betaRoleIds = async (): Promise<ReadonlySet<string> | null> => {
  const now = Date.now();
  if (betaRoleCache !== null && now - betaRoleCache.at < ROLE_TTL_MS) {
    return betaRoleCache.ids;
  }
  try {
    const ids = new Set<string>();
    for (let offset = 0; ; offset += PAGE) {
      const page = await clerkClient.users.getUserList({
        limit: PAGE,
        offset,
      });
      for (const user of page.data) {
        const role = (user.publicMetadata as { role?: unknown }).role;
        if (role === 'beta') ids.add(user.id);
      }
      if (page.data.length < PAGE) break;
    }
    betaRoleCache = { ids, at: now };
    return ids;
  } catch (err) {
    console.error('[admin] could not read Clerk roles for the flags page', err);
    return betaRoleCache?.ids ?? null;
  }
};

/** The Clerk role of each id (default 'user'); empty when Clerk cannot be read. */
export const rolesOf = async (
  userIds: readonly string[],
): Promise<Map<string, string>> => {
  const ids = [...new Set(userIds)];
  const roles = new Map<string, string>();
  if (ids.length === 0) return roles;
  try {
    const result = await clerkClient.users.getUserList({
      userId: ids,
      limit: Math.min(ids.length, 100),
    });
    for (const user of result.data) {
      const role = (user.publicMetadata as { role?: unknown }).role;
      roles.set(user.id, isRole(role) ? role : 'user');
    }
  } catch (err) {
    console.error('[admin] could not read Clerk roles for named people', err);
  }
  return roles;
};
