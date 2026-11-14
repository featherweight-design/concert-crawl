import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  adminSettings,
  costTracking,
  crawlRuns,
  db,
  venues,
} from '@concert-crawl/db';
import { readLlmBudgetStatus } from './llm-budget.js';

// The budget sums crawl_runs.llm_cost_usd plus cost_tracking for the services
// in LLM_SERVICES only, so a non-LLM cost never counts as LLM spend.

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE crawl_runs, cost_tracking, admin_settings RESTART IDENTITY CASCADE`,
  );
  await db.insert(adminSettings).values({ id: 1, llmMonthlyBudgetUsd: '20' });
});

async function seedVenue(): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Budget Venue ${crypto.randomUUID()}`,
      slug: `budget-venue-${crypto.randomUUID()}`,
      websiteUrl: 'https://budget.example.com',
      city: 'Denver',
      timezone: 'America/Denver',
      active: true,
      verified: true,
      crawlMode: 'browser',
    })
    .returning();
  if (!venue) throw new Error('venue insert returned no row');
  return venue.id;
}

describe('readLlmBudgetStatus', () => {
  it('counts every LLM service', async () => {
    await db.insert(costTracking).values([
      { service: 'genre-tagger', costUsd: '0.500000' },
      { service: 'venue-about', costUsd: '0.010000' },
      { service: 'artist-adjudication', costUsd: '0.250000' },
    ]);

    const status = await readLlmBudgetStatus();

    expect(status.spentUsd).toBeCloseTo(0.76, 6);
  });

  it('leaves out render, spotify and an unknown non-LLM service', async () => {
    await db.insert(costTracking).values([
      { service: 'render', costUsd: '7.000000' },
      { service: 'spotify', costUsd: '3.000000' },
      { service: 'some-hosting-bill', costUsd: '5.000000' },
      { service: 'venue-about', costUsd: '1.000000' },
    ]);

    const status = await readLlmBudgetStatus();

    expect(status.spentUsd).toBeCloseTo(1, 6);
  });

  it("counts extraction once, from crawl_runs, not again from its 'claude' row", async () => {
    const venueId = await seedVenue();
    await db
      .insert(crawlRuns)
      .values({ venueId, status: 'success', llmCostUsd: 2 });
    await db.insert(costTracking).values([
      { service: 'claude', costUsd: '2.000000' },
      { service: 'genre-tagger', costUsd: '0.500000' },
    ]);

    const status = await readLlmBudgetStatus();

    expect(status.spentUsd).toBeCloseTo(2.5, 6);
  });
});
