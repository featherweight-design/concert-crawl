import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { adminSettings, costTracking, db } from '@concert-crawl/db';
import { NON_BUDGET_COST_SERVICES, readLlmBudgetStatus } from './llm-budget.js';

// The budget sums cost_tracking for every service except a named exclude
// list, so a new LLM caller counts the day it starts writing rows.

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE crawl_runs, cost_tracking, admin_settings RESTART IDENTITY CASCADE`,
  );
  await db.insert(adminSettings).values({ id: 1, llmMonthlyBudgetUsd: '20' });
});

describe('readLlmBudgetStatus', () => {
  it('counts a service it has never heard of', async () => {
    await db.insert(costTracking).values([
      { service: 'some-new-llm-feature', costUsd: '1.250000' },
      { service: 'genre-tagger', costUsd: '0.500000' },
      { service: 'venue-about', costUsd: '0.010000' },
    ]);

    const status = await readLlmBudgetStatus();

    expect(status.spentUsd).toBeCloseTo(1.76, 6);
  });

  it('leaves out every excluded service', async () => {
    await db.insert(costTracking).values([
      ...NON_BUDGET_COST_SERVICES.map((service) => ({
        service,
        costUsd: '3.000000',
      })),
      { service: 'some-new-llm-feature', costUsd: '1.000000' },
    ]);

    const status = await readLlmBudgetStatus();

    // Only the new service: 'claude' duplicates crawl_runs, 'spotify' is
    // not LLM spend.
    expect(status.spentUsd).toBeCloseTo(1, 6);
  });

  it('excludes the extraction duplicate and Spotify by name', () => {
    expect([...NON_BUDGET_COST_SERVICES].sort()).toEqual(['claude', 'spotify']);
  });
});
