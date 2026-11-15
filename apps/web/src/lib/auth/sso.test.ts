import { describe, expect, expectTypeOf, it } from 'vitest';
import type { useClerk } from '@clerk/nextjs';
import {
  decideCallback,
  parseGoogleNotice,
  ssoCallbackUrl,
  type CallbackState,
} from './sso';

const base: CallbackState = {
  signInStatus: null,
  transferable: false,
  signUpStatus: null,
  signUpMissing: [],
};

describe('ssoCallbackUrl', () => {
  it('carries the return path under /sign-in', () => {
    expect(ssoCallbackUrl('/e/abc?x=1')).toBe(
      '/sign-in/sso-callback?redirect_url=%2Fe%2Fabc%3Fx%3D1',
    );
  });
});

describe('parseGoogleNotice', () => {
  it.each([
    ['cancelled', 'cancelled'],
    ['refused', 'refused'],
    ['failed', 'failed'],
    [['refused', 'x'], 'refused'],
    ['code', null],
    [undefined, null],
    ['', null],
  ])('reads %j as %j', (value, expected) => {
    expect(parseGoogleNotice(value)).toBe(expected);
  });
});

describe('decideCallback', () => {
  it.each<[string, Partial<CallbackState>, string]>([
    ['a finished sign-in', { signInStatus: 'complete' }, 'signedIn'],
    ['a finished sign-up', { signUpStatus: 'complete' }, 'signedUp'],
    [
      'a sign-up still missing the legal box',
      {
        signUpStatus: 'missing_requirements',
        signUpMissing: ['legal_accepted'],
      },
      'consent',
    ],
    [
      'a Google account with no account here',
      { signInStatus: 'needs_identifier', transferable: true },
      'refused',
    ],
    [
      'a transferable sign-in is never carried into a sign-up',
      {
        signInStatus: 'needs_first_factor',
        transferable: true,
        signUpStatus: null,
      },
      'refused',
    ],
    ['a second factor', { signInStatus: 'needs_second_factor' }, 'failed'],
    ['a device check', { signInStatus: 'needs_client_trust' }, 'failed'],
    [
      'an unresolved bot check',
      { signInStatus: 'needs_protect_check' },
      'failed',
    ],
    [
      'a sign-up missing something else',
      { signUpStatus: 'missing_requirements', signUpMissing: ['phone_number'] },
      'failed',
    ],
    ['nothing at all (cancelled at Google)', {}, 'cancelled'],
    [
      'a sign-in that went back to the first factor',
      { signInStatus: 'needs_first_factor' },
      'cancelled',
    ],
  ])('reads %s as %s', (_name, patch, expected) => {
    expect(decideCallback({ ...base, ...patch })).toBe(expected);
  });
});

describe('the Clerk bump guard', () => {
  // The callback resolves a pending bot check itself instead of rendering
  // <HandleSSOCallback />. If a Clerk upgrade drops the internal function,
  // this line stops compiling, and the build says so before a visitor does.
  it('still declares the internal protect-check resolver', () => {
    expectTypeOf<ReturnType<typeof useClerk>>().toHaveProperty(
      '__internal_resolvePendingProtectCheck',
    );
    expect(true).toBe(true);
  });
});
