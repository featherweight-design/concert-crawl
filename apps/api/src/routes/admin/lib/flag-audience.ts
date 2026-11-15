// What the admin Feature flags page draws about people: a named person's
// handle, role and test mark, the handle of whoever verified, and how many
// people a flag reaches at Beta. Handles and the test mark live in our own
// `user_profiles`; the role lives only in Clerk, so it is read from there and
// a failed read leaves it null rather than failing the page.

import { createClerkClient } from '@clerk/backend';
import { db, userProfiles } from '@concert-crawl/db';
import { isRole } from '@concert-crawl/types';
import { eq, inArray } from 'drizzle-orm';

const clerkClient = createClerkClient({
  secretKey: process.env['CLERK_SECRET_KEY'] ?? '',
});

export interface Identity {
  handle: string | null;
  isTest: boolean;
}

/** Plain code-unit order, the same in every runtime (not a locale compare). */
export const byUserId = (
  left: { userId: string },
  right: { userId: string },
): number =>
  left.userId < right.userId ? -1 : left.userId > right.userId ? 1 : 0;

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

/**
 * Every test account that has a profile. The Beta count leaves these out; they
 * are few, so this is one small query instead of a lookup for every Beta id.
 * An account with no profile row cannot be marked as a test account.
 */
export const testAccountIds = async (): Promise<ReadonlySet<string>> => {
  const rows = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.isTestAccount, true));
  return new Set(rows.map((row) => row.userId));
};

/** The role on a Clerk user's public metadata, or undefined when not set. */
const metadataRole = (metadata: unknown): unknown =>
  typeof metadata === 'object' && metadata !== null && 'role' in metadata
    ? metadata.role
    : undefined;

const PAGE = 500;
const ROLE_TTL_MS = 60_000;
const FAILURE_BACKOFF_MS = 15_000;

let betaRoleCache: { ids: ReadonlySet<string>; at: number } | null = null;
let betaRoleInFlight: Promise<ReadonlySet<string> | null> | null = null;
let betaRoleFailedAt = 0;

/** Drops the memoized Beta-role list (tests, and after a role change). */
export const clearBetaRoleCache = (): void => {
  betaRoleCache = null;
  betaRoleInFlight = null;
  betaRoleFailedAt = 0;
};

const scanBetaRoles = async (): Promise<ReadonlySet<string> | null> => {
  try {
    const ids = new Set<string>();
    for (let offset = 0; ; offset += PAGE) {
      const page = await clerkClient.users.getUserList({
        limit: PAGE,
        offset,
      });
      for (const user of page.data) {
        if (metadataRole(user.publicMetadata) === 'beta') ids.add(user.id);
      }
      if (page.data.length < PAGE) break;
    }
    betaRoleCache = { ids, at: Date.now() };
    return ids;
  } catch (err) {
    console.error('[admin] could not read Clerk roles for the flags page', err);
    betaRoleFailedAt = Date.now();
    return betaRoleCache?.ids ?? null;
  }
};

/**
 * Every Clerk user whose role is Beta. Clerk cannot filter on a metadata
 * field, so this pages the whole user list. It is memoized for a minute, calls
 * that arrive during a scan share it, and a failed scan is not retried for 15
 * seconds. Null when Clerk cannot be read and nothing is cached.
 */
export const betaRoleIds = async (): Promise<ReadonlySet<string> | null> => {
  const now = Date.now();
  if (betaRoleCache !== null && now - betaRoleCache.at < ROLE_TTL_MS) {
    return betaRoleCache.ids;
  }
  if (now - betaRoleFailedAt < FAILURE_BACKOFF_MS) {
    return betaRoleCache?.ids ?? null;
  }
  betaRoleInFlight ??= scanBetaRoles().finally(() => {
    betaRoleInFlight = null;
  });
  return betaRoleInFlight;
};

const ROLE_CHUNK = 100;

/** The Clerk role of each id (default 'user'); ids Clerk could not be asked about are absent. */
export const rolesOf = async (
  userIds: readonly string[],
): Promise<Map<string, string>> => {
  const ids = [...new Set(userIds)];
  const roles = new Map<string, string>();
  for (let start = 0; start < ids.length; start += ROLE_CHUNK) {
    const chunk = ids.slice(start, start + ROLE_CHUNK);
    try {
      const result = await clerkClient.users.getUserList({
        userId: chunk,
        limit: ROLE_CHUNK,
      });
      for (const user of result.data) {
        const role = metadataRole(user.publicMetadata);
        roles.set(user.id, isRole(role) ? role : 'user');
      }
    } catch (err) {
      console.error('[admin] could not read Clerk roles for named people', err);
    }
  }
  return roles;
};
