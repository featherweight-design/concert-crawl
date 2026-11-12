import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState, clerkUsers } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  const users: {
    list: Array<{ id: string; publicMetadata: Record<string, unknown> }>;
    fail: boolean;
  } = { list: [], fail: false };
  return { authState: state, clerkUsers: users };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

vi.mock('@clerk/backend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/backend')>();
  return {
    ...actual,
    createClerkClient: () => ({
      users: {
        getUserList: async ({ userId }: { userId: string[] }) => {
          if (clerkUsers.fail) throw new Error('clerk down');
          const data = clerkUsers.list.filter((user) =>
            userId.includes(user.id),
          );
          return { data, totalCount: data.length };
        },
      },
    }),
  };
});

import {
  auditLog,
  inviteCodeRedemptions,
  inviteCodes,
} from '@concert-crawl/db';
import { eq } from 'drizzle-orm';
import type {
  AdminInviteCode,
  InviteCode,
  InviteCodeRedemptionsResponse,
} from '@concert-crawl/types';
import { createApp } from '../../app.js';
import { clearTables, seedUserProfile } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();
const ADMIN = 'test-admin-1';

function setAuth(role: 'admin' | 'user'): void {
  authState.current = { userId: ADMIN, sessionClaims: { metadata: { role } } };
}

const daysFromNow = (days: number): Date =>
  new Date(Date.now() + days * 86_400_000);

async function seedCode(
  overrides: Partial<typeof inviteCodes.$inferInsert> = {},
): Promise<typeof inviteCodes.$inferSelect> {
  const [row] = await testDb
    .insert(inviteCodes)
    .values({
      code: `BETA-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      createdBy: ADMIN,
      maxUses: 50,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('seedCode: no row');
  return row;
}

async function call(
  method: string,
  path: string,
  body?: unknown,
): Promise<{
  status: number;
  json: { success: boolean; data?: unknown; error?: string };
}> {
  const res = await app.request(`/v1/admin/invite-codes${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  return { status: res.status, json: await res.json() };
}

async function auditActions(): Promise<string[]> {
  const rows = await testDb.select().from(auditLog);
  return rows.map((row) => row.action);
}

beforeEach(async () => {
  authState.current = null;
  clerkUsers.list = [];
  clerkUsers.fail = false;
  await clearTables();
});

describe('GET /v1/admin/invite-codes', () => {
  it('returns the maker handle and the last use, falling back to used_at', async () => {
    setAuth('admin');
    await seedUserProfile(ADMIN, { handle: 'jules' });
    const fresh = await seedCode({ label: 'Hi-Dive' });
    const legacyUsedAt = new Date('2026-10-01T12:00:00Z');
    const legacy = await seedCode({
      createdBy: 'gone-user',
      maxUses: 1,
      useCount: 1,
      usedBy: 'fan-0',
      usedAt: legacyUsedAt,
    });
    await testDb.insert(inviteCodeRedemptions).values([
      {
        codeId: fresh.id,
        userId: 'fan-1',
        redeemedAt: new Date('2026-11-01T00:00:00Z'),
      },
      {
        codeId: fresh.id,
        userId: 'fan-2',
        redeemedAt: new Date('2026-11-09T00:00:00Z'),
      },
    ]);

    const { status, json } = await call('GET', '');
    expect(status).toBe(200);
    const rows = json.data as AdminInviteCode[];
    const freshRow = rows.find((row) => row.id === fresh.id);
    const legacyRow = rows.find((row) => row.id === legacy.id);
    expect(freshRow?.createdByHandle).toBe('jules');
    expect(freshRow?.lastUsedAt).toBe('2026-11-09T00:00:00.000Z');
    expect(legacyRow?.createdByHandle).toBeNull();
    expect(legacyRow?.lastUsedAt).toBe(legacyUsedAt.toISOString());
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    expect((await call('GET', '')).status).toBe(403);
  });
});

describe('POST /v1/admin/invite-codes with a custom code', () => {
  it('stores the code uppercase and audits it as custom', async () => {
    setAuth('admin');
    const { status, json } = await call('POST', '', {
      code: 'GlobeHall',
      label: 'Poster · Globe Hall',
      maxUses: 50,
    });
    expect(status).toBe(201);
    expect((json.data as InviteCode).code).toBe('GLOBEHALL');
    expect(await auditActions()).toContain('invite_code.create');
  });

  it('answers a taken code with 409 and the lowest free number on the end', async () => {
    setAuth('admin');
    await seedCode({ code: 'REDROCKS' });
    await seedCode({ code: 'REDROCKS2' });

    const res = await app.request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'redrocks' }),
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      success: false,
      error: 'code_taken',
      code: 'REDROCKS',
      suggestion: 'REDROCKS3',
    });
  });

  it('trims a suggestion to fit 20 characters', async () => {
    setAuth('admin');
    const long = 'A'.repeat(20);
    await seedCode({ code: long });

    const res = await app.request('/v1/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: long }),
    });
    expect((await res.json()).suggestion).toBe(`${'A'.repeat(19)}2`);
  });

  it.each(['ABC', 'A'.repeat(21), 'RED-ROCKS', 'BETAMAX', 'BETA-AB12-CD34'])(
    'refuses %j as a custom code',
    async (code) => {
      setAuth('admin');
      const { status } = await call('POST', '', { code });
      expect(status).toBe(400);
    },
  );

  it('still generates a BETA- code when none is given', async () => {
    setAuth('admin');
    const { json } = await call('POST', '', {});
    expect((json.data as InviteCode).code).toMatch(
      /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    );
  });
});

describe('PATCH /v1/admin/invite-codes/:id', () => {
  it('edits label, seats and expiry, and audits it', async () => {
    setAuth('admin');
    const code = await seedCode({ label: 'Old' });
    const expiresAt = daysFromNow(30).toISOString();

    const { status, json } = await call('PATCH', `/${code.id}`, {
      label: 'Hi-Dive bathroom',
      maxUses: 100,
      expiresAt,
    });
    expect(status).toBe(200);
    const updated = json.data as InviteCode;
    expect(updated.label).toBe('Hi-Dive bathroom');
    expect(updated.maxUses).toBe(100);
    expect(new Date(updated.expiresAt ?? '').toISOString()).toBe(expiresAt);
    expect(updated.code).toBe(code.code);
    expect(await auditActions()).toEqual(['invite_code.edit']);
  });

  it('clears the expiry with null (never)', async () => {
    setAuth('admin');
    const code = await seedCode({ expiresAt: daysFromNow(5) });
    const { status, json } = await call('PATCH', `/${code.id}`, {
      expiresAt: null,
    });
    expect(status).toBe(200);
    expect((json.data as InviteCode).expiresAt).toBeNull();
  });

  it("refuses seats below the seats already used, and doesn't write", async () => {
    setAuth('admin');
    const code = await seedCode({ maxUses: 50, useCount: 23 });
    const { status, json } = await call('PATCH', `/${code.id}`, {
      maxUses: 20,
    });
    expect(status).toBe(409);
    expect(json.error).toContain('23');
    const [row] = await testDb
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, code.id));
    expect(row?.maxUses).toBe(50);
    expect(await auditActions()).toEqual([]);
  });

  it('allows seats equal to the seats used', async () => {
    setAuth('admin');
    const code = await seedCode({ maxUses: 50, useCount: 23 });
    expect((await call('PATCH', `/${code.id}`, { maxUses: 23 })).status).toBe(
      200,
    );
  });

  it('refuses a revoked code', async () => {
    setAuth('admin');
    const code = await seedCode({ revokedAt: new Date(), revokedBy: ADMIN });
    expect((await call('PATCH', `/${code.id}`, { label: 'x' })).status).toBe(
      409,
    );
  });

  it('refuses an expired code: only reactivate brings it back', async () => {
    setAuth('admin');
    const code = await seedCode({ expiresAt: daysFromNow(-1) });
    const { status } = await call('PATCH', `/${code.id}`, {
      expiresAt: daysFromNow(30).toISOString(),
    });
    expect(status).toBe(409);
    expect(await auditActions()).toEqual([]);
  });

  it('refuses an expiry in the past', async () => {
    setAuth('admin');
    const code = await seedCode();
    const { status } = await call('PATCH', `/${code.id}`, {
      expiresAt: daysFromNow(-1).toISOString(),
    });
    expect(status).toBe(400);
  });

  it('refuses an empty body, unknown fields and a bad id', async () => {
    setAuth('admin');
    const code = await seedCode();
    expect((await call('PATCH', `/${code.id}`, {})).status).toBe(400);
    expect((await call('PATCH', `/${code.id}`, { code: 'NEW' })).status).toBe(
      400,
    );
    expect((await call('PATCH', '/not-a-uuid', { label: 'x' })).status).toBe(
      400,
    );
  });

  it('404s an unknown code', async () => {
    setAuth('admin');
    const { status } = await call(
      'PATCH',
      '/00000000-0000-4000-8000-000000000000',
      {
        label: 'x',
      },
    );
    expect(status).toBe(404);
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    const code = await seedCode();
    expect((await call('PATCH', `/${code.id}`, { label: 'x' })).status).toBe(
      403,
    );
  });
});

describe('POST /v1/admin/invite-codes/:id/reactivate', () => {
  it('clears a revoke and keeps a future expiry when none is given', async () => {
    setAuth('admin');
    const expiry = daysFromNow(10);
    const code = await seedCode({
      revokedAt: new Date(),
      revokedBy: ADMIN,
      expiresAt: expiry,
    });

    const { status, json } = await call('POST', `/${code.id}/reactivate`, {});
    expect(status).toBe(200);
    const updated = json.data as InviteCode;
    expect(updated.revokedAt).toBeNull();
    expect(updated.revokedBy).toBeNull();
    expect(new Date(updated.expiresAt ?? '').toISOString()).toBe(
      expiry.toISOString(),
    );
    expect(await auditActions()).toEqual(['invite_code.reactivate']);
  });

  it('brings an expired code back with a new expiry', async () => {
    setAuth('admin');
    const code = await seedCode({ expiresAt: daysFromNow(-1) });
    const next = daysFromNow(30).toISOString();
    const { status, json } = await call('POST', `/${code.id}/reactivate`, {
      expiresAt: next,
    });
    expect(status).toBe(200);
    expect(
      new Date((json.data as InviteCode).expiresAt ?? '').toISOString(),
    ).toBe(next);
  });

  it('brings an expired code back with no expiry (never)', async () => {
    setAuth('admin');
    const code = await seedCode({ expiresAt: daysFromNow(-1) });
    const { status, json } = await call('POST', `/${code.id}/reactivate`, {
      expiresAt: null,
    });
    expect(status).toBe(200);
    expect((json.data as InviteCode).expiresAt).toBeNull();
  });

  it('refuses when the code would still be expired', async () => {
    setAuth('admin');
    const code = await seedCode({ expiresAt: daysFromNow(-1) });
    expect((await call('POST', `/${code.id}/reactivate`, {})).status).toBe(400);
    expect(
      (
        await call('POST', `/${code.id}/reactivate`, {
          expiresAt: daysFromNow(-2).toISOString(),
        })
      ).status,
    ).toBe(400);
    expect(await auditActions()).toEqual([]);
  });

  it('refuses a code that is not ended', async () => {
    setAuth('admin');
    const code = await seedCode({ expiresAt: daysFromNow(3) });
    expect((await call('POST', `/${code.id}/reactivate`, {})).status).toBe(409);
  });

  it('refuses non-admins', async () => {
    setAuth('user');
    const code = await seedCode({ revokedAt: new Date() });
    expect((await call('POST', `/${code.id}/reactivate`, {})).status).toBe(403);
  });
});

describe('GET /v1/admin/invite-codes/:id/redemptions', () => {
  it('lists who joined, newest first, with handles, roles and the total', async () => {
    setAuth('admin');
    const code = await seedCode();
    await seedUserProfile('fan-1', { handle: 'rae' });
    await testDb.insert(inviteCodeRedemptions).values([
      {
        codeId: code.id,
        userId: 'fan-1',
        redeemedAt: new Date('2026-10-02T00:00:00Z'),
      },
      {
        codeId: code.id,
        userId: 'fan-2',
        redeemedAt: new Date('2026-10-05T00:00:00Z'),
      },
      {
        codeId: code.id,
        userId: 'fan-3',
        redeemedAt: new Date('2026-10-01T00:00:00Z'),
      },
    ]);
    clerkUsers.list = [
      { id: 'fan-1', publicMetadata: { role: 'beta' } },
      { id: 'fan-2', publicMetadata: {} },
    ];

    const { status, json } = await call(
      'GET',
      `/${code.id}/redemptions?limit=2`,
    );
    expect(status).toBe(200);
    const body = json.data as InviteCodeRedemptionsResponse;
    expect(body.total).toBe(3);
    expect(body.data).toEqual([
      {
        userId: 'fan-2',
        handle: null,
        role: 'user',
        redeemedAt: '2026-10-05T00:00:00.000Z',
      },
      {
        userId: 'fan-1',
        handle: 'rae',
        role: 'beta',
        redeemedAt: '2026-10-02T00:00:00.000Z',
      },
    ]);
  });

  it('includes a legacy used_by redeemer with no redemptions row', async () => {
    setAuth('admin');
    const code = await seedCode({
      maxUses: 1,
      useCount: 1,
      usedBy: 'fan-0',
      usedAt: new Date('2026-09-01T00:00:00Z'),
    });
    const { json } = await call('GET', `/${code.id}/redemptions`);
    const body = json.data as InviteCodeRedemptionsResponse;
    expect(body.total).toBe(1);
    expect(body.data[0]?.userId).toBe('fan-0');
  });

  it('lists a used_by redeemer once when they also have a redemptions row', async () => {
    setAuth('admin');
    const code = await seedCode({
      maxUses: 5,
      useCount: 2,
      usedBy: 'fan-0',
      usedAt: new Date('2026-09-01T00:00:00Z'),
    });
    await testDb.insert(inviteCodeRedemptions).values([
      {
        codeId: code.id,
        userId: 'fan-0',
        redeemedAt: new Date('2026-09-01T00:00:00Z'),
      },
      {
        codeId: code.id,
        userId: 'fan-1',
        redeemedAt: new Date('2026-09-02T00:00:00Z'),
      },
    ]);
    const { json } = await call('GET', `/${code.id}/redemptions`);
    const body = json.data as InviteCodeRedemptionsResponse;
    expect(body.total).toBe(2);
    expect(body.data.map((row) => row.userId)).toEqual(['fan-1', 'fan-0']);
  });

  it('leaves roles null when Clerk fails', async () => {
    setAuth('admin');
    const code = await seedCode();
    await testDb
      .insert(inviteCodeRedemptions)
      .values({ codeId: code.id, userId: 'fan-1' });
    clerkUsers.fail = true;
    const { status, json } = await call('GET', `/${code.id}/redemptions`);
    expect(status).toBe(200);
    expect(
      (json.data as InviteCodeRedemptionsResponse).data[0]?.role,
    ).toBeNull();
  });

  it('404s an unknown code and refuses non-admins', async () => {
    setAuth('admin');
    expect(
      (await call('GET', '/00000000-0000-4000-8000-000000000000/redemptions'))
        .status,
    ).toBe(404);
    setAuth('user');
    const code = await seedCode();
    expect((await call('GET', `/${code.id}/redemptions`)).status).toBe(403);
  });
});
