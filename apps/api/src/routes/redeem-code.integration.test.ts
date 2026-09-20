// Integration tests for the beta comp written by POST /v1/auth/redeem-code.
//
// Three things live here that the route's unit test cannot reach, because all
// three are facts about what Postgres did:
//   1. `onConflictDoNothing({ target: giftedComps.userId })` names a real
//      unique index. A wrong target is a runtime error, and the mocked chain
//      in the unit test resolves either way.
//   2. A second redemption leaves the existing row alone rather than writing a
//      second one or refreshing the first.
//   3. A REVOKED comp stays revoked. An admin revoke is a decision, and
//      "do nothing on conflict" is what keeps a later redemption from undoing
//      it — invisible in any assertion about the statement issued.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => {
  // Annotated rather than asserted: `as { userId: string } | null` widens a
  // null literal by silencing the compiler, and the house rule is that a cast
  // proves nothing.
  const state: { current: { userId: string } | null } = { current: null }
  return { authState: state }
})

// The comp write mirrors itself into Clerk's publicMetadata. That is a
// third-party call with its own failure path, and what this file proves is
// what Postgres did.
const { mirrorCalls } = vi.hoisted(() => {
  const calls: string[] = []
  return { mirrorCalls: calls }
})

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      updateUserMetadata: async (userId: string) => {
        mirrorCalls.push(userId)
      },
    },
  }),
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { eq } from 'drizzle-orm'
import { giftedComps, inviteCodes } from '@concert-crawl/db'
import { createApp } from '../app.js'
import { testDb } from '../test/helpers/db.js'
import { clearTables } from '../test/helpers/seed.js'
import { loadPlanContext } from '../lib/plan.js'

const app = createApp()
const USER_ID = 'user_redeem_comp'
const CODE = 'BETA-3C41-8BC0'

const seedCode = async (code = CODE): Promise<void> => {
  await testDb
    .insert(inviteCodes)
    .values({ code, createdBy: 'user_test_admin' })
}

const redeem = async (code = CODE): Promise<Response> =>
  app.request('/v1/auth/redeem-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-token',
    },
    body: JSON.stringify({ code }),
  })

const comps = async (
  userId = USER_ID,
): Promise<(typeof giftedComps.$inferSelect)[]> =>
  testDb.select().from(giftedComps).where(eq(giftedComps.userId, userId))

describe('POST /v1/auth/redeem-code — the beta comp', () => {
  beforeEach(async () => {
    authState.current = { userId: USER_ID }
    mirrorCalls.length = 0
    // The mirror is skipped outright without a key, so the spy would never
    // fire and every assertion about it would hold vacuously.
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture')
    await clearTables()
  })

  it('grants a lifetime comp, and the account derives premium from it', async () => {
    await seedCode()

    expect((await redeem()).status).toBe(200)

    const [comp] = await comps()
    expect(comp).toBeDefined()
    // NULL expiry is what the schema calls the beta cohort's shape, and it is
    // also what keeps these rows out of the daily gift job, which scans only
    // finite expiries for the ending-soon mail and the expiry revoke.
    expect(comp!.expiresAt).toBeNull()
    expect(comp!.revokedAt).toBeNull()

    // The point of the grant: without it this reads `free`, because the
    // card-less trial is seeded only for accounts created after the founder
    // window opens and that instant is NULL until launch day.
    const { planState } = await loadPlanContext(USER_ID, undefined)
    expect(planState.plan).toBe('gifted')
  })

  it('writes one row however many codes the same account redeems', async () => {
    await seedCode()
    await seedCode('BETA-9AAA-1BBB')

    await redeem()
    const [first] = await comps()
    // The status is the assertion that makes this case measure the conflict
    // clause at all: without it a duplicate-key error is a 500 nobody reads,
    // and every check below still holds precisely BECAUSE the second insert
    // failed. Confirmed by running it with `onConflictDoNothing` removed.
    expect((await redeem('BETA-9AAA-1BBB')).status).toBe(200)

    const rows = await comps()
    expect(rows).toHaveLength(1)
    // Not refreshed either: the same row, untouched.
    expect(rows[0]!.id).toBe(first!.id)
    expect(rows[0]!.createdAt.getTime()).toBe(first!.createdAt.getTime())
  })

  it('leaves the Clerk mirror alone when the comp it would advertise is revoked', async () => {
    // The mirror is the JWT-fast path beside the table. Writing it for a
    // revoked comp puts Clerk on `premium_gifted` over a row deriving `free`,
    // and nothing downstream repairs that: every later read just logs the
    // disagreement. Asserted through the grant's own return value, which is
    // what the route gates the mirror write on.
    await seedCode()
    await redeem()
    // The positive half FIRST, and it is not decoration: `mirrorBetaComp`
    // returns early when CLERK_SECRET_KEY is unset, so without proving the
    // spy fires at all, the assertion below passes against any build — which
    // is exactly what a mutation run showed before this line existed.
    expect(mirrorCalls).toEqual([USER_ID])

    await testDb
      .update(giftedComps)
      .set({ revokedAt: new Date() })
      .where(eq(giftedComps.userId, USER_ID))
    mirrorCalls.length = 0

    await seedCode('BETA-9AAA-1BBB')
    expect((await redeem('BETA-9AAA-1BBB')).status).toBe(200)

    const { planState } = await loadPlanContext(USER_ID, undefined)
    expect(planState.plan).toBe('free')
    expect(mirrorCalls).toEqual([])
  })

  it('never resurrects a comp an admin revoked', async () => {
    await seedCode()
    await redeem()
    const revokedAt = new Date()
    await testDb
      .update(giftedComps)
      .set({ revokedAt })
      .where(eq(giftedComps.userId, USER_ID))

    // A second code, redeemed after the revoke.
    await seedCode('BETA-9AAA-1BBB')
    expect((await redeem('BETA-9AAA-1BBB')).status).toBe(200)

    const rows = await comps()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.revokedAt).not.toBeNull()
    const { planState } = await loadPlanContext(USER_ID, undefined)
    expect(planState.plan).toBe('free')
  })

  // What this proves is the 409 that the read at the top of the handler
  // returns, NOT the one the conditional update returns. The two are
  // different paths and only the second is a real race, which is not
  // reachable deterministically from here: the early read sees `used_by`
  // already set and short-circuits. Moving the grant ahead of the update
  // therefore passes this case — confirmed by running it — so the ordering
  // rule is stated where it can be read, in the route, rather than claimed
  // here. Both paths do share the thing worth asserting: a code this account
  // did not claim grants it nothing.
  it('grants nothing for a code another account already claimed', async () => {
    await seedCode()
    authState.current = { userId: 'user_first' }
    await redeem()

    authState.current = { userId: USER_ID }
    expect((await redeem()).status).toBe(409)
    expect(await comps()).toHaveLength(0)
    // The first account keeps its own, so the 409 is about the claim rather
    // than about the grant failing for everyone.
    expect(await comps('user_first')).toHaveLength(1)
  })
})
