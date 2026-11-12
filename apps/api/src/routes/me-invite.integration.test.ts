import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims?: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { inviteCodeRedemptions, inviteCodes } from '@concert-crawl/db';
import type { MeInviteResponse } from '@concert-crawl/types';
import { createApp } from '../app.js';
import { clearTables, seedUserProfile } from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';
import { MEMBER_CODE_SEATS } from '../lib/invite-code-generation.js';
import { loadJoinSources } from './admin/lib/people-detail.js';
import { deleteUserData } from '../lib/user-data.js';

const app = createApp();
const as = (userId: string | null): void => {
  authState.current = userId === null ? null : { userId };
};
const read = () =>
  app.request('/v1/me/invite', { headers: { Authorization: 'Bearer t' } });
const body = async (res: Response): Promise<MeInviteResponse> =>
  ((await res.json()) as { data: MeInviteResponse }).data;
const memberRows = (userId: string) =>
  testDb.select().from(inviteCodes).where(eq(inviteCodes.createdBy, userId));

describe('GET /v1/me/invite', () => {
  beforeEach(async () => {
    as('user_a');
    await clearTables();
  });

  it('needs a signed-in caller', async () => {
    as(null);
    expect((await read()).status).toBe(401);
    expect((await app.request('/v1/me/invite')).status).toBe(401);
  });

  it('makes a member code on first read and returns the same one for good', async () => {
    const first = await body(await read());
    expect(first.code).toMatch(/^BETA-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(first).toMatchObject({
      revoked: false,
      joined: { count: 0, faces: [] },
    });
    const second = await body(await read());
    expect(second.code).toBe(first.code);

    const rows = await memberRows('user_a');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'member',
      maxUses: MEMBER_CODE_SEATS,
      createdBy: 'user_a',
    });
  });

  it('exposes only the code, the revoked flag and joiners: no mode, no url, no name', async () => {
    const res = await read();
    const data = await body(res);
    expect(Object.keys(data).sort()).toEqual(['code', 'joined', 'revoked']);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('makes exactly one code when opened twice at once', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, async () => body(await read())),
    );
    expect(new Set(results.map((result) => result.code)).size).toBe(1);
    expect(await memberRows('user_a')).toHaveLength(1);
  });

  it('keeps each account to its own code', async () => {
    const mine = await body(await read());
    as('user_b');
    const theirs = await body(await read());
    expect(theirs.code).not.toBe(mine.code);
  });

  it('returns a revoked code as revoked and never replaces it', async () => {
    const made = await body(await read());
    await testDb
      .update(inviteCodes)
      .set({ revokedAt: new Date(), revokedBy: 'user_admin' })
      .where(eq(inviteCodes.code, made.code));
    const after = await body(await read());
    expect(after).toMatchObject({ code: made.code, revoked: true });
    expect(await memberRows('user_a')).toHaveLength(1);
  });

  it('counts everyone who joined and shows the newest four as handle and colors only', async () => {
    const made = await body(await read());
    const [row] = await memberRows('user_a');
    const codeId = row?.id ?? '';
    for (let index = 1; index <= 6; index += 1) {
      const userId = `joiner_${index}`;
      await seedUserProfile(userId, {
        handle: `joiner${index}`,
        avatarColor: 'signal',
      });
      await testDb.insert(inviteCodeRedemptions).values({
        codeId,
        userId,
        redeemedAt: new Date(`2026-11-0${index}T12:00:00Z`),
      });
    }
    const after = await body(await read());
    expect(after.code).toBe(made.code);
    expect(after.joined.count).toBe(6);
    expect(after.joined.faces.map((face) => face.handle)).toEqual([
      'joiner6',
      'joiner5',
      'joiner4',
      'joiner3',
    ]);
    expect(Object.keys(after.joined.faces[0] ?? {}).sort()).toEqual([
      'avatarColor',
      'avatarSecondColor',
      'handle',
    ]);
    expect(JSON.stringify(after)).not.toContain('joiner_');
  });

  it('leaves test accounts out of the count and the strip', async () => {
    await read();
    const [row] = await memberRows('user_a');
    const codeId = row?.id ?? '';
    await seedUserProfile('real_1', { handle: 'real1' });
    await seedUserProfile('tester_1', {
      handle: 'tester1',
      isTestAccount: true,
    });
    await testDb.insert(inviteCodeRedemptions).values([
      { codeId, userId: 'real_1' },
      { codeId, userId: 'tester_1' },
      { codeId, userId: 'no_profile' },
    ]);
    const after = await body(await read());
    expect(after.joined.count).toBe(2);
    expect(after.joined.faces.map((face) => face.handle)).not.toContain(
      'tester1',
    );
  });

  it('goes with the account: deleting it removes the code, so the link stops admitting people', async () => {
    await read();
    const [row] = await memberRows('user_a');
    await testDb
      .insert(inviteCodeRedemptions)
      .values({ codeId: row?.id ?? '', userId: 'joiner_1' });
    await deleteUserData('user_a');
    expect(await memberRows('user_a')).toHaveLength(0);
    expect(await testDb.select().from(inviteCodeRedemptions)).toHaveLength(0);
  });

  it('is rate limited per account', async () => {
    let last = 200;
    for (let index = 0; index < 31; index += 1) {
      last = (await read()).status;
    }
    expect(last).toBe(429);
    as('user_b');
    expect((await read()).status).toBe(200);
  });
});

describe('a member code in the admin surfaces', () => {
  beforeEach(async () => {
    as('user_a');
    await clearTables();
  });

  it('cannot be edited by an admin, only revoked', async () => {
    await read();
    const [row] = await memberRows('user_a');
    authState.current = {
      userId: 'admin_1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    const res = await app.request(`/v1/admin/invite-codes/${row?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxUses: 50 }),
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'member_code' });
    expect((await memberRows('user_a'))[0]?.maxUses).toBe(MEMBER_CODE_SEATS);
  });

  it('reads as a member join source for people who joined with it, not a poster', async () => {
    await read();
    const [row] = await memberRows('user_a');
    await testDb
      .insert(inviteCodeRedemptions)
      .values({ codeId: row?.id ?? '', userId: 'joiner_1' });
    const sources = await loadJoinSources(['joiner_1'], new Set());
    expect(sources.get('joiner_1')).toEqual({
      kind: 'member',
      code: row?.code,
      label: null,
    });
  });
});
