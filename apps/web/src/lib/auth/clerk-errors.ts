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

/**
 * The codes that mean a NEW password has appeared in a breach. The sign-in
 * set above also holds the `__sign_in` and `untrusted` variants, which are not
 * the same claim here, so they are not reused.
 */
export const BREACHED_NEW_PASSWORD_CODES: ReadonlySet<string> = new Set([
  'form_password_pwned',
  'form_password_compromised',
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
  if (codes.some((code) => BREACHED_NEW_PASSWORD_CODES.has(code))) {
    return 'breached';
  }
  if (codes.includes('form_password_not_strong_enough')) return 'weak';
  if (codes.includes('form_password_length_too_short')) return 'tooShort';
  return 'failed';
}

export type SignUpOutcome =
  | 'taken'
  | 'breached'
  | 'weak'
  | 'tooShort'
  | 'email'
  | 'legal'
  | 'rateLimited'
  | 'captcha'
  | 'failed';

/**
 * What a refused sign-up means to the visitor. First match wins. A 429 comes
 * first (its codes must not read as refusals); a breached password before a
 * weak one (Clerk can send both). A taken email is not an error to show: the
 * screen goes on to the same Verify as any address, so it never says whether
 * an account exists.
 */
export function classifySignUpError(error: unknown): SignUpOutcome {
  if (isRateLimited(error)) return 'rateLimited';
  const codes = codesOf(error);
  if (codes.some((code) => BREACHED_NEW_PASSWORD_CODES.has(code))) {
    return 'breached';
  }
  if (codes.includes('form_password_not_strong_enough')) return 'weak';
  if (codes.includes('form_password_length_too_short')) return 'tooShort';
  if (codes.includes('form_identifier_exists')) return 'taken';
  if (codes.some((code) => code.includes('legal_accepted'))) return 'legal';
  if (
    codes.includes('form_param_format_invalid') ||
    codes.includes('form_param_nil')
  ) {
    return 'email';
  }
  if (codes.some((code) => code.startsWith('captcha_'))) return 'captcha';
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
