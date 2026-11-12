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
import {
  PAGE_INSERT_BODY_BYTES,
  PAGE_INSERT_CHUNK,
  insertCrawlRun,
} from './record-run.js';

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

  it('splits a log whose bodies are large into byte-bounded chunks', async () => {
    const big = Buffer.alloc(Math.floor(PAGE_INSERT_BODY_BYTES * 0.6));
    const log = entries(4).map((entry) => ({ ...entry, htmlGz: big }));

    await insertCrawlRun(run, { entries: log });

    // 0.6 of the budget each: one body per chunk once a second would pass it.
    expect(calls.pageBatches.map((batch) => batch.length)).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it('retries a failed chunk without its bodies, so the page metadata survives', async () => {
    calls.failBatch = 0;
    const log = entries(2).map((entry) => ({
      ...entry,
      htmlGz: Buffer.from('gz'),
      bodyExpiresAt: new Date(),
    }));

    await insertCrawlRun(run, { entries: log });

    expect(calls.pageBatches).toHaveLength(2);
    const [, retry] = calls.pageBatches;
    expect(retry).toHaveLength(2);
    expect(
      retry?.every((row) => (row as { htmlGz: unknown }).htmlGz === null),
    ).toBe(true);
    expect(reportFailure).toHaveBeenCalledTimes(1);
  });
});
