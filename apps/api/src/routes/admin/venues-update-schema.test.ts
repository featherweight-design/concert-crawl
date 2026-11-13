import { describe, expect, it, vi } from 'vitest';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { CRAWLER_USER_AGENT } from '@concert-crawl/types';
import { changedCrawlRule, updateVenueSchema } from './venues.js';

// Zod 4 applies .default() inside .partial(). The update schema must not, or
// a PATCH touching one field would rewrite the venue's city, crawl delay and
// wait strategy to the create defaults.
describe('updateVenueSchema', () => {
  it('adds no defaulted fields to a one-field PATCH', () => {
    expect(updateVenueSchema.parse({ verified: true })).toEqual({
      verified: true,
    });
  });

  it('parses an empty body to an empty object', () => {
    expect(updateVenueSchema.parse({})).toEqual({});
  });

  // The crawl rules are read-only (3b ruling d), but for one release (#404)
  // the schema lets a well-typed crawl-rule key through: the PATCH handler
  // tolerates it when it equals the stored value and refuses it otherwise.
  it.each([
    ['crawlDelayMs', 500],
    ['crawlDelayMs', 3000],
    ['robotsTxtAllowed', true],
    ['robotsTxtAllowed', null],
    ['robotsTxtCheckedAt', '2026-11-13T10:00:00.000Z'],
    ['robotsTxtCheckedAt', '2026-11-13T03:00:00-07:00'],
    ['robotsTxtCheckedAt', null],
    ['userAgent', 'ConcertCrawl/2.0'],
  ])('lets %s = %j through to the handler', (key, value) => {
    expect(updateVenueSchema.parse({ [key]: value })).toEqual({
      [key]: value,
    });
  });

  it.each([
    ['crawlDelayMs', null],
    ['crawlDelayMs', 3000.5],
    ['crawlDelayMs', '3000'],
    ['robotsTxtAllowed', 'yes'],
    ['robotsTxtCheckedAt', 'yesterday'],
    ['userAgent', null],
  ])('refuses a mistyped %s = %j', (key, value) => {
    const result = updateVenueSchema.safeParse({ [key]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([key]);
  });

  it('refuses any key it does not know rather than stripping it', () => {
    const result = updateVenueSchema.safeParse({
      name: 'Gothic',
      crawlPausedAt: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('unrecognized_keys');
  });

  it('accepts every field the Source tab saves', () => {
    expect(
      updateVenueSchema.safeParse({
        websiteUrl: 'https://gothic.example/events',
        extractionStrategy: null,
        platform: 'aeg',
        platformVenueId: '89',
        apiProvider: null,
        apiAccountId: null,
        crawlMode: 'browser',
        crawlWaitUntil: 'load',
        crawlWaitForSelector: '.event-list',
      }).success,
    ).toBe(true);
  });

  it.each(['javascript:alert(1)', 'ftp://gothic.example/events'])(
    'refuses a calendar page of %s',
    (websiteUrl) => {
      expect(updateVenueSchema.safeParse({ websiteUrl }).success).toBe(false);
    },
  );
});

describe('changedCrawlRule', () => {
  const stored = {
    crawlDelayMs: 5000,
    robotsTxtAllowed: false,
    robotsTxtCheckedAt: new Date('2026-11-11T10:00:00Z'),
  };

  it('tolerates a body with no crawl-rule key', () => {
    expect(changedCrawlRule({}, stored)).toBeNull();
  });

  it('tolerates every key sent with its stored value', () => {
    expect(
      changedCrawlRule(
        {
          crawlDelayMs: 5000,
          robotsTxtAllowed: false,
          robotsTxtCheckedAt: '2026-11-11T10:00:00.000Z',
          userAgent: CRAWLER_USER_AGENT,
        },
        stored,
      ),
    ).toBeNull();
  });

  // The old web (#397) sends a legacy row's delay raised to the 3 s floor.
  it('tolerates the floored delay of a legacy row stored under the floor', () => {
    expect(
      changedCrawlRule(
        { crawlDelayMs: 3000 },
        { ...stored, crawlDelayMs: 1000 },
      ),
    ).toBeNull();
    expect(
      changedCrawlRule(
        { crawlDelayMs: 1000 },
        { ...stored, crawlDelayMs: 1000 },
      ),
    ).toBeNull();
  });

  it('refuses any other delay for a legacy row', () => {
    expect(
      changedCrawlRule(
        { crawlDelayMs: 5000 },
        { ...stored, crawlDelayMs: 1000 },
      ),
    ).toBe('crawlDelayMs');
  });

  it('compares the robots check as an instant, not a string', () => {
    expect(
      changedCrawlRule(
        { robotsTxtCheckedAt: '2026-11-11T03:00:00-07:00' },
        stored,
      ),
    ).toBeNull();
  });

  it('tolerates a null robots verdict and check against a never-checked venue', () => {
    expect(
      changedCrawlRule(
        { robotsTxtAllowed: null, robotsTxtCheckedAt: null },
        {
          crawlDelayMs: 3000,
          robotsTxtAllowed: null,
          robotsTxtCheckedAt: null,
        },
      ),
    ).toBeNull();
  });

  it.each([
    [{ crawlDelayMs: 3000 }, 'crawlDelayMs'],
    [{ robotsTxtAllowed: true }, 'robotsTxtAllowed'],
    [{ robotsTxtAllowed: null }, 'robotsTxtAllowed'],
    [{ robotsTxtCheckedAt: '2026-11-11T10:00:01.000Z' }, 'robotsTxtCheckedAt'],
    [{ robotsTxtCheckedAt: null }, 'robotsTxtCheckedAt'],
    [{ userAgent: 'ConcertCrawl/2.0' }, 'userAgent'],
    [{ crawlDelayMs: 5000, userAgent: 'ConcertCrawl/2.0' }, 'userAgent'],
  ])('names the changed key in %j', (sent, key) => {
    expect(changedCrawlRule(sent, stored)).toBe(key);
  });
});
