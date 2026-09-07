import { describe, it, expect } from 'vitest'
import { ApiError } from '@/lib/api'
import { isScopeRejection, scopeRetryToken } from '@/lib/scope-rejection'

describe('isScopeRejection', () => {
  it.each([401, 403, 404])('treats %i as a declined scope', (status) => {
    expect(isScopeRejection(new ApiError(status, 'nope'))).toBe(true)
  })

  it.each([400, 429, 500])('lets %i through to the caller', (status) => {
    expect(isScopeRejection(new ApiError(status, 'nope'))).toBe(false)
  })

  it('ignores anything that is not an ApiError', () => {
    expect(isScopeRejection(new Error('boom'))).toBe(false)
    expect(isScopeRejection(undefined)).toBe(false)
  })
})

describe('scopeRetryToken', () => {
  it('drops the token only when the token itself was refused', () => {
    expect(scopeRetryToken(new ApiError(401, 'nope'), 'tok')).toBeNull()
  })

  it.each([403, 404])('keeps the token on %i', (status) => {
    expect(scopeRetryToken(new ApiError(status, 'nope'), 'tok')).toBe('tok')
  })
})
