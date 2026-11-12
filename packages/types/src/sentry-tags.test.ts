import { describe, it, expect } from 'vitest';
import {
  SENTRY_APP_TAG,
  SENTRY_INITIAL_SCOPE,
  sentryTier,
  sentryUserHash,
} from './sentry-tags.js';

describe('SENTRY_INITIAL_SCOPE', () => {
  it('puts the app tag on every event', () => {
    expect(SENTRY_INITIAL_SCOPE.tags).toEqual({ app: SENTRY_APP_TAG });
  });
});

describe('sentryUserHash', () => {
  it('is 16 hex chars and stable for the same user and key', async () => {
    const first = await sentryUserHash('user_1', 'key');
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(await sentryUserHash('user_1', 'key')).toBe(first);
  });

  it('differs by user and by key, and never contains the id', async () => {
    const base = await sentryUserHash('user_1', 'key');
    expect(await sentryUserHash('user_2', 'key')).not.toBe(base);
    expect(await sentryUserHash('user_1', 'other')).not.toBe(base);
    expect(base).not.toContain('user_1');
  });

  it('is undefined with no key, a blank key, or no user', async () => {
    expect(await sentryUserHash('user_1', undefined)).toBeUndefined();
    expect(await sentryUserHash('user_1', '   ')).toBeUndefined();
    expect(await sentryUserHash(null, 'key')).toBeUndefined();
    expect(await sentryUserHash(undefined, 'key')).toBeUndefined();
  });
});

describe('sentryTier', () => {
  it('reads metadata.plan, lowercased', () => {
    expect(sentryTier({ metadata: { plan: 'Supporter' } })).toBe('supporter');
  });

  it.each([
    undefined,
    null,
    'text',
    {},
    { metadata: null },
    { metadata: { plan: 5 } },
    { metadata: { plan: 'free text with spaces' } },
    { metadata: { plan: 'x'.repeat(40) } },
  ])('reads %j as unknown', (claims) => {
    expect(sentryTier(claims)).toBe('unknown');
  });
});
