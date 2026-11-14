import { describe, expect, it } from 'vitest';
import type { BatchRunInput } from '../crawl-batches.js';
import { lastNightlyFact } from './all-clear-facts.js';

describe('lastNightlyFact', () => {
  it('reads OK of total from the latest nightly', () => {
    const fact = lastNightlyFact({
      runs: [
        run('a', '2026-11-13T09:08:00Z'),
        run('b', '2026-11-13T09:09:00Z'),
        run('c', '2026-11-13T09:10:00Z', {
          status: 'failed',
          reason: 'timeout',
        }),
      ],
      triggers: [],
      now: new Date('2026-11-13T18:00:00Z'),
    });
    expect(fact).toMatchObject({ ok: 2, total: 3 });
    expect(fact?.at).toBe('2026-11-13T09:08:00.000Z');
  });

  it('skips a night still running, so a half-done sweep is not read as clean', () => {
    expect(
      lastNightlyFact({
        runs: [
          run('a', '2026-11-13T09:08:00Z'),
          run('b', '2026-11-13T09:09:00Z'),
        ],
        triggers: [],
        // Two minutes after the last run: the crawl is still going.
        now: new Date('2026-11-13T09:11:00Z'),
      }),
    ).toBeNull();
  });

  it('is null when no nightly ran', () => {
    expect(
      lastNightlyFact({
        runs: [],
        triggers: [],
        now: new Date('2026-11-13T18:00:00Z'),
      }),
    ).toBeNull();
  });
});
