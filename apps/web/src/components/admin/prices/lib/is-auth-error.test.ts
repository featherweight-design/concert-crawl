import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { isAuthError } from './is-auth-error'

describe('isAuthError', () => {
  it('treats a 401 ApiError as an auth error', () => {
    expect(isAuthError(new ApiError(401, 'Unauthorized'))).toBe(true)
  })

  it('does not treat other ApiError statuses as auth errors', () => {
    expect(isAuthError(new ApiError(500, 'Server error'))).toBe(false)
    expect(isAuthError(new ApiError(404, 'Not found'))).toBe(false)
  })

  it('treats the hook’s "Not authenticated" throw as an auth error', () => {
    expect(isAuthError(new Error('Not authenticated'))).toBe(true)
  })

  it('does not treat other errors or non-errors as auth errors', () => {
    expect(isAuthError(new Error('Network down'))).toBe(false)
    expect(isAuthError('Not authenticated')).toBe(false)
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError(undefined)).toBe(false)
  })
})
