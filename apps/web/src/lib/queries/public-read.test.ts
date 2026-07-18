import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { publicGet, authGet } = vi.hoisted(() => ({
  publicGet: vi.fn(),
  authGet: vi.fn(),
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    readonly status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  }
  return {
    ApiError,
    publicApiClient: { get: publicGet },
    apiClient: { get: authGet },
  }
})

import { ApiError } from '@/lib/api'
import { fetchPublicRead } from './public-read'

describe('fetchPublicRead', () => {
  beforeEach(() => {
    publicGet.mockReset()
    authGet.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the anonymous response when the public read succeeds', async () => {
    publicGet.mockResolvedValue({ ok: true })
    const result = await fetchPublicRead('/v1/events', async () => 'tok')
    expect(result).toEqual({ ok: true })
    expect(authGet).not.toHaveBeenCalled()
    expect(console.error).not.toHaveBeenCalled()
  })

  it('falls back to an authenticated read on 401 (beta auth gating)', async () => {
    publicGet.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    authGet.mockResolvedValue({ ok: true, authed: true })
    const result = await fetchPublicRead('/v1/events', async () => 'tok')
    expect(result).toEqual({ ok: true, authed: true })
    expect(authGet).toHaveBeenCalledWith('/v1/events', 'tok')
    expect(console.error).not.toHaveBeenCalled()
  })

  it('logs and rethrows a 401 when no token is available', async () => {
    publicGet.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    await expect(
      fetchPublicRead('/v1/events', async () => null),
    ).rejects.toBeInstanceOf(ApiError)
    expect(authGet).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledOnce()
  })

  it('logs and rethrows when the 401 auth retry itself fails', async () => {
    publicGet.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    authGet.mockRejectedValue(new ApiError(500, 'Server error'))
    await expect(
      fetchPublicRead('/v1/events', async () => 'tok'),
    ).rejects.toBeInstanceOf(ApiError)
    expect(authGet).toHaveBeenCalledWith('/v1/events', 'tok')
    expect(console.error).toHaveBeenCalledOnce()
  })

  it('logs and rethrows non-401 errors without retrying', async () => {
    publicGet.mockRejectedValue(new ApiError(500, 'Server error'))
    await expect(
      fetchPublicRead('/v1/events', async () => 'tok'),
    ).rejects.toBeInstanceOf(ApiError)
    expect(authGet).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledOnce()
  })
})
