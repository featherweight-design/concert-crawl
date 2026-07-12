// fetchProrationPreview boundary validation (PR #908 Copilot r4) — the
// preview renders as customer-facing dollar figures, so fractional/negative
// cents and non-USD currencies must be rejected at the API boundary.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchProrationPreview } from './billing'
import { apiClient } from './api'

vi.mock('./api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  publicApiClient: { get: vi.fn() },
}))

const mockedGet = vi.mocked(apiClient.get)

const validPayload = {
  amountDueCents: 317,
  creditCents: 0,
  currency: 'usd',
  periodEnd: 'Jul 15',
}

describe('fetchProrationPreview', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('returns a valid payload', async () => {
    mockedGet.mockResolvedValue(validPayload)
    await expect(fetchProrationPreview('token', 'premium')).resolves.toEqual(
      validPayload,
    )
    expect(mockedGet).toHaveBeenCalledWith(
      '/v1/billing/proration-preview?tier=premium',
      'token',
    )
  })

  it('accepts a null periodEnd', async () => {
    mockedGet.mockResolvedValue({ ...validPayload, periodEnd: null })
    await expect(
      fetchProrationPreview('token', 'supporter'),
    ).resolves.toMatchObject({ periodEnd: null })
  })

  it.each([
    ['fractional cents', { ...validPayload, amountDueCents: 3.17 }],
    ['negative amountDueCents', { ...validPayload, amountDueCents: -1 }],
    ['negative creditCents', { ...validPayload, creditCents: -50 }],
    ['NaN cents', { ...validPayload, creditCents: Number.NaN }],
    ['non-usd currency', { ...validPayload, currency: 'eur' }],
    ['missing currency', { amountDueCents: 317, creditCents: 0 }],
    ['non-string periodEnd', { ...validPayload, periodEnd: 42 }],
    ['non-object payload', 'oops'],
    ['null payload', null],
  ])('rejects %s', async (_label, payload) => {
    mockedGet.mockResolvedValue(payload)
    await expect(fetchProrationPreview('token', 'premium')).rejects.toThrow(
      'failed validation',
    )
  })
})
