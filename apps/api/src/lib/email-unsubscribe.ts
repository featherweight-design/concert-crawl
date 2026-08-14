// One-click per-family email unsubscribe tokens (#763 spec §8.2).
//
// Token = HMAC-SHA256(EMAIL_UNSUBSCRIBE_SECRET, `${uid}:${family}`), hex.
// The digest email footer links to
//   GET /v1/email/unsubscribe?uid=<userId>&family=digest&token=<hmac>
// which recomputes the HMAC server-side and compares with timingSafeEqual —
// no auth required (email links must work logged-out). Rotating the secret
// invalidates all previously issued links, which is the intended kill switch.

import { createHmac, timingSafeEqual } from 'node:crypto'

// Families with a signed one-click unsubscribe.
//
// 'billing' is deliberately absent. Receipts, dunning, card-expiring, and
// cancellation notices are transactional messages about an existing payment
// relationship: CAN-SPAM exempts them, and suppressing a dunning notice would
// cause the silent involuntary churn it was written to prevent. A user who
// wants no billing mail cancels the subscription, which stops it at source.
//
// 'product' IS here because winback.ts is a commercial message whose primary
// purpose is selling a subscription. That needs a working opt-out regardless
// of the relationship, and gifting-ending-notice and welcome-gifted share the
// family.
export const UNSUBSCRIBE_FAMILIES = ['digest', 'product'] as const
export type UnsubscribeFamily = (typeof UNSUBSCRIBE_FAMILIES)[number]

const getSecret = (): string | undefined => {
  const secret = process.env['EMAIL_UNSUBSCRIBE_SECRET']
  return secret !== undefined && secret.length > 0 ? secret : undefined
}

// True when a non-empty EMAIL_UNSUBSCRIBE_SECRET is set. Empty string counts
// as unconfigured (common dashboard misconfig) so the route can 503 instead
// of a misleading 400.
export const isUnsubscribeConfigured = (): boolean => getSecret() !== undefined

// Public origin of THIS API service (the unsubscribe route lives on the API,
// not the web app). Set per environment, e.g.
// https://concert-crawl-api.onrender.com — defaults to local dev. Trailing
// slashes / whitespace (common dashboard copy-paste artifacts) are stripped
// so links never render with a double slash.
const apiPublicUrl = (): string =>
  (process.env['API_PUBLIC_URL'] ?? 'http://localhost:3001')
    .trim()
    .replace(/\/+$/, '')

export const buildUnsubscribeToken = (
  userId: string,
  family: UnsubscribeFamily,
): string | undefined => {
  const secret = getSecret()
  if (secret === undefined) return undefined
  return createHmac('sha256', secret)
    .update(`${userId}:${family}`)
    .digest('hex')
}

export const buildUnsubscribeUrl = (
  userId: string,
  family: UnsubscribeFamily,
): string | undefined => {
  const token = buildUnsubscribeToken(userId, family)
  if (token === undefined) return undefined
  return `${apiPublicUrl()}/v1/email/unsubscribe?uid=${encodeURIComponent(userId)}&family=${family}&token=${token}`
}

export const verifyUnsubscribeToken = (
  userId: string,
  family: UnsubscribeFamily,
  token: string,
): boolean => {
  const expected = buildUnsubscribeToken(userId, family)
  if (expected === undefined) return false
  const expectedBuf = Buffer.from(expected, 'hex')
  const providedBuf = Buffer.from(token, 'hex')
  // Length mismatch (malformed / truncated hex) can't be compared in constant
  // time; the token length is public knowledge so this early return leaks
  // nothing secret.
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}
