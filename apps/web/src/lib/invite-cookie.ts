// Server-only — uses Node.js crypto. Do not import in middleware.ts (Edge Runtime).
import { createHmac, timingSafeEqual } from 'crypto'

export const INVITE_COOKIE_NAME = 'invite_verified'
export const INVITE_COOKIE_MAX_AGE = 3600 // 1 hour in seconds

export function signInviteCookie(code: string, secret: string): string {
  const iat = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ code, iat })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyInviteCookie(
  value: string,
  secret: string,
): { code: string } | null {
  try {
    const dotIdx = value.lastIndexOf('.')
    if (dotIdx === -1) return null

    const payloadB64 = value.slice(0, dotIdx)
    const sigB64 = value.slice(dotIdx + 1)

    const expectedSig = createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url')
    const sigBuf = Buffer.from(sigB64, 'base64url')
    const expectedBuf = Buffer.from(expectedSig, 'base64url')

    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString()
    const payload = JSON.parse(payloadStr) as { code: string; iat: number }

    const now = Math.floor(Date.now() / 1000)
    if (now - payload.iat > INVITE_COOKIE_MAX_AGE) return null

    return { code: payload.code }
  } catch {
    return null
  }
}
