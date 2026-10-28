import { describe, it, expect, vi, beforeEach } from 'vitest'

global.fetch = vi.fn()

describe('apiClient', () => {
  beforeEach(() => vi.mocked(fetch).mockReset())

  it('GET request returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { apiClient } = await import('./api.js')
    const result = await apiClient.get('/v1/admin/venues', 'test-token')
    expect(result).toEqual([])
  })

  it('returns undefined on a 204 No Content response (no JSON parsing)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    const { apiClient } = await import('./api.js')
    const result = await apiClient.post(
      '/v1/admin/events/x/available',
      'test-token',
      {},
    )
    expect(result).toBeUndefined()
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { apiClient } = await import('./api.js')
    await expect(
      apiClient.get('/v1/admin/venues', 'test-token'),
    ).rejects.toThrow('Forbidden')
  })

  // The crew-invite 404 body has no `error` field at all — its `reason` is the
  // whole payload, and the invite landing cannot tell an expired link from a
  // retired one without it.
  it('carries `reason` off an error body onto ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, reason: 'expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { apiClient, ApiError } = await import('./api.js')
    const err = await apiClient
      .get('/v1/crew-invites/tok', 'test-token')
      .catch((caught: unknown) => caught)
    expect(err).toBeInstanceOf(ApiError)
    expect(err instanceof ApiError ? err.reason : null).toBe('expired')
    expect(err instanceof ApiError ? err.status : null).toBe(404)
  })

  // A hand-rolled 400 names the input it rejects; the admin venue form marks
  // that input with it instead of a generic error (#1344).
  it('carries `field` off an error body onto ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'crawlWaitForSelector is required for browser-mode venues',
          field: 'crawlWaitForSelector',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const { apiClient, ApiError } = await import('./api.js')
    const err = await apiClient
      .patch('/v1/admin/venues/v1', 'test-token', {})
      .catch((caught: unknown) => caught)
    expect(err instanceof ApiError ? err.field : null).toBe(
      'crawlWaitForSelector',
    )
  })
})
