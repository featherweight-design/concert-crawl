import { describe, expect, it } from 'vitest';
import {
  crawlBatchResult,
  finalBatchCounts,
  isNotOkBatch,
  type CrawlBatchResultInput,
} from './crawl-batch-result.js';

const COUNTS = {
  ok: 0,
  notOk: 0,
  unchanged: 0,
  skipped: 0,
  total: 0,
  failed: 0,
  blocked: 0,
};

const batch = (
  over: Partial<CrawlBatchResultInput> = {},
): CrawlBatchResultInput => ({
  didntStart: false,
  pending: 0,
  venueCount: 21,
  counts: { ...COUNTS, ok: 14, unchanged: 4, notOk: 3, failed: 1, total: 21 },
  retry: null,
  ...over,
});

const RETRY_AT = '2026-11-11T11:10:00.000Z';

describe('crawlBatchResult', () => {
  it('reads a night with failures but no block as a green Done', () => {
    expect(crawlBatchResult(batch())).toEqual({ key: 'done', tone: 'success' });
  });

  it('reads a blocked run as an amber Done', () => {
    const blocked = batch({
      counts: { ...COUNTS, ok: 20, notOk: 1, blocked: 1, total: 21 },
    });
    expect(crawlBatchResult(blocked)).toEqual({ key: 'done', tone: 'warning' });
  });

  it('reads Failed when no run read its page', () => {
    const failed = batch({
      venueCount: 2,
      counts: { ...COUNTS, notOk: 2, failed: 2, total: 2 },
    });
    expect(crawlBatchResult(failed)).toEqual({ key: 'failed', tone: 'danger' });
  });

  it('keeps one Unchanged run from Failed', () => {
    const unchanged = batch({
      venueCount: 2,
      counts: { ...COUNTS, unchanged: 1, notOk: 1, failed: 1, total: 2 },
    });
    expect(crawlBatchResult(unchanged).key).toBe('done');
  });

  it("reads Didn't start before anything else, then Running", () => {
    expect(crawlBatchResult(batch({ didntStart: true, pending: 2 }))).toEqual({
      key: 'didntStart',
      tone: 'danger',
    });
    expect(crawlBatchResult(batch({ pending: 2 }))).toEqual({
      key: 'running',
      tone: 'signal',
    });
  });
});

describe('finalBatchCounts', () => {
  it('keeps the counts as sent without a retry', () => {
    expect(finalBatchCounts(batch())).toEqual(batch().counts);
  });

  it('takes the retry over a night where every venue failed, then read OK', () => {
    const night = batch({
      counts: { ...COUNTS, ok: 21, notOk: 21, failed: 21, total: 42 },
      retry: { at: RETRY_AT, counts: { ...COUNTS, ok: 21, total: 21 } },
    });
    expect(finalBatchCounts(night)).toMatchObject({
      ok: 21,
      notOk: 0,
      failed: 0,
      total: 21,
    });
  });

  it('counts a paused venue once though it skipped in both waves', () => {
    const night = batch({
      counts: {
        ...COUNTS,
        ok: 20,
        notOk: 20,
        failed: 20,
        skipped: 2,
        total: 42,
      },
      retry: {
        at: RETRY_AT,
        counts: { ...COUNTS, ok: 20, skipped: 1, total: 21 },
      },
    });
    expect(finalBatchCounts(night)).toMatchObject({
      ok: 20,
      skipped: 1,
      notOk: 0,
    });
  });
});

describe('isNotOkBatch', () => {
  it('leaves out a green Done whatever its failed count', () => {
    expect(isNotOkBatch(batch())).toBe(false);
  });

  it("takes an amber Done, Failed and Didn't start", () => {
    expect(
      isNotOkBatch(
        batch({
          counts: { ...COUNTS, ok: 20, notOk: 1, blocked: 1, total: 21 },
        }),
      ),
    ).toBe(true);
    expect(
      isNotOkBatch(
        batch({
          venueCount: 1,
          counts: { ...COUNTS, notOk: 1, failed: 1, total: 1 },
        }),
      ),
    ).toBe(true);
    expect(
      isNotOkBatch(
        batch({ didntStart: true, venueCount: 0, counts: { ...COUNTS } }),
      ),
    ).toBe(true);
  });

  it('leaves out a batch still running', () => {
    expect(
      isNotOkBatch(
        batch({ pending: 3, counts: { ...COUNTS, notOk: 1, blocked: 1 } }),
      ),
    ).toBe(false);
  });

  it('reads a retried night by its final result', () => {
    // Blocked at 3:00, every venue OK on the retry: not Not OK.
    const recovered = batch({
      counts: { ...COUNTS, ok: 21, notOk: 21, blocked: 21, total: 42 },
      retry: { at: RETRY_AT, counts: { ...COUNTS, ok: 21, total: 21 } },
    });
    expect(isNotOkBatch(recovered)).toBe(false);
    // Still blocked after the retry: amber, Not OK.
    const stillBlocked = batch({
      counts: { ...COUNTS, ok: 20, notOk: 2, blocked: 2, total: 22 },
      retry: {
        at: RETRY_AT,
        counts: { ...COUNTS, notOk: 1, blocked: 1, total: 1 },
      },
    });
    expect(isNotOkBatch(stillBlocked)).toBe(true);
  });
});
