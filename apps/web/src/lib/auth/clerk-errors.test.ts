import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/errors', () => ({
  isClerkAPIResponseError: (err: unknown) =>
    Boolean(err && typeof err === 'object' && 'errors' in err),
}));

import {
  classifyNewPasswordError,
  classifyPasswordError,
  codesOf,
  REFUSED_PASSWORD_CODES,
  WRONG_CREDENTIAL_CODES,
} from './clerk-errors';

const clerkError = (status: number, ...codes: string[]) => ({
  status,
  errors: codes.map((code) => ({ code })),
});

describe('codesOf', () => {
  it('returns no codes for a 429, a non-Clerk error, and null', () => {
    expect(codesOf(clerkError(429, 'too_many_requests'))).toEqual([]);
    expect(codesOf(new Error('network'))).toEqual([]);
    expect(codesOf(null)).toEqual([]);
  });

  it('returns the codes of a Clerk error', () => {
    expect(codesOf(clerkError(422, 'a', 'b'))).toEqual(['a', 'b']);
  });
});

describe('the code sets', () => {
  it('pins the wrong-credential set, so a drive-by edit fails here', () => {
    expect([...WRONG_CREDENTIAL_CODES].sort()).toEqual([
      'form_identifier_not_found',
      'form_password_incorrect',
      'form_password_or_identifier_incorrect',
      'strategy_for_user_invalid',
      'user_locked',
    ]);
  });

  it('pins the refused-password set', () => {
    expect([...REFUSED_PASSWORD_CODES].sort()).toEqual([
      'form_password_compromised',
      'form_password_compromised__sign_in',
      'form_password_pwned',
      'form_password_pwned__sign_in',
      'form_password_untrusted',
      'form_password_untrusted__sign_in',
    ]);
  });
});

describe('classifyPasswordError', () => {
  it.each([
    'form_password_incorrect',
    'form_identifier_not_found',
    'user_locked',
    'strategy_for_user_invalid',
  ])('reads %s as a wrong credential, the same line for every one', (code) => {
    expect(classifyPasswordError(clerkError(422, code))).toBe('wrong');
  });

  it('reads a breached password as breached, even beside a weak code', () => {
    expect(
      classifyPasswordError(
        clerkError(
          422,
          'form_password_not_strong_enough',
          'form_password_pwned',
        ),
      ),
    ).toBe('breached');
  });

  it('never reads a 429 or a captcha code as a refusal', () => {
    expect(
      classifyPasswordError(clerkError(429, 'form_password_incorrect')),
    ).toBe('rateLimited');
    expect(classifyPasswordError(clerkError(400, 'captcha_invalid'))).toBe(
      'failed',
    );
    expect(classifyPasswordError(new Error('boom'))).toBe('failed');
  });
});

describe('classifyNewPasswordError', () => {
  it('reads breached before weak, then weak, then too short', () => {
    expect(
      classifyNewPasswordError(
        clerkError(
          422,
          'form_password_not_strong_enough',
          'form_password_pwned',
        ),
      ),
    ).toBe('breached');
    expect(
      classifyNewPasswordError(
        clerkError(422, 'form_password_not_strong_enough'),
      ),
    ).toBe('weak');
    expect(
      classifyNewPasswordError(
        clerkError(422, 'form_password_length_too_short'),
      ),
    ).toBe('tooShort');
  });

  it('never reads a 429, a captcha code or a non-Clerk error as a password refusal', () => {
    expect(
      classifyNewPasswordError(
        clerkError(429, 'form_password_not_strong_enough'),
      ),
    ).toBe('rateLimited');
    expect(classifyNewPasswordError(clerkError(400, 'captcha_invalid'))).toBe(
      'failed',
    );
    expect(classifyNewPasswordError(new Error('boom'))).toBe('failed');
    // The sign-in "untrusted" variant is not a breach claim about a new password.
    expect(
      classifyNewPasswordError(
        clerkError(422, 'form_password_untrusted__sign_in'),
      ),
    ).toBe('failed');
  });
});
