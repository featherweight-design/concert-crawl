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
})
