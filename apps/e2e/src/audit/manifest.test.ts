import { describe, it, expect } from 'vitest'
import manifest from './manifest.js'
import { validateManifest } from './manifest-types.js'

describe('manifest', () => {
  it('exports a non-empty array of routes', () => {
    expect(Array.isArray(manifest)).toBe(true)
    expect(manifest.length).toBeGreaterThan(0)
  })

  it('has unique route ids', () => {
    const ids = manifest.map((route) => route.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers both consumer and admin audiences', () => {
    const tags = new Set(manifest.flatMap((route) => route.tags))
    expect(tags.has('consumer')).toBe(true)
    expect(tags.has('admin')).toBe(true)
  })

  it('passes validateManifest without throwing', () => {
    // Import-time validation already guards this, but an explicit assertion
    // ensures nobody removes the top-level validateManifest() call in a
    // future refactor without a test failure.
    expect(() => validateManifest(manifest)).not.toThrow()
  })
})
