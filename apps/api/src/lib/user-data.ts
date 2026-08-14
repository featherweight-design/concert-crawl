// Account deletion, driven by USER_DATA_REGISTRY (#907).
//
// The registry is the cascade. There are no foreign keys from application
// tables to the Clerk user id — it is a bare `text` column everywhere — so
// nothing in the database enforces that a deleted account leaves no rows
// behind. Iterating the registry rather than a hand-written list is what makes
// the coverage test in user-data.integration.test.ts meaningful: a new table
// cannot be added without the test demanding a disposition for it, and every
// disposition is executed here.

import { and, eq, ne, sql } from 'drizzle-orm'
import {
  USER_DATA_REGISTRY,
  crewInvites,
  crewMembers,
  crews,
  db,
} from '@concert-crawl/db'
import type { DbTransaction } from './db-executor.js'

/**
 * Removes everything a deleted account should not keep, per
 * `USER_DATA_REGISTRY`.
 *
 * Runs in ONE transaction. A partial deletion is worse than none: it leaves
 * the Privacy Policy's promise half-kept with no signal that it failed, and no
 * way to reach the surviving rows once the Clerk account is gone.
 *
 * Does NOT delete the Clerk user. The caller owns that, because Clerk sits
 * outside this transaction and fails independently of it.
 */
export const deleteUserData = async (userId: string): Promise<void> => {
  if (userId.trim().length === 0) {
    throw new Error('deleteUserData requires a non-empty user id')
  }

  await db.transaction(async (tx) => {
    // Crews first. Keepership has to transfer before `crew_members` rows go,
    // or there is no member left to promote.
    await reassignCrews(tx, userId)

    for (const entry of USER_DATA_REGISTRY) {
      if (entry.userIdColumn === null) continue
      // 'none' holds no user data; 'retain' survives under a legal-obligation
      // exemption. `crews` is 'retain' and is handled above — this guard keeps
      // that true if its disposition is ever revisited.
      if (entry.disposition !== 'delete' && entry.disposition !== 'anonymize') {
        continue
      }
      if (entry.tableName === 'crews') continue

      const table = sql.identifier(entry.tableName)
      const column = sql.identifier(entry.userIdColumn)

      if (entry.disposition === 'delete') {
        await tx.execute(sql`DELETE FROM ${table} WHERE ${column} = ${userId}`)
      } else {
        await tx.execute(
          sql`UPDATE ${table} SET ${column} = NULL WHERE ${column} = ${userId}`,
        )
      }
    }

    // `otherUserIdColumns` are declared on the registry but never dispositioned
    // by it, because what happens to them differs per column: most name an
    // ADMIN who acted and stay put as the record of who did it. This is the one
    // that does not. Revoking is an ordinary member action, so the revoker's
    // Clerk ID is their personal data and goes with them, while the invite row
    // itself survives for the crew.
    await tx
      .update(crewInvites)
      .set({ revokedBy: null })
      .where(eq(crewInvites.revokedBy, userId))
  })
}

/**
 * A crew outlives its founder. The name is a label for a group, not personal
 * data, so the crew is kept and keepership moves to the longest-tenured
 * remaining member. A crew whose only member was the leaver has nobody to
 * inherit it and is deleted outright.
 */
const reassignCrews = async (
  tx: DbTransaction,
  userId: string,
): Promise<void> => {
  const kept = await tx
    .select({ id: crews.id })
    .from(crews)
    .where(eq(crews.keeperId, userId))

  for (const crew of kept) {
    const [heir] = await tx
      .select({ userId: crewMembers.userId })
      .from(crewMembers)
      .where(
        and(eq(crewMembers.crewId, crew.id), ne(crewMembers.userId, userId)),
      )
      .orderBy(crewMembers.joinedAt)
      .limit(1)

    if (heir === undefined) {
      await tx.delete(crews).where(eq(crews.id, crew.id))
    } else {
      await tx
        .update(crews)
        .set({ keeperId: heir.userId })
        .where(eq(crews.id, crew.id))
    }
  }
}
