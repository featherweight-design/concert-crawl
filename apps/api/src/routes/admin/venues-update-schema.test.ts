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

  it('still validates a supplied crawl delay', () => {
    expect(updateVenueSchema.safeParse({ crawlDelayMs: 500 }).success).toBe(
      false,
    );
    expect(updateVenueSchema.parse({ crawlDelayMs: 10000 })).toEqual({
      crawlDelayMs: 10000,
    });
  });
});
