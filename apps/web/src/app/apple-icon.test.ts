import { vi, describe, it, expect } from 'vitest'

const mockImageResponse = vi.fn()

vi.mock('next/og', () => ({
  ImageResponse: mockImageResponse,
}))

describe('apple-icon', () => {
  it('exports size 180x180', async () => {
    const mod = await import('./apple-icon')
    expect(mod.size).toEqual({ width: 180, height: 180 })
  })

  it('exports contentType image/png', async () => {
    const mod = await import('./apple-icon')
    expect(mod.contentType).toBe('image/png')
  })

  it('default export calls ImageResponse with 180x180 size and cache headers', async () => {
    const mod = await import('./apple-icon')
    mod.default()
    expect(mockImageResponse).toHaveBeenCalledWith(expect.anything(), {
      width: 180,
      height: 180,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  })
})
