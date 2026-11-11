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
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => {
  // Annotated rather than asserted: `as { userId: string } | null` widens a
  // null literal by silencing the compiler, and the house rule is that a cast
  // proves nothing.
  const state: { current: { userId: string } | null } = { current: null };
  return { authState: state };
});

// The comp write mirrors itself into Clerk's publicMetadata. That is a
// third-party call with its own failure path, and what this file proves is
// what Postgres did.
const { mirrorCalls } = vi.hoisted(() => {
  const calls: string[] = [];
  return { mirrorCalls: calls };
});

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      updateUserMetadata: async (userId: string) => {
        mirrorCalls.push(userId);
      },
    },
  }),
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  // A request may name its own user, which lets two concurrent requests in one
  // test carry different accounts without racing on the shared state.
  getAuth: (ctx: { req: { header: (name: string) => string | undefined } }) => {
    const userId = ctx.req.header('x-test-user');
    return userId ? { userId } : authState.current;
  },
}));

import { eq } from 'drizzle-orm';
import {
  giftedComps,
  inviteCodeRedemptions,
  inviteCodes,
} from '@concert-crawl/db';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import { clearTables } from '../test/helpers/seed.js';
import { loadPlanContext } from '../lib/plan.js';

const app = createApp();
const USER_ID = 'user_redeem_comp';
const CODE = 'BETA-3C41-8BC0';

const seedCode = async (code = CODE, maxUses = 1): Promise<void> => {
  await testDb
    .insert(inviteCodes)
    .values({ code, createdBy: 'user_test_admin', maxUses });
};

const redeem = async (code = CODE): Promise<Response> =>
  app.request('/v1/auth/redeem-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-token',
    },
    body: JSON.stringify({ code }),
  });

const comps = async (
  userId = USER_ID,
): Promise<(typeof giftedComps.$inferSelect)[]> =>
  testDb.select().from(giftedComps).where(eq(giftedComps.userId, userId));

describe('POST /v1/auth/redeem-code — the beta comp', () => {
  beforeEach(async () => {
    authState.current = { userId: USER_ID };
    mirrorCalls.length = 0;
    // The mirror is skipped outright without a key, so the spy would never
    // fire and every assertion about it would hold vacuously.
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture');
    await clearTables();
  });

  it('grants a lifetime comp, and the account derives premium from it', async () => {
    await seedCode();

    expect((await redeem()).status).toBe(200);

    const [comp] = await comps();
    expect(comp).toBeDefined();
    // NULL expiry is what the schema calls the beta cohort's shape, and it is
    // also what keeps these rows out of the daily gift job, which scans only
    // finite expiries for the ending-soon mail and the expiry revoke.
    expect(comp!.expiresAt).toBeNull();
    expect(comp!.revokedAt).toBeNull();

    // The point of the grant: without it this reads `free`, because nothing
    // seeds a trial.
    const { planState } = await loadPlanContext(USER_ID, undefined);
    expect(planState.plan).toBe('gifted');
  });

  it('writes one row however many codes the same account redeems', async () => {
    await seedCode();
    await seedCode('BETA-9AAA-1BBB');

    await redeem();
    const [first] = await comps();
    // The status is the assertion that makes this case measure the conflict
    // clause at all: without it a duplicate-key error is a 500 nobody reads,
    // and every check below still holds precisely BECAUSE the second insert
    // failed. Confirmed by running it with `onConflictDoNothing` removed.
    expect((await redeem('BETA-9AAA-1BBB')).status).toBe(200);

    const rows = await comps();
    expect(rows).toHaveLength(1);
    // Not refreshed either: the same row, untouched.
    expect(rows[0]!.id).toBe(first!.id);
    expect(rows[0]!.createdAt.getTime()).toBe(first!.createdAt.getTime());
  });

  it('leaves the Clerk mirror alone when the comp it would advertise is revoked', async () => {
    // The mirror is the JWT-fast path beside the table. Writing it for a
    // revoked comp puts Clerk on `premium_gifted` over a row deriving `free`,
    // and nothing downstream repairs that: every later read just logs the
    // disagreement. Asserted through the grant's own return value, which is
    // what the route gates the mirror write on.
    await seedCode();
    await redeem();
    // The positive half FIRST, and it is not decoration: `mirrorBetaComp`
    // returns early when CLERK_SECRET_KEY is unset, so without proving the
    // spy fires at all, the assertion below passes against any build — which
    // is exactly what a mutation run showed before this line existed.
    expect(mirrorCalls).toEqual([USER_ID]);

    await testDb
      .update(giftedComps)
      .set({ revokedAt: new Date() })
      .where(eq(giftedComps.userId, USER_ID));
    mirrorCalls.length = 0;

    await seedCode('BETA-9AAA-1BBB');
    expect((await redeem('BETA-9AAA-1BBB')).status).toBe(200);

    const { planState } = await loadPlanContext(USER_ID, undefined);
    expect(planState.plan).toBe('free');
    expect(mirrorCalls).toEqual([]);
  });

  it('never resurrects a comp an admin revoked', async () => {
    await seedCode();
    await redeem();
    const revokedAt = new Date();
    await testDb
      .update(giftedComps)
      .set({ revokedAt })
      .where(eq(giftedComps.userId, USER_ID));

    // A second code, redeemed after the revoke.
    await seedCode('BETA-9AAA-1BBB');
    expect((await redeem('BETA-9AAA-1BBB')).status).toBe(200);

    const rows = await comps();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.revokedAt).not.toBeNull();
    const { planState } = await loadPlanContext(USER_ID, undefined);
    expect(planState.plan).toBe('free');
  });

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
    await seedCode();
    authState.current = { userId: 'user_first' };
    await redeem();

    authState.current = { userId: USER_ID };
    expect((await redeem()).status).toBe(409);
    expect(await comps()).toHaveLength(0);
    // The first account keeps its own, so the 409 is about the claim rather
    // than about the grant failing for everyone.
    expect(await comps('user_first')).toHaveLength(1);
  });
});

// A poster code admits up to `max_uses` accounts. The seat count is the claim,
// so every case here reads it back from the row rather than trusting the
// status alone.
describe('POST /v1/auth/redeem-code — multi-use codes', () => {
  const POSTER = 'BETA-P0ST-ER01';

  const asUser = async (userId: string): Promise<Response> => {
    authState.current = { userId };
    return redeem(POSTER);
  };

  const seats = async (): Promise<number> => {
    const [row] = await testDb
      .select({ useCount: inviteCodes.useCount })
      .from(inviteCodes)
      .where(eq(inviteCodes.code, POSTER));
    return row!.useCount;
  };

  beforeEach(async () => {
    mirrorCalls.length = 0;
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fixture');
    await clearTables();
  });

  it('admits several accounts, then refuses once every seat is taken', async () => {
    await seedCode(POSTER, 2);

    expect((await asUser('user_a')).status).toBe(200);
    expect((await asUser('user_b')).status).toBe(200);
    expect((await asUser('user_c')).status).toBe(409);

    expect(await seats()).toBe(2);
    expect(await comps('user_a')).toHaveLength(1);
    expect(await comps('user_b')).toHaveLength(1);
    expect(await comps('user_c')).toHaveLength(0);
    const ledger = await testDb.select().from(inviteCodeRedemptions);
    expect(ledger.map((row) => row.userId).sort()).toEqual([
      'user_a',
      'user_b',
    ]);
  });

  it('spends one seat however often the same account redeems', async () => {
    await seedCode(POSTER, 3);

    expect((await asUser('user_a')).status).toBe(200);
    expect((await asUser('user_b')).status).toBe(200);
    // A later redeemer is not `used_by`, so only the ledger recognises them.
    expect((await asUser('user_b')).status).toBe(200);
    expect((await asUser('user_a')).status).toBe(200);

    expect(await seats()).toBe(2);
    expect(await comps('user_a')).toHaveLength(1);
    expect(await comps('user_b')).toHaveLength(1);
  });

  it('gives the last seat to exactly one of two concurrent redeems', async () => {
    // Two different accounts race for one remaining seat. A read-then-write
    // increment lets both through; the conditional UPDATE lets one.
    await seedCode(POSTER, 2);
    expect((await asUser('user_a')).status).toBe(200);

    const race = (userId: string): Promise<Response> =>
      app.request('/v1/auth/redeem-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake-token',
          'x-test-user': userId,
        },
        body: JSON.stringify({ code: POSTER }),
      });
    const statuses = (await Promise.all([race('user_b'), race('user_c')])).map(
      (res) => res.status,
    );

    expect(statuses.sort()).toEqual([200, 409]);
    expect(await seats()).toBe(2);
  });

  it('reports a full code as used at validate time', async () => {
    await seedCode(POSTER, 1);
    expect((await asUser('user_a')).status).toBe(200);

    const res = await app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: POSTER }),
    });
    expect(res.status).toBe(409);
  });
});
