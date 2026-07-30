import { describe, it, expect } from 'vitest'
import { ENTITLEMENTS_MATRIX } from '@concert-crawl/entitlements'
import { TIER_DEFINITIONS } from '@/components/consumer/tier-picker/definitions/constants'
import { unlockTierFor } from './unlock-tier'

describe('unlockTierFor', () => {
  it('resolves a tier definition for concert history', () => {
    const tier = unlockTierFor('concert-history')

    expect(tier).not.toBeNull()
    expect(tier?.name).toBeTruthy()
    expect(tier?.priceText).toBeTruthy()
  })

  it('returns a plan the matrix marks visible-active, not a hardcode', () => {
    const tier = unlockTierFor('concert-history')

    expect(tier).not.toBeNull()
    if (tier === null) return
    expect(TIER_DEFINITIONS[tier.key]).toBe(tier)
    expect(ENTITLEMENTS_MATRIX['concert-history'][tier.key]).toBe(
      'visible-active',
    )
  })

  it('resolves the same tier for calendar export', () => {
    expect(unlockTierFor('calendar-export')?.name).toBe(
      unlockTierFor('concert-history')?.name,
    )
  })

  it('carries the canonical perk list on the returned tier', () => {
    const tier = unlockTierFor('concert-history')

    expect(tier?.features.length).toBeGreaterThan(0)
  })
})
