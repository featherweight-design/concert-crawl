import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { desc, eq } from 'drizzle-orm';
import { auditLog } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
}

const get = (): Promise<Response> => app.request('/v1/admin/settings');
const patch = (body: unknown): Promise<Response> =>
  app.request('/v1/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

interface SettingsBody {
  data: {
    llmMonthlyBudgetUsd: number | null;
    approvePricesMyself: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
  };
}

describe('admin settings', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  it('refuses non-admins on both verbs', async () => {
    setAuth('user');
    expect((await get()).status).toBe(403);
    expect((await patch({ approvePricesMyself: true })).status).toBe(403);
  });

  it('reads the defaults before anything is saved', async () => {
    setAuth('admin');
    const res = await get();
    expect(res.status).toBe(200);
    expect(((await res.json()) as SettingsBody).data).toEqual({
      llmMonthlyBudgetUsd: null,
      approvePricesMyself: false,
      updatedAt: null,
      updatedBy: null,
    });
  });

  it('rejects a bad budget, an unknown key and an empty body', async () => {
    setAuth('admin');
    for (const body of [
      { llmMonthlyBudgetUsd: -5 },
      { llmMonthlyBudgetUsd: 0 },
      { llmMonthlyBudgetUsd: 1000.01 },
      { llmMonthlyBudgetUsd: '50' },
      { approvePricesMyself: 'yes' },
      { somethingElse: true },
      {},
    ]) {
      expect((await patch(body)).status).toBe(400);
    }
    expect(await testDb.select().from(auditLog)).toHaveLength(0);
  });

  it('saves a partial patch, keeps the rest, and audits before and after', async () => {
    setAuth('admin', 'admin-a');
    expect((await patch({ llmMonthlyBudgetUsd: 40 })).status).toBe(200);

    const res = await patch({ approvePricesMyself: true });
    expect(res.status).toBe(200);
    expect(((await res.json()) as SettingsBody).data).toMatchObject({
      llmMonthlyBudgetUsd: 40,
      approvePricesMyself: true,
      updatedBy: 'admin-a',
    });

    const [row] = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'settings.update'))
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    expect(row?.actorId).toBe('admin-a');
    expect(row?.metadata).toEqual({
      before: { llmMonthlyBudgetUsd: 40, approvePricesMyself: false },
      after: { llmMonthlyBudgetUsd: 40, approvePricesMyself: true },
    });
  });

  it('clears the budget with null', async () => {
    setAuth('admin');
    await patch({ llmMonthlyBudgetUsd: 25.5 });
    const res = await patch({ llmMonthlyBudgetUsd: null });
    expect(((await res.json()) as SettingsBody).data.llmMonthlyBudgetUsd).toBe(
      null,
    );
    expect(
      ((await (await get()).json()) as SettingsBody).data.llmMonthlyBudgetUsd,
    ).toBeNull();
  });
});
