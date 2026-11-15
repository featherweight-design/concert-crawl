import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/errors', () => ({
  isClerkAPIResponseError: (err: unknown) =>
    Boolean(err && typeof err === 'object' && 'errors' in err),
}));

import { classifySignUpError } from './clerk-errors';

const clerkError = (status: number, ...codes: string[]) => ({
  status,
  errors: codes.map((code) => ({ code })),
});

describe('classifySignUpError', () => {
  it.each([
    [429, ['form_password_pwned'], 'rateLimited'],
    [
      422,
      ['form_password_not_strong_enough', 'form_password_pwned'],
      'breached',
    ],
    [422, ['form_password_pwned'], 'breached'],
    [422, ['form_password_not_strong_enough'], 'weak'],
    [422, ['form_password_length_too_short'], 'tooShort'],
    [422, ['form_identifier_exists'], 'taken'],
    [422, ['form_param_format_invalid'], 'email'],
    [422, ['form_param_nil'], 'email'],
    [422, ['legal_accepted_required'], 'legal'],
    [400, ['captcha_invalid'], 'captcha'],
    [400, ['captcha_unavailable'], 'captcha'],
    [500, ['something_else'], 'failed'],
  ])('reads a %i with %j as %s', (status, codes, expected) => {
    expect(classifySignUpError(clerkError(status, ...codes))).toBe(expected);
  });

  it('reads a non-Clerk error as failed', () => {
    expect(classifySignUpError(new Error('network'))).toBe('failed');
    expect(classifySignUpError(null)).toBe('failed');
  });

  it('never reads a sign-in-only "untrusted" code as a breach', () => {
    expect(
      classifySignUpError(clerkError(422, 'form_password_untrusted__sign_in')),
    ).toBe('failed');
  });
});
