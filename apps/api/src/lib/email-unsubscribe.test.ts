// Unit tests for the one-click unsubscribe token HMAC (#763 spec §8.2, §12).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  buildUnsubscribeToken,
  buildUnsubscribeUrl,
  verifyUnsubscribeToken,
} from './email-unsubscribe.js'

const SECRET = 'test-unsubscribe-secret'

describe('email unsubscribe token', () => {
  beforeEach(() => {
    process.env['EMAIL_UNSUBSCRIBE_SECRET'] = SECRET
  })

  afterEach(() => {
    delete process.env['EMAIL_UNSUBSCRIBE_SECRET']
    delete process.env['API_PUBLIC_URL']
  })

  it('builds HMAC-SHA256(secret, uid + ":" + family) hex per spec §8.2', () => {
    const expected = createHmac('sha256', SECRET)
      .update('user_123:digest')
      .digest('hex')
    expect(buildUnsubscribeToken('user_123', 'digest')).toBe(expected)
  })

  it('returns undefined when EMAIL_UNSUBSCRIBE_SECRET is unset', () => {
    delete process.env['EMAIL_UNSUBSCRIBE_SECRET']
    expect(buildUnsubscribeToken('user_123', 'digest')).toBeUndefined()
    expect(buildUnsubscribeUrl('user_123', 'digest')).toBeUndefined()
  })

  it('verifies a matching token', () => {
    const token = buildUnsubscribeToken('user_123', 'digest')
    expect(token).toBeDefined()
    expect(verifyUnsubscribeToken('user_123', 'digest', token ?? '')).toBe(true)
  })

  it('rejects a token for a different user', () => {
    const token = buildUnsubscribeToken('user_other', 'digest')
    expect(verifyUnsubscribeToken('user_123', 'digest', token ?? '')).toBe(
      false,
    )
  })

  it('rejects a token signed with a rotated (old) secret', () => {
    const stale = createHmac('sha256', 'old-secret')
      .update('user_123:digest')
      .digest('hex')
    expect(verifyUnsubscribeToken('user_123', 'digest', stale)).toBe(false)
  })

  it('rejects malformed tokens without throwing', () => {
    expect(verifyUnsubscribeToken('user_123', 'digest', '')).toBe(false)
    expect(verifyUnsubscribeToken('user_123', 'digest', 'not-hex!')).toBe(false)
    expect(verifyUnsubscribeToken('user_123', 'digest', 'abcd')).toBe(false)
  })

  it('rejects everything when the secret is unset', () => {
    const token = buildUnsubscribeToken('user_123', 'digest')
    delete process.env['EMAIL_UNSUBSCRIBE_SECRET']
    expect(verifyUnsubscribeToken('user_123', 'digest', token ?? '')).toBe(
      false,
    )
  })

  it('builds an absolute API unsubscribe URL with encoded params', () => {
    process.env['API_PUBLIC_URL'] = 'https://api.example.com'
    const token = buildUnsubscribeToken('user/123', 'digest')
    const url = buildUnsubscribeUrl('user/123', 'digest')
    expect(url).toBe(
      `https://api.example.com/v1/email/unsubscribe?uid=${encodeURIComponent('user/123')}&family=digest&token=${token}`,
    )
  })

  it('normalizes trailing slashes and whitespace in API_PUBLIC_URL', () => {
    process.env['API_PUBLIC_URL'] = '  https://api.example.com//  '
    const token = buildUnsubscribeToken('user_123', 'digest')
    expect(buildUnsubscribeUrl('user_123', 'digest')).toBe(
      `https://api.example.com/v1/email/unsubscribe?uid=user_123&family=digest&token=${token}`,
    )
  })
})
