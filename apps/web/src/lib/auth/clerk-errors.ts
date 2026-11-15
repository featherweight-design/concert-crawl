import { isClerkAPIResponseError } from '@clerk/nextjs/errors';

/**
 * Clerk's error codes for the custom auth screens. A 429 answers with codes
 * that must never be read as a refusal, so it yields none.
 */
export function codesOf(error: unknown): string[] {
  if (!error || !isClerkAPIResponseError(error) || error.status === 429) {
    return [];
  }
  return error.errors.map((item) => item.code);
}

export function isRateLimited(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.status === 429;
}

/**
 * A wrong password, an unknown email and a locked account all read the same,
 * so the screen cannot say whether an email has an account (README rule 2).
 * `user_locked` and `strategy_for_user_invalid` only answer emails that do.
 */
export const WRONG_CREDENTIAL_CODES: ReadonlySet<string> = new Set([
  'form_password_incorrect',
  'form_password_or_identifier_incorrect',
  'form_identifier_not_found',
  'user_locked',
  'strategy_for_user_invalid',
]);

/** A password Clerk will not accept as it stands: breached, or untrusted. */
export const REFUSED_PASSWORD_CODES: ReadonlySet<string> = new Set([
  'form_password_pwned',
  'form_password_pwned__sign_in',
  'form_password_compromised',
  'form_password_compromised__sign_in',
  'form_password_untrusted',
  'form_password_untrusted__sign_in',
]);

export type NewPasswordOutcome =
  'breached' | 'weak' | 'tooShort' | 'rateLimited' | 'failed';

/**
 * What a refused new password (reset, and later sign-up) means to the visitor.
 * Breached is read first: Clerk can send it beside a weak code. A 429 and a
 * `captcha_*` code are never a password refusal.
 */
export function classifyNewPasswordError(error: unknown): NewPasswordOutcome {
  if (isRateLimited(error)) return 'rateLimited';
  const codes = codesOf(error);
  if (codes.some((code) => REFUSED_PASSWORD_CODES.has(code))) return 'breached';
  if (codes.includes('form_password_not_strong_enough')) return 'weak';
  if (codes.includes('form_password_length_too_short')) return 'tooShort';
  return 'failed';
}

export type PasswordOutcome = 'wrong' | 'breached' | 'rateLimited' | 'failed';

/**
 * What a failed password sign-in means to the visitor. The breached codes are
 * read first: Clerk can send one alongside a weak-password code. A 429 and a
 * `captcha_*` code are never a refusal; they fall to "failed".
 */
export function classifyPasswordError(error: unknown): PasswordOutcome {
  if (isRateLimited(error)) return 'rateLimited';
  const codes = codesOf(error);
  if (codes.some((code) => REFUSED_PASSWORD_CODES.has(code))) return 'breached';
  if (codes.some((code) => WRONG_CREDENTIAL_CODES.has(code))) return 'wrong';
  return 'failed';
}
