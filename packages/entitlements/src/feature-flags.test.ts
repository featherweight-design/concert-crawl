import { describe, expect, it } from 'vitest'
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  featureFlagDefaults,
  flagForEntitlement,
} from './feature-flags.js'

describe('feature flag registry', () => {
  it('keys every entry by its own key field', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(FEATURE_FLAGS[key].key).toBe(key)
    }
  })

  // Every other case iterates FEATURE_FLAG_KEYS, so a flag added to the record
  // and forgotten here would be silently untested and never rendered.
  it('lists exactly the keys the record holds', () => {
    expect([...FEATURE_FLAG_KEYS].sort()).toEqual(
      Object.keys(FEATURE_FLAGS).sort(),
    )
  })

  it('never maps two flags onto the same entitlement', () => {
    const seen = new Set<string>()
    for (const key of FEATURE_FLAG_KEYS) {
      const entitlement = FEATURE_FLAGS[key].entitlement
      if (entitlement === null) continue
      expect(seen.has(entitlement)).toBe(false)
      seen.add(entitlement)
    }
  })

  it('gives every entry a non-empty label and description', () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(FEATURE_FLAGS[key].label.length).toBeGreaterThan(0)
      expect(FEATURE_FLAGS[key].description.length).toBeGreaterThan(0)
    }
  })

  it('defaults spotify-sync and crews off, release-notes on', () => {
    expect(featureFlagDefaults()).toEqual({
      'spotify-sync': false,
      crews: false,
      'release-notes': true,
    })
  })

  it('reverse-looks-up a flag by the entitlement it restricts', () => {
    expect(flagForEntitlement('crews')).toBe('crews')
    expect(flagForEntitlement('spotify-sync')).toBe('spotify-sync')
    expect(flagForEntitlement('watching')).toBeNull()
  })
})
