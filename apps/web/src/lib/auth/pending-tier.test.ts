import { describe, it, expect } from 'vitest';
import { PENDING_TIER_KEYS, decodePendingTier } from './pending-tier';

describe('decodePendingTier (#1284)', () => {
  it.each(PENDING_TIER_KEYS)('accepts the real tier key %s', (key) => {
    expect(decodePendingTier(key)).toBe(key);
  });

  it.each([
    ['unknown key', 'platinum'],
    ['trailing space', 'premium '],
    ['different case', 'Premium'],
    ['a display label', 'Premium supporter'],
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
  ])('returns null for %s rather than a default', (_label, raw) => {
    expect(decodePendingTier(raw)).toBeNull();
  });
});
