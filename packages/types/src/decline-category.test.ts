import { describe, it, expect } from 'vitest'
import { mapDeclineCategory } from './decline-category.js'

describe('mapDeclineCategory', () => {
  it('maps insufficient_funds', () => {
    expect(mapDeclineCategory({ declineCode: 'insufficient_funds' })).toBe(
      'insufficient_funds',
    )
  })

  it.each([
    'expired_card',
    'incorrect_cvc',
    'incorrect_number',
    'invalid_expiry_month',
    'invalid_expiry_year',
  ])('maps decline_code %s to expired_or_incorrect_card', (declineCode) => {
    expect(mapDeclineCategory({ declineCode })).toBe(
      'expired_or_incorrect_card',
    )
  })

  it.each([
    'expired_card',
    'incorrect_cvc',
    'incorrect_number',
    'invalid_expiry_month',
    'invalid_expiry_year',
  ])(
    'maps Stripe validation-error code %s (no decline_code) to expired_or_incorrect_card',
    (errorCode) => {
      expect(mapDeclineCategory({ errorCode })).toBe(
        'expired_or_incorrect_card',
      )
    },
  )

  it.each([
    'fraudulent',
    'stolen_card',
    'lost_card',
    'pickup_card',
    'restricted_card',
  ])('maps decline_code %s to fraud_block', (declineCode) => {
    expect(mapDeclineCategory({ declineCode })).toBe('fraud_block')
  })

  it.each(['api_error', 'api_connection_error'])(
    'maps error type %s (no decline_code) to network_timeout',
    (errorType) => {
      expect(mapDeclineCategory({ errorType })).toBe('network_timeout')
    },
  )

  it.each([
    'do_not_honor',
    'generic_decline',
    'card_velocity_exceeded',
    'currency_not_supported',
    'try_again_later',
  ])(
    'defaults decline_code %s to issuer_declined (catch-all)',
    (declineCode) => {
      expect(mapDeclineCategory({ declineCode })).toBe('issuer_declined')
    },
  )

  it('defaults to issuer_declined when no decline_code and no api-error type', () => {
    expect(mapDeclineCategory({})).toBe('issuer_declined')
    expect(mapDeclineCategory({ errorCode: 'card_declined' })).toBe(
      'issuer_declined',
    )
    expect(
      mapDeclineCategory({ errorType: 'card_error', errorCode: null }),
    ).toBe('issuer_declined')
  })

  it('prefers the decline_code over the error type when both are present', () => {
    expect(
      mapDeclineCategory({
        declineCode: 'insufficient_funds',
        errorType: 'api_error',
      }),
    ).toBe('insufficient_funds')
  })

  it('treats null/undefined inputs as absent', () => {
    expect(
      mapDeclineCategory({
        declineCode: null,
        errorCode: undefined,
        errorType: null,
      }),
    ).toBe('issuer_declined')
  })
})
