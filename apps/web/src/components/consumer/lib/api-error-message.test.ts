import { describe, expect, it } from 'vitest'

import { apiErrorMessage } from './api-error-message'

describe('apiErrorMessage', () => {
  it('returns the error string the API sent', () => {
    expect(apiErrorMessage({ error: 'Rate limited.' })).toBe('Rate limited.')
  })

  it('returns null when the payload has no error field', () => {
    expect(apiErrorMessage({ success: false })).toBeNull()
  })

  it('returns null when error is present but not a string', () => {
    expect(apiErrorMessage({ error: { code: 500 } })).toBeNull()
  })

  it('returns null for the non-object bodies a failing endpoint can return', () => {
    // An HTML error page or an empty body parses to something that is not a
    // record — the old `as { error?: string }` cast claimed otherwise.
    expect(apiErrorMessage(null)).toBeNull()
    expect(apiErrorMessage('Internal Server Error')).toBeNull()
    expect(apiErrorMessage(undefined)).toBeNull()
  })
})
