import { describe, expect, it } from 'vitest';
import {
  needsOnboarding,
  ONBOARDING_REQUIRED_SINCE,
} from './onboarding-required';

const AT_CUTOFF = ONBOARDING_REQUIRED_SINCE;
const USER = 'user_new';
const owes = (claims: unknown, cookie?: string) =>
  needsOnboarding(claims, USER, cookie);

describe('needsOnboarding', () => {
  it('owes the tour from the cutoff instant on, until stamped', () => {
    expect(owes({ created_at: AT_CUTOFF })).toBe(true);
    expect(owes({ created_at: AT_CUTOFF, metadata: {} })).toBe(true);
    expect(
      owes({
        created_at: AT_CUTOFF,
        metadata: { onboardedAt: '2026-11-28T00:01:00.000Z' },
      }),
    ).toBe(false);
  });

  it('never owes it for an account made before the cutoff', () => {
    expect(owes({ created_at: AT_CUTOFF - 1 })).toBe(false);
  });

  it('reads a created_at in seconds the same as in ms', () => {
    expect(owes({ created_at: AT_CUTOFF / 1000 })).toBe(true);
    expect(owes({ created_at: AT_CUTOFF / 1000 - 1 })).toBe(false);
  });

  it('lets this browser through once the tour set its cookie for this user', () => {
    expect(owes({ created_at: AT_CUTOFF }, USER)).toBe(false);
  });

  it('still owes it when the cookie names another account', () => {
    expect(owes({ created_at: AT_CUTOFF }, 'user_someone_else')).toBe(true);
    expect(owes({ created_at: AT_CUTOFF }, '')).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['no created_at', { metadata: {} }],
    ['created_at as a string', { created_at: '1764288000' }],
    ['created_at NaN', { created_at: Number.NaN }],
    ['metadata not an object', { created_at: AT_CUTOFF, metadata: 'x' }],
  ])('fails open (no force) on %s', (_label, claims) => {
    expect(owes(claims)).toBe(false);
  });
});
