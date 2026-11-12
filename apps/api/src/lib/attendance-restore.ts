// Short-lived proof that a caller just removed THIS attendance, so the Undo
// toast can put back exactly that value and nothing else.
//
// Token = `${exp}.${base64url(HMAC-SHA256(key, userId|eventId|attendingAt|exp))}`.
// The key is itself an HMAC of INTERNAL_API_SECRET under a fixed label, so no
// new env var is needed and a token can never be replayed as some other signed
// artifact. With the secret unset, signing returns null and the client shows
// no Undo: it fails closed.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const RESTORE_TTL_MS = 60_000;

const KEY_LABEL = 'attendance-restore:v1';

const deriveKey = (): Buffer | null => {
  const secret = process.env['INTERNAL_API_SECRET'];
  if (secret === undefined || secret.length === 0) return null;
  return createHmac('sha256', secret).update(KEY_LABEL).digest();
};

interface RestoreClaim {
  userId: string;
  eventId: string;
  attendingAt: string;
}

const mac = (key: Buffer, claim: RestoreClaim, exp: number): string =>
  createHmac('sha256', key)
    .update(
      `${claim.userId}|${claim.eventId}|${claim.attendingAt}|${String(exp)}`,
    )
    .digest('base64url');

export const signRestoreToken = (
  claim: RestoreClaim & { now?: number },
): string | null => {
  const key = deriveKey();
  if (key === null) return null;
  const exp = (claim.now ?? Date.now()) + RESTORE_TTL_MS;
  return `${String(exp)}.${mac(key, claim, exp)}`;
};

export const verifyRestoreToken = (
  claim: RestoreClaim & { token: string; now?: number },
): boolean => {
  const key = deriveKey();
  if (key === null) return false;
  const [expPart, sig, ...rest] = claim.token.split('.');
  if (expPart === undefined || sig === undefined || rest.length > 0) {
    return false;
  }
  if (!/^\d{1,16}$/.test(expPart)) return false;
  const exp = Number(expPart);
  if ((claim.now ?? Date.now()) > exp) return false;
  const expected = Buffer.from(mac(key, claim, exp));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
};
