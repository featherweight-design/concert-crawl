import { describe, expect, it, vi } from 'vitest';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { updateVenueSchema } from './venues.js';

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

  // The crawl rules are read-only (3b ruling d): any value, even a slower
  // delay or the current one, is refused with the crawl-rules message.
  it.each([
    ['crawlDelayMs', 500],
    ['crawlDelayMs', 3000],
    ['crawlDelayMs', 10000],
    ['crawlDelayMs', null],
    ['robotsTxtAllowed', true],
    ['robotsTxtAllowed', null],
    ['robotsTxtCheckedAt', '2026-11-13T10:00:00.000Z'],
    ['userAgent', 'ConcertCrawl/2.0'],
  ])('refuses %s = %j as fixed by the crawl rules', (key, value) => {
    const result = updateVenueSchema.safeParse({ [key]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([key]);
    expect(result.error?.issues[0]?.message).toMatch(
      /^Fixed by the crawl rules/,
    );
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
