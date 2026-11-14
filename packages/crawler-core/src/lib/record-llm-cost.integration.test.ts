import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { costTracking, db } from '@concert-crawl/db';
import { recordLlmCost } from './record-llm-cost.js';

beforeEach(async () => {
  await db.execute(sql`TRUNCATE cost_tracking RESTART IDENTITY CASCADE`);
});

// 2,000 input + 500 output + 10,000 cache-read + 4,000 cache-write tokens at
// Haiku 4.5 rates: 0.002 + 0.0025 + 0.001 + 0.005 = 0.0105.
const usage = {
  inputTokens: 2_000,
  outputTokens: 500,
  cacheReadTokens: 10_000,
  cacheWriteTokens: 4_000,
};

describe('recordLlmCost', () => {
  it('writes one priced row and returns its cost', async () => {
    const costUsd = await recordLlmCost({
      service: 'venue-about',
      usage,
      model: 'claude-haiku-4-5-20251001',
      metadata: { venueId: 'venue-1' },
    });

    expect(costUsd).toBeCloseTo(0.0105, 10);
    const rows = await db.select().from(costTracking);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.service).toBe('venue-about');
    expect(row?.costUsd).toBe('0.010500');
    expect(Number(row?.tokensUsed)).toBe(2_500);
    expect(JSON.parse(row?.metadata ?? 'null')).toEqual({
      venueId: 'venue-1',
      ...usage,
    });
  });
});
