import { describe, it, expect } from 'vitest'
import manifest from './manifest.js'
import { validateManifest } from './manifest-types.js'

describe('manifest', () => {
  it('exports an array of 7 entries', () => {
    expect(Array.isArray(manifest)).toBe(true)
    expect(manifest).toHaveLength(7)
  })

  it('passes validateManifest without throwing', () => {
    // Import-time validation already guards this, but an explicit assertion
    // ensures nobody removes the top-level validateManifest() call in a
    // future refactor without a test failure.
    expect(() => validateManifest(manifest)).not.toThrow()
  })
})
