import { describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/errors', () => ({
  isClerkAPIResponseError: (err: unknown) =>
    Boolean(err && typeof err === 'object' && 'errors' in err),
}));

import { classifyCodeError } from './clerk-errors';

const clerkError = (status: number, ...codes: string[]) => ({
  status,
  errors: codes.map((code) => ({ code })),
});

describe('classifyCodeError', () => {
  it.each([
    [429, ['form_code_incorrect'], 'rateLimited'],
    [422, ['verification_expired'], 'expired'],
    [422, ['form_code_incorrect'], 'wrong'],
    [422, ['form_code_invalid'], 'wrong'],
    [422, ['verification_failed'], 'wrong'],
    [400, ['captcha_invalid'], 'failed'],
    [500, ['something_else'], 'failed'],
  ])('reads a %i with %j as %s', (status, codes, expected) => {
    expect(classifyCodeError(clerkError(status, ...codes))).toBe(expected);
  });

  it('reads a non-Clerk error as failed', () => {
    expect(classifyCodeError(new Error('network'))).toBe('failed');
  });
});
