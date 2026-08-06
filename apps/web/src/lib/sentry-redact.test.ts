import { describe, expect, it } from 'vitest'

import {
  beforeBreadcrumb,
  beforeSend,
  redactInviteTokens,
} from './sentry-redact'

const TOKEN = 'abc123XYZtoken'

describe('redactInviteTokens', () => {
  it('redacts the token from the API path', () => {
    expect(
      redactInviteTokens(`https://api.example.com/v1/crew-invites/${TOKEN}`),
    ).toBe('https://api.example.com/v1/crew-invites/[redacted]')
  })

  it('redacts the token from the join sub-path', () => {
    expect(redactInviteTokens(`/v1/crew-invites/${TOKEN}/join`)).toBe(
      '/v1/crew-invites/[redacted]/join',
    )
  })

  it('redacts the token from the landing route', () => {
    expect(
      redactInviteTokens(`https://app.example.com/crew/join/${TOKEN}`),
    ).toBe('https://app.example.com/crew/join/[redacted]')
  })

  it('leaves unrelated crew URLs legible', () => {
    const url = '/v1/crews/1234/invites/5678/revoke'
    expect(redactInviteTokens(url)).toBe(url)
  })
})

describe('beforeBreadcrumb', () => {
  it('redacts the token from the message and the data bag', () => {
    const result = beforeBreadcrumb({
      message: `GET /v1/crew-invites/${TOKEN}`,
      data: { url: `/crew/join/${TOKEN}`, status_code: 200 },
    })
    expect(result.message).toBe('GET /v1/crew-invites/[redacted]')
    expect(result.data).toEqual({
      url: '/crew/join/[redacted]',
      status_code: 200,
    })
  })
})

describe('beforeSend', () => {
  it('redacts the token from the request URL and the transaction name', () => {
    const result = beforeSend({
      request: { url: `https://app.example.com/crew/join/${TOKEN}` },
      transaction: `/crew/join/${TOKEN}`,
    })
    expect(result.request?.url).toBe(
      'https://app.example.com/crew/join/[redacted]',
    )
    expect(result.transaction).toBe('/crew/join/[redacted]')
  })
})
