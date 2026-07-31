import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/hono/node'
import { scrubEvent, scrubRequestBody } from './sentry-scrub.js'

describe('scrubRequestBody', () => {
  it('redacts email fields', () => {
    expect(scrubRequestBody('{"email":"hugh@example.com"}')).toBe(
      '{"email":"[Redacted]"}',
    )
  })

  it('redacts token and secret-like fields regardless of casing', () => {
    const scrubbed = scrubRequestBody(
      '{"token":"abc","recipientEmail":"a@b.co","apiKey":"xyz"}',
    )
    expect(scrubbed).not.toContain('abc')
    expect(scrubbed).not.toContain('a@b.co')
    expect(scrubbed).not.toContain('xyz')
  })

  it('leaves non-sensitive fields intact', () => {
    expect(scrubRequestBody('{"theme":"dark","count":3}')).toBe(
      '{"theme":"dark","count":3}',
    )
  })

  it('redacts nested and array-wrapped sensitive fields', () => {
    expect(
      scrubRequestBody('{"users":[{"email":"a@b.co","name":"Ada"}]}'),
    ).toBe('{"users":[{"email":"[Redacted]","name":"Ada"}]}')
  })

  it('returns malformed bodies untouched so payloads stay readable', () => {
    const payload = '{"theme":"%20or%203%3d3%20--"'
    expect(scrubRequestBody(payload)).toBe(payload)
  })
})

describe('scrubEvent', () => {
  it('scrubs the request body on the event', () => {
    const event: ErrorEvent = {
      type: undefined,
      request: { data: '{"email":"hugh@example.com"}' },
    }
    expect(scrubEvent(event).request?.data).toBe('{"email":"[Redacted]"}')
  })

  it('passes through events with no request body', () => {
    const event: ErrorEvent = { type: undefined }
    expect(scrubEvent(event)).toBe(event)
  })
})
