import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CRAWLER_DAILY_CRON_UTC,
  nextCrawlAfter,
  nextDailyCrawlAt,
} from './crawl-schedule.js';

describe('CRAWLER_DAILY_CRON_UTC', () => {
  it('matches the crawler-daily cron entry in apps/api/vercel.json', () => {
    const file = fileURLToPath(new URL('../../vercel.json', import.meta.url));
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

describe('nextDailyCrawlAt', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const now = new Date('2026-11-13T05:00:00Z');

  it('names the next cron run in production', () => {
    vi.stubEnv('VERCEL_TARGET_ENV', 'production');
    expect(nextDailyCrawlAt(now)).toBe('2026-11-13T09:07:00.000Z');
  });

  it.each(['staging', 'preview', ''])(
    'names none where no daily crawl runs (%j)',
    (environment) => {
      vi.stubEnv('VERCEL_TARGET_ENV', environment);
      expect(nextDailyCrawlAt(now)).toBeNull();
    },
  );
});
