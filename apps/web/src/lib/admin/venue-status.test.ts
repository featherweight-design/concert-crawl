import { describe, it, expect } from 'vitest';
import { deriveVenueStatusChips } from './venue-status';

const base = {
  active: true,
  crawlPausedAt: null,
  blockedAt: null,
  consecutiveFailures: 0,
  robotsTxtAllowed: true,
};
const AT = '2026-11-10T10:00:00Z';

describe('deriveVenueStatusChips', () => {
  it.each([
    ['a live, crawling venue', {}, 'live', 'crawling'],
    ['a hidden venue still crawling', { active: false }, 'hidden', 'crawling'],
    ['paused by hand', { crawlPausedAt: AT }, 'live', 'paused'],
    [
      'auto-paused after 3 failures',
      { crawlPausedAt: AT, consecutiveFailures: 3 },
      'live',
      'auto_paused',
    ],
    [
      'paused with 2 failures is still a hand pause',
      { crawlPausedAt: AT, consecutiveFailures: 2 },
      'live',
      'paused',
    ],
    ['blocked by a 403 or 429', { blockedAt: AT }, 'live', 'blocked'],
    [
      'paused and blocked: blocked wins',
      { crawlPausedAt: AT, blockedAt: AT, consecutiveFailures: 3 },
      'live',
      'blocked',
    ],
    [
      'robots.txt disallows',
      { robotsTxtAllowed: false },
      'live',
      'robots_disallowed',
    ],
    [
      'robots.txt not checked yet reads as crawling',
      { robotsTxtAllowed: null },
      'live',
      'crawling',
    ],
    [
      'hidden and paused keeps both axes',
      { active: false, crawlPausedAt: AT },
      'hidden',
      'paused',
    ],
    [
      'failures without a pause are still crawling',
      { consecutiveFailures: 2 },
      'live',
      'crawling',
    ],
  ] as const)('%s', (_name, overrides, onSite, crawling) => {
    expect(deriveVenueStatusChips({ ...base, ...overrides })).toEqual({
      onSite,
      crawling,
    });
  });
});
