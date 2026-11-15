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

import { featureFlagHistory, featureFlags } from '@concert-crawl/db';
import { asc, eq } from 'drizzle-orm';
import { createApp } from '../../app.js';
import { clearTables } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const patch = (enabled: boolean) =>
  app.request('/v1/admin/feature-flags/crews', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });

describe('feature flag ladder columns (migration 0122)', () => {
  beforeEach(async () => {
    await clearTables();
    authState.current = {
      userId: 'test-admin-1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
  });

  it('turning a flag on is Everyone, and writes the first history row', async () => {
    const res = await patch(true);
    expect(res.status).toBe(200);
    const [row] = await testDb
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, 'crews'));
    expect(row?.enabled).toBe(true);
    expect(row?.stage).toBe('everyone');
    const history = await testDb.select().from(featureFlagHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      flagKey: 'crews',
      kind: 'stage_set',
      fromStage: null,
      toStage: 'everyone',
      actorUserId: 'test-admin-1',
    });
  });

  it('turning it off is Off and adds a second entry from Everyone', async () => {
    await patch(true);
    await patch(false);
    const [row] = await testDb
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, 'crews'));
    expect(row?.stage).toBe('off');
    const history = await testDb
      .select()
      .from(featureFlagHistory)
      .orderBy(asc(featureFlagHistory.createdAt));
    expect(history.map((entry) => [entry.fromStage, entry.toStage])).toEqual([
      [null, 'everyone'],
      ['everyone', 'off'],
    ]);
  });

  it('a toggle that changes nothing adds no history entry', async () => {
    await patch(true);
    await patch(true);
    const history = await testDb.select().from(featureFlagHistory);
    expect(history).toHaveLength(1);
  });

  it('refuses a flag sitting at Me with nobody as Me', async () => {
    await patch(false);
    await expect(
      testDb
        .update(featureFlags)
        .set({ stage: 'me', stageOwnerUserId: null })
        .where(eq(featureFlags.key, 'crews')),
    ).rejects.toThrow();
  });
});
