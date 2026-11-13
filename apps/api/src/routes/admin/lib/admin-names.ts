// How an admin who did something to a venue is named on the board: "Paused by
// Hugh". Their handle, or "a former admin" when they have none (an account that
// is gone has no profile row), never a raw user id. Null when nobody did it.

import { inArray } from 'drizzle-orm';
import { db, userProfiles } from '@concert-crawl/db';
import { FORMER_ADMIN_NAME } from '@concert-crawl/types';

export const FORMER_ADMIN = FORMER_ADMIN_NAME;

/** Display names for admin user ids; an id with no handle reads as a former admin. */
export const adminNamesOf = async (
  userIds: readonly (string | null)[],
): Promise<Map<string, string>> => {
  const ids = [...new Set(userIds.filter((id): id is string => id !== null))];
  const names = new Map<string, string>(ids.map((id) => [id, FORMER_ADMIN]));
  if (ids.length === 0) return names;
  const rows = await db
    .select({ userId: userProfiles.userId, handle: userProfiles.handle })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, ids));
  for (const row of rows) {
    if (row.handle !== null && row.handle !== '')
      names.set(row.userId, row.handle);
  }
  return names;
};

/** The name for one id: null when there is no id, else the handle or the fallback. */
export const nameOf = (
  names: ReadonlyMap<string, string>,
  userId: string | null,
): string | null =>
  userId === null ? null : (names.get(userId) ?? FORMER_ADMIN);
