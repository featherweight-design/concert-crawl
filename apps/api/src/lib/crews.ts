// apps/api/src/lib/crews.ts
//
// Concert Crews (#1226) — membership, authorization, and the member cap.
// Everything here is shared by the /v1/crews router (PR-2) and the invite /
// join router (PR-3), which is why the cap and the row lock live in one place
// rather than being restated at each insert site.

import { and, eq, sql } from 'drizzle-orm'
import { crewMembers, crews } from '@concert-crawl/db'
import type { DbExecutor } from './db-executor.js'

// The cap and the two leave codes are re-exported, not redeclared: the crew
// home renders both (the spots-left line, and the confirm kind a 409 selects),
// so they live with the wire contract in `@concert-crawl/types`. Not a DB
// constraint either way — a unique index cannot express "at most 12 rows in
// this group", so the cap is enforced here under the row lock below (plan D4).
export {
  CREW_MEMBER_CAP,
  CREW_HANDOFF_REQUIRED_CODE,
  CREW_LAST_MEMBER_CODE,
} from '@concert-crawl/types'

/** Up to five avatars ride the cluster on a crews-list row. */
export const CREW_CLUSTER_SIZE = 5

export const CREW_FULL_CODE = 'crew_full'
export const CREW_DUPLICATE_ID_CODE = 'crew_duplicate_id'

/**
 * Take a row lock on the crew before counting members. Without it, twelve
 * people tapping a forwarded invite at once all read `memberCount = 11` and
 * all insert (plan D4). Must be called inside a transaction — outside one the
 * lock is released the instant the statement returns and buys nothing.
 *
 * Returns the locked crew, or null when no such crew exists.
 */
export const lockCrew = async (
  executor: DbExecutor,
  crewId: string,
): Promise<{ id: string; keeperId: string } | null> => {
  const [row] = await executor
    .select({ id: crews.id, keeperId: crews.keeperId })
    .from(crews)
    .where(eq(crews.id, crewId))
    .for('update')
    .limit(1)
  return row ?? null
}

/** Current member count. Never stored — the number is never larger than 12. */
export const countMembers = async (
  executor: DbExecutor,
  crewId: string,
): Promise<number> => {
  const [row] = await executor
    .select({ total: sql<number>`count(*)::int` })
    .from(crewMembers)
    .where(eq(crewMembers.crewId, crewId))
  return row?.total ?? 0
}

export const isMember = async (
  executor: DbExecutor,
  crewId: string,
  userId: string,
): Promise<boolean> => {
  const [row] = await executor
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .limit(1)
  return Boolean(row)
}
