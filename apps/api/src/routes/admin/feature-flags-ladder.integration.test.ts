import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState, clerkUsers } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  // The Clerk users the flags page can read: id and role.
  const users: {
    current: { id: string; role: string }[];
    failing: boolean;
    calls: number;
  } = { current: [], failing: false, calls: 0 };
  return { authState: state, clerkUsers: users };
});

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUserList: async (params: {
        userId?: string[];
        limit?: number;
        offset?: number;
      }) => {
        clerkUsers.calls += 1;
        if (clerkUsers.failing) throw new Error('clerk down');
        const wanted = params.userId;
        const all = clerkUsers.current.filter(
          (user) => wanted === undefined || wanted.includes(user.id),
        );
        const offset = params.offset ?? 0;
        const data = all
          .slice(offset, offset + (params.limit ?? 10))
          .map((user) => ({
            id: user.id,
            publicMetadata: { role: user.role },
          }));
        return { data, totalCount: all.length };
      },
    },
  }),
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import {
  featureFlagHistory,
  featureFlagUsers,
  featureFlags,
} from '@concert-crawl/db';
import { FORMER_ADMIN_NAME } from '@concert-crawl/types';
import { asc, eq } from 'drizzle-orm';
import { createApp } from '../../app.js';
import { clearFeatureFlagCache } from '../../lib/feature-flags.js';
import { clearTables, seedUserProfile } from '../../test/helpers/seed.js';
import { clearBetaRoleCache } from './lib/flag-audience.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const ADMIN = 'test-admin-1';

const asAdmin = (): void => {
  authState.current = {
    userId: ADMIN,
    sessionClaims: { metadata: { role: 'admin' } },
  };
};

const asViewer = (userId: string | null, role?: string): void => {
  authState.current =
    userId === null
      ? null
      : { userId, sessionClaims: { metadata: role ? { role } : {} } };
};

const patch = (body: unknown) =>
  app.request('/v1/admin/feature-flags/crews', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const post = (path: string, body: unknown = {}) =>
  app.request(`/v1/admin/feature-flags/crews${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const crewsFor = async (): Promise<boolean> => {
  const res = await app.request('/v1/flags');
  const body = (await res.json()) as { data: { crews: boolean } };
  return body.data.crews;
};

const storedCrews = async () => {
  const [row] = await testDb
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, 'crews'));
  return row;
};

describe('feature flag ladder (staging)', () => {
  beforeEach(async () => {
    process.env['SENTRY_ENVIRONMENT'] = 'staging';
    await clearTables();
    clearFeatureFlagCache();
    asAdmin();
  });

  it('turning a flag on is Everyone, and writes the first history row', async () => {
    const res = await patch({ enabled: true });
    expect(res.status).toBe(200);
    const row = await storedCrews();
    expect(row?.enabled).toBe(true);
    expect(row?.stage).toBe('everyone');
    const history = await testDb.select().from(featureFlagHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      flagKey: 'crews',
      kind: 'stage_set',
      fromStage: 'off',
      toStage: 'everyone',
      actorUserId: ADMIN,
    });
  });

  it('turning it off is Off and adds a second entry from Everyone', async () => {
    await patch({ enabled: true });
    await patch({ enabled: false });
    expect((await storedCrews())?.stage).toBe('off');
    const history = await testDb
      .select()
      .from(featureFlagHistory)
      .orderBy(asc(featureFlagHistory.createdAt));
    expect(history.map((entry) => [entry.fromStage, entry.toStage])).toEqual([
      ['off', 'everyone'],
      ['everyone', 'off'],
    ]);
  });

  it('a toggle that changes nothing adds no history entry', async () => {
    await patch({ enabled: true });
    await patch({ enabled: true });
    expect(await testDb.select().from(featureFlagHistory)).toHaveLength(1);
  });

  it('refuses a flag sitting at Me with nobody as Me', async () => {
    await patch({ enabled: false });
    await expect(
      testDb
        .update(featureFlags)
        .set({ stage: 'me', stageOwnerUserId: null })
        .where(eq(featureFlags.key, 'crews')),
    ).rejects.toThrow();
  });

  it('Me is the admin who set it: they see the flag, nobody else does', async () => {
    expect((await patch({ stage: 'me' })).status).toBe(200);
    expect((await storedCrews())?.stageOwnerUserId).toBe(ADMIN);
    asViewer(ADMIN, 'admin');
    expect(await crewsFor()).toBe(true);
    asViewer('someone-else', 'beta');
    expect(await crewsFor()).toBe(false);
    asViewer(null);
    expect(await crewsFor()).toBe(false);
  });

  it('Beta is the beta role, the named people and Me; logged-out never sees it', async () => {
    await patch({ stage: 'me' });
    expect((await post('/people', { userId: 'named-1' })).status).toBe(200);
    await patch({ stage: 'beta' });
    for (const [userId, role, sees] of [
      ['beta-user', 'beta', true],
      ['named-1', undefined, true],
      [ADMIN, 'admin', true],
      ['plain-user', 'user', false],
      ['promoter-1', 'promoter', false],
    ] as const) {
      asViewer(userId, role);
      expect(await crewsFor(), `${userId} (${role ?? 'no role'})`).toBe(sees);
    }
    asViewer(null);
    expect(await crewsFor()).toBe(false);
  });

  it('Everyone is on for everybody, signed in or not', async () => {
    await patch({ stage: 'everyone' });
    asViewer(null);
    expect(await crewsFor()).toBe(true);
    asViewer('anyone', 'user');
    expect(await crewsFor()).toBe(true);
  });

  it('answers a signed-in caller privately and a signed-out one publicly', async () => {
    asViewer('anyone', 'user');
    const signedIn = await app.request('/v1/flags');
    expect(signedIn.headers.get('cache-control')).toMatch(/^private/);
    expect(signedIn.headers.get('vary')).toMatch(/Authorization/i);
    asViewer(null);
    const signedOut = await app.request('/v1/flags');
    expect(signedOut.headers.get('cache-control')).toMatch(/^public/);
  });

  it('gates a router on the viewer: Beta sees crews, others get a 404', async () => {
    await patch({ stage: 'beta' });
    asViewer('beta-user', 'beta');
    expect((await app.request('/v1/crews')).status).not.toBe(404);
    asViewer('plain-user', 'user');
    expect((await app.request('/v1/crews')).status).toBe(404);
  });

  it('clears the verified mark when the stage changes on staging', async () => {
    await patch({ stage: 'me' });
    expect((await post('/verify', { note: 'looks right' })).status).toBe(200);
    expect((await storedCrews())?.verifiedAt).not.toBeNull();
    await patch({ stage: 'beta' });
    const row = await storedCrews();
    expect(row?.verifiedAt).toBeNull();
    expect(row?.verifiedNote).toBeNull();
    const kinds = (
      await testDb
        .select()
        .from(featureFlagHistory)
        .orderBy(asc(featureFlagHistory.createdAt))
    ).map((entry) => entry.kind);
    expect(kinds).toContain('unverified');
  });

  it('stores the Mark verified checks as booleans with the note', async () => {
    await post('/verify', {
      note: 'walked it',
      checks: { works: true, copy: false },
    });
    const [entry] = await testDb
      .select()
      .from(featureFlagHistory)
      .where(eq(featureFlagHistory.kind, 'verified'));
    expect(entry).toMatchObject({
      note: 'walked it',
      checks: { works: true, copy: false },
    });
  });

  it('Undo verify just clears the mark', async () => {
    await post('/verify');
    const res = await app.request('/v1/admin/feature-flags/crews/verify', {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    expect((await storedCrews())?.verifiedAt).toBeNull();
  });

  it('adds and removes a named person, with history', async () => {
    await post('/people', { userId: 'named-9' });
    expect(await testDb.select().from(featureFlagUsers)).toHaveLength(1);
    const res = await app.request(
      '/v1/admin/feature-flags/crews/people/named-9',
      { method: 'DELETE' },
    );
    expect(res.status).toBe(200);
    expect(await testDb.select().from(featureFlagUsers)).toHaveLength(0);
    const kinds = (await testDb.select().from(featureFlagHistory)).map(
      (entry) => entry.kind,
    );
    expect(kinds.sort()).toEqual(['person_added', 'person_removed']);
  });
});

describe('feature flag ladder (production lock)', () => {
  beforeEach(async () => {
    // Unset counts as production: the lock fails closed.
    delete process.env['SENTRY_ENVIRONMENT'];
    await clearTables();
    clearFeatureFlagCache();
    asAdmin();
  });

  it('refuses to step a flag up until it is verified', async () => {
    const res = await patch({ stage: 'beta' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe(
      'flag_not_verified',
    );
    expect((await storedCrews())?.stage).toBe('off');
  });

  it('lets a verified flag climb, but Everyone asks first', async () => {
    await post('/verify', { note: 'ok in production' });
    expect((await patch({ stage: 'beta' })).status).toBe(200);
    const unconfirmed = await patch({ stage: 'everyone' });
    expect(unconfirmed.status).toBe(400);
    expect(((await unconfirmed.json()) as { error: string }).error).toBe(
      'confirm_required',
    );
    expect((await patch({ stage: 'everyone', confirm: true })).status).toBe(
      200,
    );
    expect((await storedCrews())?.stage).toBe('everyone');
  });

  it('always lets a flag step down or off, verified or not', async () => {
    await testDb
      .insert(featureFlags)
      .values({
        key: 'crews',
        enabled: true,
        stage: 'everyone',
        updatedBy: 'seed',
      })
      .onConflictDoNothing();
    expect((await patch({ stage: 'beta' })).status).toBe(200);
    expect((await patch({ stage: 'off' })).status).toBe(200);
  });

  it('does not clear the mark on a production stage change', async () => {
    await post('/verify');
    await patch({ stage: 'beta' });
    expect((await storedCrews())?.verifiedAt).not.toBeNull();
  });
});

describe('what the flags page draws about people', () => {
  type Flag = {
    key: string;
    people: {
      userId: string;
      handle: string | null;
      role: string | null;
      isTest: boolean;
      addedAt: string;
    }[];
    verifiedByHandle: string | null;
    betaCount: number | null;
  };

  const crews = async (): Promise<Flag> => {
    const res = await app.request('/v1/admin/feature-flags');
    const body = (await res.json()) as { data: Flag[] };
    const found = body.data.find((flag) => flag.key === 'crews');
    if (!found) throw new Error('crews missing from the list');
    return found;
  };

  beforeEach(async () => {
    process.env['SENTRY_ENVIRONMENT'] = 'staging';
    await clearTables();
    clearFeatureFlagCache();
    clearBetaRoleCache();
    clerkUsers.current = [];
    clerkUsers.failing = false;
    clerkUsers.calls = 0;
    asAdmin();
  });

  it('still answers when Clerk cannot be read: role and Beta count are null', async () => {
    await seedUserProfile('named-a', { handle: 'ana.b' });
    await post('/people', { userId: 'named-a' });
    // The add above read Clerk while it was up and memoized the answer: drop
    // that, so the next read has to ask Clerk again, and fail.
    clearBetaRoleCache();
    clerkUsers.failing = true;
    const flag = await crews();
    expect(flag.betaCount).toBeNull();
    expect(flag.people[0]).toMatchObject({ handle: 'ana.b', role: null });
  });

  it('does not rescan Clerk for the Beta role inside a minute', async () => {
    clerkUsers.current = [{ id: 'beta-1', role: 'beta' }];
    await crews();
    const afterFirst = clerkUsers.calls;
    await crews();
    expect(clerkUsers.calls).toBe(afterFirst);
  });

  it('asks Clerk for roles in chunks of 100', async () => {
    const ids = Array.from({ length: 150 }, (_, index) => `named-${index}`);
    clerkUsers.current = ids.map((id) => ({ id, role: 'user' }));
    // The first add creates the flag's row, which the rest hang on.
    await post('/people', { userId: 'seed-row' });
    for (const id of ids) {
      await testDb
        .insert(featureFlagUsers)
        .values({ flagKey: 'crews', userId: id, addedBy: ADMIN })
        .onConflictDoNothing();
    }
    const flag = await crews();
    expect(flag.people.filter((person) => person.role === 'user')).toHaveLength(
      150,
    );
  });

  it('gives each named person a handle, role, test mark and added date', async () => {
    await seedUserProfile('named-a', { handle: 'ana.b' });
    await seedUserProfile('named-t', {
      handle: 'andre.r',
      isTestAccount: true,
    });
    clerkUsers.current = [
      { id: 'named-a', role: 'beta' },
      { id: 'named-t', role: 'user' },
    ];
    await post('/people', { userId: 'named-a' });
    await post('/people', { userId: 'named-t' });
    await post('/people', { userId: 'gone-1' });

    const flag = await crews();
    expect(flag.people.map((person) => person.userId)).toEqual([
      'gone-1',
      'named-a',
      'named-t',
    ]);
    expect(flag.people[0]).toMatchObject({ handle: null, isTest: false });
    expect(flag.people[1]).toMatchObject({
      handle: 'ana.b',
      role: 'beta',
      isTest: false,
    });
    expect(flag.people[2]).toMatchObject({
      handle: 'andre.r',
      role: 'user',
      isTest: true,
    });
    expect(Date.parse(flag.people[1]?.addedAt ?? '')).not.toBeNaN();
  });

  it('counts the Beta role, named people and the Me owner, test accounts left out', async () => {
    await seedUserProfile('beta-1', { handle: 'b1' });
    await seedUserProfile('beta-test', { handle: 'bt', isTestAccount: true });
    await seedUserProfile('named-t', { isTestAccount: true });
    clerkUsers.current = [
      { id: 'beta-1', role: 'beta' },
      { id: 'beta-test', role: 'beta' },
      { id: 'someone', role: 'user' },
    ];
    await post('/people', { userId: 'named-1' });
    await post('/people', { userId: 'named-t' });
    // beta-1 + named-1 count; beta-test and named-t are test accounts.
    expect((await crews()).betaCount).toBe(2);
  });

  it('counts a person who has the role and is also named once', async () => {
    clerkUsers.current = [{ id: 'both', role: 'beta' }];
    await post('/people', { userId: 'both' });
    expect((await crews()).betaCount).toBe(1);
  });

  it('names who verified, or the former-admin fallback', async () => {
    await seedUserProfile(ADMIN, { handle: 'hugh' });
    await post('/verify');
    expect((await crews()).verifiedByHandle).toBe('hugh');
    await testDb
      .update(featureFlags)
      .set({ verifiedBy: 'deleted-admin' })
      .where(eq(featureFlags.key, 'crews'));
    expect((await crews()).verifiedByHandle).toBe(FORMER_ADMIN_NAME);
  });

  it('names the actor and subject on each history row', async () => {
    await seedUserProfile(ADMIN, { handle: 'hugh' });
    await seedUserProfile('named-a', { handle: 'ana.b' });
    await post('/people', { userId: 'named-a' });
    const res = await app.request('/v1/admin/feature-flags/crews/history');
    const body = (await res.json()) as {
      data: {
        kind: string;
        actorHandle: string | null;
        subjectHandle: string | null;
      }[];
    };
    expect(body.data[0]).toMatchObject({
      kind: 'person_added',
      actorHandle: 'hugh',
      subjectHandle: 'ana.b',
    });
  });
});
