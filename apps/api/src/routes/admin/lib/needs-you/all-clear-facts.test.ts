import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { BatchRunInput } from '../crawl-batches.js';
import {
  CRAWLER_DAILY_CRON_UTC,
  lastNightlyFact,
  nextCrawlAfter,
  snoozedVenueCount,
} from './all-clear-facts.js';

describe('CRAWLER_DAILY_CRON_UTC', () => {
  it('matches the crawler-daily cron entry in apps/api/vercel.json', () => {
    const file = fileURLToPath(
      new URL('../../../../../vercel.json', import.meta.url),
    );
    const config = JSON.parse(readFileSync(file, 'utf8')) as {
      crons: { path: string; schedule: string }[];
    };
    const entry = config.crons.find(
      (cron) => cron.path === '/v1/internal/cron/crawler-daily',
    );
    expect(entry?.schedule).toBe(
      `${CRAWLER_DAILY_CRON_UTC.minute} ${CRAWLER_DAILY_CRON_UTC.hour} * * *`,
    );
  });
});

describe('nextCrawlAfter', () => {
  it('is today at the cron time before it, tomorrow after it', () => {
    expect(nextCrawlAfter(new Date('2026-11-13T05:00:00Z')).toISOString()).toBe(
      '2026-11-13T09:07:00.000Z',
    );
    expect(nextCrawlAfter(new Date('2026-11-13T18:00:00Z')).toISOString()).toBe(
      '2026-11-14T09:07:00.000Z',
    );
  });

  it('is strictly after: at the cron instant the next one is tomorrow', () => {
    expect(nextCrawlAfter(new Date('2026-11-13T09:07:00Z')).toISOString()).toBe(
      '2026-11-14T09:07:00.000Z',
    );
  });

  it('rolls over a month end', () => {
    expect(nextCrawlAfter(new Date('2026-11-30T12:00:00Z')).toISOString()).toBe(
      '2026-12-01T09:07:00.000Z',
    );
  });
});

describe('snoozedVenueCount', () => {
  it('counts each venue once however it is held, and ignores other kinds', () => {
    const count = snoozedVenueCount({
      keys: new Set([
        'venue-failing:v1',
        'venue-blocked:v1:evidence',
        'venue-failing:v2',
        'artist:a1',
        'price-check:p1',
      ]),
      notUseful: new Set(['venue-failing:v2', 'venue-blocked:v3', 'bug:v9']),
    });
    expect(count).toBe(3);
  });

  it('is zero with nothing snoozed', () => {
    expect(snoozedVenueCount({ keys: new Set(), notUseful: new Set() })).toBe(
      0,
    );
  });
});

const run = (
  id: string,
  at: string,
  over: Partial<BatchRunInput> = {},
): BatchRunInput => ({
  id,
  venueId: `venue-${id}`,
  venueName: `Venue ${id}`,
  status: 'success',
  reason: null,
  eventsFound: 10,
  eventsInserted: 2,
  durationMs: 30_000,
  llmCostUsd: null,
  errorMessage: null,
  createdAt: new Date(at),
  ...over,
});

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
