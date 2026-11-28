import { describe, expect, it } from 'vitest';
import {
  needsOnboarding,
  ONBOARDING_REQUIRED_SINCE,
} from './onboarding-required';

const AT_CUTOFF = ONBOARDING_REQUIRED_SINCE;

describe('needsOnboarding', () => {
  it('owes the tour from the cutoff instant on, until stamped', () => {
    expect(needsOnboarding({ created_at: AT_CUTOFF })).toBe(true);
    expect(needsOnboarding({ created_at: AT_CUTOFF, metadata: {} })).toBe(true);
    expect(
      needsOnboarding({
        created_at: AT_CUTOFF,
        metadata: { onboardedAt: '2026-11-28T00:01:00.000Z' },
      }),
    ).toBe(false);
  });

  it('never owes it for an account made before the cutoff', () => {
    expect(needsOnboarding({ created_at: AT_CUTOFF - 1 })).toBe(false);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['no created_at', { metadata: {} }],
    ['created_at in seconds as a string', { created_at: '1764288000' }],
    ['created_at NaN', { created_at: Number.NaN }],
    ['metadata not an object', { created_at: AT_CUTOFF, metadata: 'x' }],
  ])('fails open (no force) on %s', (_label, claims) => {
    expect(needsOnboarding(claims)).toBe(false);
  });
});
