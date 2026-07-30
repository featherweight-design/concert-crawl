import { describe, it, expect } from 'vitest'
import {
  STAMP_ACCENTS,
  STAMP_GLYPHS,
  stampAccentFor,
  stampGlyphFor,
  stampRotationFor,
} from './stamp'

const NAMES = Array.from({ length: 200 }, (_, idx) => `Artist Number ${idx}`)

describe('stamp identity', () => {
  it('is stable for the same artist', () => {
    expect(stampAccentFor('Khruangbin')).toBe(stampAccentFor('Khruangbin'))
    expect(stampGlyphFor('Khruangbin')).toBe(stampGlyphFor('Khruangbin'))
  })

  it('only ever returns a brand accent', () => {
    for (const name of NAMES) {
      expect(STAMP_ACCENTS).toContain(stampAccentFor(name))
    }
  })

  it('distributes across all 7 accents', () => {
    const seen = new Set(NAMES.map(stampAccentFor))
    expect(seen.size).toBe(STAMP_ACCENTS.length)
  })

  it('distributes across all 4 glyphs', () => {
    const seen = new Set(NAMES.map(stampGlyphFor))
    expect(seen.size).toBe(STAMP_GLYPHS.length)
  })

  // The whole reason the handoff used two different hashes. If accent and glyph
  // were correlated, every cyan stamp would carry the same glyph and the wall
  // of stamps would read as 7 designs instead of 28.
  it('does not correlate accent with glyph', () => {
    const glyphsPerAccent = new Map<string, Set<string>>()
    for (const name of NAMES) {
      const accent = stampAccentFor(name)
      const bucket = glyphsPerAccent.get(accent) ?? new Set<string>()
      bucket.add(stampGlyphFor(name))
      glyphsPerAccent.set(accent, bucket)
    }
    for (const bucket of glyphsPerAccent.values()) {
      expect(bucket.size).toBeGreaterThan(1)
    }
  })

  it('rotates deterministically within ±4 degrees', () => {
    for (const name of NAMES) {
      const rotation = stampRotationFor(name)
      expect(rotation).toBe(stampRotationFor(name))
      expect(rotation).toBeGreaterThanOrEqual(-4)
      expect(rotation).toBeLessThanOrEqual(4)
    }
  })

  it('produces varied rotations rather than a single constant', () => {
    expect(new Set(NAMES.map(stampRotationFor)).size).toBeGreaterThan(10)
  })
})
