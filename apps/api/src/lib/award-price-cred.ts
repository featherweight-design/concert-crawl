// apps/api/src/lib/award-price-cred.ts
//
// Awards +1 price-cred to a submitter. Upserts into `user_cred` (keyed by Clerk
// user ID, UNIQUE) so a fan who has never earned cred gets a row on their first
// confirmed submission. The prior implementation UPDATEd `user_roles`, which only
// has rows for role-granted accounts — so awards to regular fans matched zero
// rows and silently vanished, leaving the profile stuck at 0 cred (issue #1012).
//
// Runs inside the caller's transaction so the award commits atomically with the
// submission status change that triggered it.

import { sql } from 'drizzle-orm'
import { userCred } from '@concert-crawl/db'

import type { DbExecutor } from './db-executor.js'

export const awardPriceCred = async (
  executor: DbExecutor,
  userId: string,
): Promise<void> => {
  await executor
    .insert(userCred)
    .values({ userId, priceCredScore: 1 })
    .onConflictDoUpdate({
      target: userCred.userId,
      set: {
        priceCredScore: sql`${userCred.priceCredScore} + 1`,
        updatedAt: sql`now()`,
      },
    })
}
