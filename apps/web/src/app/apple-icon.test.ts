import { vi, describe, it, expect } from 'vitest'

vi.mock('next/og', () => ({
  ImageResponse: vi.fn(),
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
})
