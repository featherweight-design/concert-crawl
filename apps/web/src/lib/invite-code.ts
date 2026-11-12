import {
  CUSTOM_INVITE_CODE_MAX_LENGTH,
  CUSTOM_INVITE_CODE_MIN_LENGTH,
  RESERVED_INVITE_CODE_PREFIX,
  isInviteCodeShape,
} from '@concert-crawl/types';

/** `BETA-XXXX-XXXX`, dashes included. */
const GENERATED_INVITE_CODE_LENGTH = 14;

/**
 * How many characters an incomplete code still needs, for the hint under the
 * field. A value heading for the generated shape counts toward its 14; any
 * other value is a custom code short of its minimum of 4. (`B`, `BE` and `BET`
 * could be either, and count toward the shorter goal.)
 */
export const charactersRemaining = (value: string): number =>
  value.startsWith(RESERVED_INVITE_CODE_PREFIX)
    ? GENERATED_INVITE_CODE_LENGTH - value.length
    : Math.max(CUSTOM_INVITE_CODE_MIN_LENGTH - value.length, 0);

/**
 * An invite code is either generated, `BETA-XXXX-XXXX`, or custom: 4 to 20
 * letters and numbers, like `REDROCKS`. The shapes live in
 * `@concert-crawl/types`, so this client, the server action and the API all
 * check the same thing.
 */

/** Whether a field value is a whole code, ready to redeem. */
export const isCompleteInviteCode = (value: string): boolean =>
  isInviteCodeShape(value);

/**
 * Formats what a visitor types (or a poster QR pre-fills) toward a code shape:
 * uppercased and stripped to letters, digits and dashes. Anything that starts
 * like a generated code gets `BETA-` and the middle dash put in for it, as
 * before. Anything else is a custom code: letters and numbers only, never
 * longer than the longest one. Custom codes can't start with `BETA`, so the
 * two never collide.
 */
export function formatInviteCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!clean.startsWith('BETA-')) {
    if ('BETA-'.startsWith(clean)) return clean;
    // A pasted code with no dashes still gets both: the prefix dash here,
    // the middle one by the branch below.
    if (clean.startsWith('BETA'))
      return formatInviteCodeInput(`BETA-${clean.slice(4)}`);
    return clean.replace(/-/g, '').slice(0, CUSTOM_INVITE_CODE_MAX_LENGTH);
  }
  const rest = clean.slice(5).replace(/-/g, '');
  if (rest.length <= 4) return `BETA-${rest}`;
  return `BETA-${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
}
