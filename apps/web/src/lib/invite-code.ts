/**
 * The beta invite code: `BETA-XXXX-XXXX`, uppercase letters and digits. The
 * server action and the API check the same shape; this is the client's copy.
 */
export const INVITE_CODE_PATTERN = /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** `BETA-XXXX-XXXX`, dashes included. */
export const INVITE_CODE_LENGTH = 14;

/** Whether a field value is a whole code, ready to redeem. */
export const isCompleteInviteCode = (value: string): boolean =>
  INVITE_CODE_PATTERN.test(value);

/**
 * Formats what a visitor types (or a poster QR pre-fills) toward the code
 * shape: uppercased, stripped to letters, digits and dashes, with `BETA-` and
 * the middle dash put in for them.
 */
export function formatInviteCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!clean.startsWith('BETA-')) {
    if ('BETA-'.startsWith(clean)) return clean;
    // A pasted code with no dashes still gets both: the prefix dash here,
    // the middle one by the branch below.
    if (clean.startsWith('BETA'))
      return formatInviteCodeInput(`BETA-${clean.slice(4)}`);
    // Never longer than a whole code, whatever is pasted or linked.
    return clean.slice(0, INVITE_CODE_LENGTH);
  }
  const rest = clean.slice(5).replace(/-/g, '');
  if (rest.length <= 4) return `BETA-${rest}`;
  return `BETA-${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
}
