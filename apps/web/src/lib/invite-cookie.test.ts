import { createHmac } from 'crypto'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  signInviteCookie,
  verifyInviteCookie,
  INVITE_COOKIE_MAX_AGE,
} from './invite-cookie.js'

vi.mock('server-only', () => ({}))

const SECRET = 'test-secret-32-bytes-minimum-len'
const CODE = 'BETA-AB12-CD34'

afterEach(() => vi.restoreAllMocks())

function buildToken(payload: object): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${sig}`
}

describe('signInviteCookie', () => {
  it('returns a base64url payload.signature string', () => {
    const token = signInviteCookie(CODE, SECRET)
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  })

  it('encodes the code in the payload', () => {
    const token = signInviteCookie(CODE, SECRET)
    const payloadB64 = token.split('.')[0]!
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    expect(payload.code).toBe(CODE)
  })
})

describe('verifyInviteCookie', () => {
  it('returns the code for a valid token', () => {
    const token = signInviteCookie(CODE, SECRET)
    expect(verifyInviteCookie(token, SECRET)).toEqual({ code: CODE })
  })

  it('returns null when the signature is tampered', () => {
    const token = signInviteCookie(CODE, SECRET)
    const tampered = token.slice(0, -4) + 'xxxx'
    expect(verifyInviteCookie(tampered, SECRET)).toBeNull()
  })

  it('returns null when signed with a different secret', () => {
    const token = signInviteCookie(CODE, SECRET)
    expect(verifyInviteCookie(token, 'wrong-secret')).toBeNull()
  })

  it('returns null for a token with no dot separator', () => {
    expect(verifyInviteCookie('nodothere', SECRET)).toBeNull()
  })

  it('returns null when the token is expired', () => {
    const iat = Math.floor(Date.now() / 1000) - INVITE_COOKIE_MAX_AGE - 1
    expect(
      verifyInviteCookie(buildToken({ code: CODE, iat }), SECRET),
    ).toBeNull()
  })

  it('returns null when iat is in the future', () => {
    const iat = Math.floor(Date.now() / 1000) + 3600
    expect(
      verifyInviteCookie(buildToken({ code: CODE, iat }), SECRET),
    ).toBeNull()
  })

  it('returns null when iat is not a number', () => {
    expect(
      verifyInviteCookie(
        buildToken({ code: CODE, iat: 'not-a-number' }),
        SECRET,
      ),
    ).toBeNull()
  })

  it('returns null when code is missing', () => {
    const iat = Math.floor(Date.now() / 1000)
    expect(verifyInviteCookie(buildToken({ iat }), SECRET)).toBeNull()
  })

  it('returns null for malformed JSON payload', () => {
    const payloadB64 = Buffer.from('not-json').toString('base64url')
    const sig = createHmac('sha256', SECRET)
      .update(payloadB64)
      .digest('base64url')
    expect(verifyInviteCookie(`${payloadB64}.${sig}`, SECRET)).toBeNull()
  })
})
