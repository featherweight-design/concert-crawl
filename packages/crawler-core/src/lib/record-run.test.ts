import { describe, it, expect } from 'vitest';
import type { CrawlRunValues } from './record-run.js';

const base = { venueId: '00000000-0000-4000-8000-000000000000' };

describe('CrawlRunValues', () => {
  it('lets a success go without a reason and requires one on every other status', () => {
    const ok: CrawlRunValues = { ...base, status: 'success' };
    const skipped: CrawlRunValues = {
      ...base,
      status: 'skipped',
      reason: 'crawl_paused',
    };

    // @ts-expect-error a failed run must say why
    const failedWithoutReason: CrawlRunValues = { ...base, status: 'failed' };

    // @ts-expect-error a partial run must say why
    const partialWithoutReason: CrawlRunValues = { ...base, status: 'partial' };

    expect([
      ok,
      skipped,
      failedWithoutReason,
      partialWithoutReason,
    ]).toHaveLength(4);
  });
});
