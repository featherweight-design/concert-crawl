import { describe, it, expect } from 'vitest';
import { crawlAllSkipReason, type CrawlAllVenue } from './crawl-all.js';

const venue = (over: Partial<CrawlAllVenue> = {}): CrawlAllVenue => ({
  active: true,
  verified: true,
  blockedAt: null,
  crawlPausedAt: null,
  ...over,
});

describe('crawlAllSkipReason', () => {
  it('takes an active, verified venue that is neither blocked nor paused', () => {
    expect(crawlAllSkipReason(venue())).toBeNull();
  });

  it('names one reason, in order: blocked, paused, hidden, unverified', () => {
    const at = new Date();
    expect(
      crawlAllSkipReason(
        venue({
          blockedAt: at,
          crawlPausedAt: at,
          active: false,
          verified: false,
        }),
      ),
    ).toBe('blocked');
    expect(
      crawlAllSkipReason(
        venue({ crawlPausedAt: at, active: false, verified: false }),
      ),
    ).toBe('paused');
    expect(crawlAllSkipReason(venue({ active: false, verified: false }))).toBe(
      'hidden',
    );
    expect(crawlAllSkipReason(venue({ verified: false }))).toBe('unverified');
  });
});
