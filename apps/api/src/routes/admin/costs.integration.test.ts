// The Health cost tile and chart (GET /v1/admin/costs/daily) must show the
// figure the crawler's monthly LLM budget acts on (readLlmBudgetStatus), or
// "If it runs out" trips at a number the admin never saw.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { adminSettings, costTracking, crawlRuns } from '@concert-crawl/db';
import { readLlmBudgetStatus } from '@concert-crawl/crawler-core';
import type { AdminDailyCosts } from '@concert-crawl/types';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';
import { mountainDateString } from './costs.js';

const app = createApp();

describe('admin costs: the panel month equals the budget month', () => {
  beforeEach(async () => {
    await clearTables();
    authState.current = {
      userId: 'user_admin',
      sessionClaims: { metadata: { role: 'admin' } },
    };
  });

  it('sums extraction plus the LLM_SERVICES rows, and nothing else', async () => {
    const venue = await seedVenue({ name: 'Levitt', slug: 'levitt' });
    const now = new Date();
    await testDb.insert(crawlRuns).values([
      { venueId: venue.id, status: 'success', createdAt: now, llmCostUsd: 0.5 },
      {
        venueId: venue.id,
        status: 'success',
        createdAt: now,
        llmCostUsd: 0.25,
      },
      // A structured-data run never touches the LLM.
      { venueId: venue.id, status: 'success', createdAt: now },
    ]);
    await testDb.insert(costTracking).values([
      { service: 'artist-adjudication', costUsd: '0.1', recordedAt: now },
      { service: 'genre-tagger', costUsd: '0.05', recordedAt: now },
      { service: 'venue-about', costUsd: '0.02', recordedAt: now },
      // Extraction's own row: already in crawl_runs, so never counted twice.
      { service: 'claude', costUsd: '0.75', recordedAt: now },
      // Not LLM spend.
      { service: 'render', costUsd: '3', recordedAt: now },
    ]);
    // The budget only reads spend when one is set.
    await testDb.insert(adminSettings).values({ llmMonthlyBudgetUsd: '100' });

    const res = await app.request('/v1/admin/costs/daily?days=31');
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { data: AdminDailyCosts };
    // The page sums this month's own days (admin/page.tsx), so do the same.
    const monthPrefix = mountainDateString(now).slice(0, 7);
    const panelMonthUsd = data.days
      .filter((day) => day.date.startsWith(monthPrefix))
      .reduce((sum, day) => sum + day.costUsd, 0);

    const budget = await readLlmBudgetStatus();
    expect(budget.spentUsd).toBeCloseTo(0.92, 6);
    expect(panelMonthUsd).toBeCloseTo(budget.spentUsd, 4);
  });
});
