import { describe, it, expect } from 'vitest'
import { getArtistGradientStyle } from './artist-gradient'

describe('getArtistGradientStyle', () => {
  it('returns background and color style properties', () => {
    const style = getArtistGradientStyle('Radiohead')
    expect(style).toHaveProperty('background')
    expect(style).toHaveProperty('color')
  })

  it('background is a linear-gradient using oklch', () => {
    const { background } = getArtistGradientStyle('Radiohead')
    expect(background).toMatch(/^linear-gradient\(135deg, oklch/)
  })

  it('color is an oklch value', () => {
    const { color } = getArtistGradientStyle('Radiohead')
    expect(color).toMatch(/^oklch\(/)
  })

  it('is deterministic — same input always produces same output', () => {
    const a = getArtistGradientStyle('Radiohead')
    const b = getArtistGradientStyle('Radiohead')
    expect(a.background).toBe(b.background)
    expect(a.color).toBe(b.color)
  })

  it('uses hue 180 for Radiohead (hash 897, index 7)', () => {
    const { background } = getArtistGradientStyle('Radiohead')
    expect(background).toContain('oklch(0.35 0.08 180)')
    expect(background).toContain('oklch(0.22 0.06 220)')
  })

  it('falls back to hue 280 for empty string (index 0)', () => {
    const { background } = getArtistGradientStyle('')
    expect(background).toContain('oklch(0.35 0.08 280)')
  })

  it('falls back to hue 280 for undefined artist (index 0)', () => {
    const { background } = getArtistGradientStyle(
      undefined as unknown as string,
    )
    expect(background).toContain('oklch(0.35 0.08 280)')
  })

  it('different names with different hashes produce different gradients', () => {
    // 'Radiohead' → hue 180; 'Wilco' → hash 510, index 0, hue 280
    const r = getArtistGradientStyle('Radiohead')
    const w = getArtistGradientStyle('Wilco')
    expect(r.background).not.toBe(w.background)
  })
})
