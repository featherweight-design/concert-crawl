import { describe, expect, it, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => ({
  pageBatches: [] as unknown[][],
  failBatch: -1,
}));

// Only the two inserts insertCrawlRun makes: the run (returning a row) and the
// page batches (awaited directly).
vi.mock('@concert-crawl/db', () => {
  const crawlRuns = { _t: 'crawlRuns' };
  const crawlRunPages = { _t: 'crawlRunPages' };
  const db = {
    insert: (table: { _t: string }) => ({
      values: (rows: unknown) => {
        if (table._t === 'crawlRuns') {
          return {
            returning: async () => [{ id: 'run-1', venueId: 'venue-1' }],
          };
        }
        const batch = Array.isArray(rows) ? rows : [rows];
        calls.pageBatches.push(batch);
        const failing = calls.pageBatches.length - 1 === calls.failBatch;
        return {
          then: (
            resolve: (value: unknown) => void,
            reject: (reason: unknown) => void,
          ) =>
            failing
              ? reject(new Error('page batch failed'))
              : resolve(undefined),
        };
      },
    }),
  };
  return { db, crawlRuns, crawlRunPages };
});
vi.mock('@concert-crawl/logger', () => ({ reportFailure: vi.fn() }));

import { reportFailure } from '@concert-crawl/logger';
import type { FetchLogEntry } from './fetch-log.js';
import { PAGE_INSERT_CHUNK, insertCrawlRun } from './record-run.js';

const entries = (count: number): FetchLogEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    url: `https://v.example/${index}`,
    finalUrl: null,
    httpStatus: 200,
    fetchMode: 'http',
    bytes: null,
    contentHash: null,
    fetchedAt: new Date(),
    htmlGz: null,
    bodyExpiresAt: null,
    bodyTruncated: false,
  }));

const run = { venueId: 'venue-1', status: 'success' } as const;

describe('insertCrawlRun page flushing', () => {
  beforeEach(() => {
    calls.pageBatches.length = 0;
    calls.failBatch = -1;
    vi.mocked(reportFailure).mockClear();
  });

  it('writes nothing when the run fetched nothing', async () => {
    await insertCrawlRun(run, { entries: [] });
    expect(calls.pageBatches).toEqual([]);
  });

  it('keeps every statement under the parameter limit however big the log is', async () => {
    await insertCrawlRun(run, { entries: entries(PAGE_INSERT_CHUNK * 3 + 7) });

    expect(calls.pageBatches.map((batch) => batch.length)).toEqual([
      PAGE_INSERT_CHUNK,
      PAGE_INSERT_CHUNK,
      PAGE_INSERT_CHUNK,
      7,
    ]);
    // Nine columns a row: the largest statement stays far below 65,535.
    expect(PAGE_INSERT_CHUNK * 9).toBeLessThan(65_535);
  });

  it('loses only the failed chunk and reports it', async () => {
    calls.failBatch = 1;

    const crawlRun = await insertCrawlRun(run, {
      entries: entries(PAGE_INSERT_CHUNK * 2 + 1),
    });

    expect(crawlRun.id).toBe('run-1');
    expect(calls.pageBatches).toHaveLength(3);
    expect(reportFailure).toHaveBeenCalledTimes(1);
  });
});
