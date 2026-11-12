import { describe, it, expect } from 'vitest';
import {
  FetchLog,
  MAX_FETCH_LOG_ENTRIES,
  MAX_FETCH_LOG_FAILURES,
} from './fetch-log.js';

describe('FetchLog', () => {
  it('hashes and measures a body without keeping it', () => {
    const log = new FetchLog();
    log.record({
      url: 'https://v.example/',
      finalUrl: 'https://v.example/shows',
      httpStatus: 200,
      mode: 'http',
      body: 'héllo',
    });

    const [entry] = log.entries;
    expect(entry).toMatchObject({
      url: 'https://v.example/',
      finalUrl: 'https://v.example/shows',
      httpStatus: 200,
      fetchMode: 'http',
      bytes: 6,
    });
    expect(entry?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(entry).not.toHaveProperty('body');
  });

  it('records a failed request with no body', () => {
    const log = new FetchLog();
    log.record({ url: 'https://v.example/', httpStatus: 403, mode: 'browser' });

    expect(log.entries[0]).toMatchObject({
      httpStatus: 403,
      finalUrl: null,
      bytes: null,
      contentHash: null,
    });
  });

  it('keeps only the first 50 pages', () => {
    const log = new FetchLog();
    for (let i = 0; i < MAX_FETCH_LOG_ENTRIES + 10; i++) {
      log.record({
        url: `https://v.example/${i}`,
        httpStatus: 200,
        mode: 'http',
      });
    }

    expect(log.entries).toHaveLength(MAX_FETCH_LOG_ENTRIES);
    expect(log.entries[0]?.url).toBe('https://v.example/0');
  });

  it('keeps a failed request even after the cap is reached', () => {
    const log = new FetchLog();
    for (let i = 0; i < MAX_FETCH_LOG_ENTRIES; i++) {
      log.record({
        url: `https://v.example/${i}`,
        httpStatus: 200,
        mode: 'http',
      });
    }
    log.record({
      url: 'https://v.example/late',
      httpStatus: 429,
      mode: 'http',
    });
    log.record({ url: 'https://v.example/reset', mode: 'http' });
    log.record({
      url: 'https://v.example/ok-late',
      httpStatus: 200,
      mode: 'http',
    });

    expect(log.entries.map((entry) => entry.url).slice(-2)).toEqual([
      'https://v.example/late',
      'https://v.example/reset',
    ]);
    expect(log.entries).toHaveLength(MAX_FETCH_LOG_ENTRIES + 2);
  });

  it('bounds the failed requests too', () => {
    const log = new FetchLog();
    for (let i = 0; i < MAX_FETCH_LOG_FAILURES + 100; i++) {
      log.record({
        url: `https://v.example/missing-${i}`,
        httpStatus: 404,
        mode: 'http',
      });
    }

    expect(log.entries).toHaveLength(MAX_FETCH_LOG_FAILURES);
    expect(log.entries[0]?.url).toBe('https://v.example/missing-0');
  });

  it('counts the page cap over successes only, failures interleaved or not', () => {
    const log = new FetchLog();
    for (let i = 0; i < MAX_FETCH_LOG_ENTRIES + 20; i++) {
      log.record({
        url: `https://v.example/ok-${i}`,
        httpStatus: 200,
        mode: 'http',
      });
      log.record({
        url: `https://v.example/bad-${i}`,
        httpStatus: 500,
        mode: 'http',
      });
    }

    const ok = log.entries.filter((entry) => entry.httpStatus === 200);
    const bad = log.entries.filter((entry) => entry.httpStatus === 500);
    expect(ok).toHaveLength(MAX_FETCH_LOG_ENTRIES);
    expect(bad).toHaveLength(MAX_FETCH_LOG_ENTRIES + 20);
  });
});
