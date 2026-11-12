// Invite code shapes, shared by the API (create, validate, redeem) and the web
// code-entry page, so the two can never disagree about what a code looks like.
//
// Two shapes are live. Generated codes are `BETA-XXXX-XXXX`. Custom codes
// (admin redesign 5b, `code-taken-d`: "4 to 20 letters and numbers. Not
// case-sensitive.") are plain letters and numbers, like `REDROCKS`. Every code
// is stored uppercase, and every lookup uppercases first, which is what makes
// a code not case-sensitive.

/** A generated code: `BETA-XXXX-XXXX`. */
export const GENERATED_INVITE_CODE_PATTERN = /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** A custom code: 4 to 20 letters and numbers. */
export const CUSTOM_INVITE_CODE_PATTERN = /^[A-Z0-9]{4,20}$/;

export const CUSTOM_INVITE_CODE_MIN_LENGTH = 4;
export const CUSTOM_INVITE_CODE_MAX_LENGTH = 20;

/**
 * A custom code may not start with `BETA`. The entry field formats anything
 * typed after `BETA` into the generated shape (`BETAMAX` becomes `BETA-MAX`),
 * so a custom code starting that way could never be typed in.
 */
export const RESERVED_INVITE_CODE_PREFIX = 'BETA';

/** Uppercased and trimmed: the stored form and the lookup key. */
export const normalizeInviteCode = (raw: string): string =>
  raw.trim().toUpperCase();

/** Whether a normalized value is a whole code of either shape. */
export const isInviteCodeShape = (code: string): boolean =>
  GENERATED_INVITE_CODE_PATTERN.test(code) ||
  (CUSTOM_INVITE_CODE_PATTERN.test(code) &&
    !code.startsWith(RESERVED_INVITE_CODE_PREFIX));

/** Whether a normalized value is an allowed custom code. */
export const isCustomInviteCode = (code: string): boolean =>
  CUSTOM_INVITE_CODE_PATTERN.test(code) &&
  !code.startsWith(RESERVED_INVITE_CODE_PREFIX);
