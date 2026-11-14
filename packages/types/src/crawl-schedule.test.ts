import { describe, expect, it } from 'vitest';
import { scheduledCrawlAt } from './crawl-schedule.js';

const denverTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(/ /g, ' ');

describe('scheduledCrawlAt', () => {
  it('is 2:07 AM MST on a winter night, on that date', () => {
    expect(scheduledCrawlAt('2026-11-08')).toBe('2026-11-08T09:07:00.000Z');
    expect(denverTime(scheduledCrawlAt('2026-11-08'))).toBe('Nov 8, 2:07 AM');
  });

  it('is 3:07 AM MDT on a summer night, on that date', () => {
    expect(denverTime(scheduledCrawlAt('2026-07-04'))).toBe('Jul 4, 3:07 AM');
  });
});
