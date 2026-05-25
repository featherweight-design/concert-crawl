import { describe, it, expect } from 'vitest'
import manifest from './manifest'

describe('manifest', () => {
  it('returns required name fields', () => {
    const result = manifest()
    expect(result.name).toBe('Concert Crawl')
    expect(result.short_name).toBe('Concert Crawl')
  })

  it('returns standalone display mode', () => {
    expect(manifest().display).toBe('standalone')
  })

  it('returns relative start_url', () => {
    expect(manifest().start_url).toBe('/')
  })

  it('returns Electric theme colors', () => {
    const result = manifest()
    expect(result.background_color).toBe('#070A1A')
    expect(result.theme_color).toBe('#070A1A')
  })

  it('returns 192 and 512 icon entries', () => {
    const icons = manifest().icons ?? []
    const sizes = icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('returns correct icon src paths', () => {
    const icons = manifest().icons ?? []
    const srcs = icons.map((icon) => icon.src)
    expect(srcs).toContain('/api/pwa/icon-192')
    expect(srcs).toContain('/api/pwa/icon-512')
  })

  it('returns png icon type', () => {
    const icons = manifest().icons ?? []
    icons.forEach((icon) => expect(icon.type).toBe('image/png'))
  })
})
