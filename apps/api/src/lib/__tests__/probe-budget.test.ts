import { describe, expect, it } from 'vitest';
import {
  PROBE_REQUESTS,
  type PlatformSource,
} from '@concert-crawl/crawler-core/fetchers';
import {
  MAX_PROBE_REDIRECT_HOPS,
  PROBE_TIMEOUT_MS,
  probeBudgetMs,
} from '../probe-budget.js';

function isPlatformSource(key: string): key is PlatformSource {
  return Object.hasOwn(PROBE_REQUESTS, key);
}

const SOURCES = Object.keys(PROBE_REQUESTS).filter(isPlatformSource);

describe('probeBudgetMs', () => {
  it('covers every platform source', () => {
    expect([...SOURCES].sort()).toEqual(
      ['aeg', 'detail-page', 'livenation', 'venuepilot'].sort(),
    );
  });

  it.each(SOURCES)(
    'is a positive finite number for %s at every delay',
    (source) => {
      for (const delayMs of [0, 3_000, 10_000, 60_000]) {
        const budget = probeBudgetMs(source, delayMs);
        expect(Number.isFinite(budget)).toBe(true);
        expect(budget).toBeGreaterThan(0);
      }
    },
  );

  it('gives every paced request and every possible hop a wait and its own network allowance', () => {
    // 3 s floor + a full second of jitter, plus the 15 s per-request cap.
    const perRequestMs = 4_000 + PROBE_TIMEOUT_MS;
    const hops = 1 + MAX_PROBE_REDIRECT_HOPS;
    expect(probeBudgetMs('aeg', 3_000)).toBe(perRequestMs);
    expect(probeBudgetMs('venuepilot', 3_000)).toBe(perRequestMs);
    expect(probeBudgetMs('livenation', 3_000)).toBe(2 * hops * perRequestMs);
    expect(probeBudgetMs('detail-page', 3_000)).toBe(3 * hops * perRequestMs);
  });

  it('never budgets a wait under the 3 s floor', () => {
    expect(probeBudgetMs('aeg', 0)).toBe(probeBudgetMs('aeg', 3_000));
  });

  it('throws rather than returning NaN for a source with no profile', () => {
    // What a mis-shaped fetcher (one with no `source`) hands the probe.
    expect(() => probeBudgetMs(undefined, 3_000)).toThrow(
      /No probe request profile/,
    );
    expect(() => probeBudgetMs('not-a-platform', 3_000)).toThrow(
      /No probe request profile/,
    );
  });

  it('throws rather than returning NaN for a delay that is not a number', () => {
    expect(() => probeBudgetMs('aeg', Number.NaN)).toThrow(
      /not a positive finite/,
    );
  });
});
