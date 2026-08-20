import { describe, it, expect } from 'vitest'
import { resolveTierCta } from './resolve-tier-cta'
import { visibleTiers, defaultExpandedTier } from './visible-tiers'
import { scarcityRailData, scarcityTimeText } from './scarcity'
import { TIER_PICKER_COPY } from '../definitions/copy'

describe('resolveTierCta', () => {
  it('marks the current Free plan as a disabled stamp', () => {
    const cta = resolveTierCta('free', 'free', 'open')
    expect(cta).toEqual({
      label: TIER_PICKER_COPY.cta.youAreOnFree,
      tone: 'current',
      action: 'none',
      disabled: true,
    })
  })

  it('routes current paid plans to Manage subscription', () => {
    for (const state of ['supporter', 'premium', 'founder'] as const) {
      const cta = resolveTierCta(state, state, 'closed')
      expect(cta.label).toBe(TIER_PICKER_COPY.cta.manageSubscription)
      expect(cta.action).toBe('manage')
      expect(cta.disabled).toBe(false)
    }
  })

  it('sends every logged-out CTA to sign-up', () => {
    for (const tier of ['free', 'supporter', 'premium', 'founder'] as const) {
      expect(resolveTierCta(tier, 'logged-out', 'open').action).toBe('sign-up')
    }
  })

  it('enables checkout from the free state for paid tiers', () => {
    expect(resolveTierCta('supporter', 'free', 'open').action).toBe('checkout')
    expect(resolveTierCta('premium', 'free', 'open')).toMatchObject({
      label: TIER_PICKER_COPY.cta.upgradeToPremium,
      tone: 'signal',
      action: 'checkout',
    })
    expect(resolveTierCta('founder', 'free', 'open')).toMatchObject({
      label: TIER_PICKER_COPY.cta.claimFounder,
      tone: 'founder',
      action: 'checkout',
    })
  })

  it('disables the founder claim pre-launch with the launch-tease label', () => {
    const cta = resolveTierCta('founder', 'free', 'pre-launch')
    expect(cta.label).toBe(TIER_PICKER_COPY.card.founderPreLaunch)
    expect(cta.disabled).toBe(true)
  })

  it('renders PR 4.5 change-tier moves with their designed label but disabled', () => {
    const upgrade = resolveTierCta('premium', 'supporter', 'open')
    expect(upgrade.label).toBe(TIER_PICKER_COPY.cta.upgradeToPremium)
    expect(upgrade.disabled).toBe(true)

    const downgrade = resolveTierCta('free', 'premium', 'open')
    expect(downgrade.label).toBe(TIER_PICKER_COPY.cta.switchTo('Free'))
    expect(downgrade.disabled).toBe(true)
  })

  it('offers a trial user Premium to keep, never the portal', () => {
    const premium = resolveTierCta('premium', 'trial', 'open')
    expect(premium).toMatchObject({
      label: TIER_PICKER_COPY.cta.keepPremium,
      action: 'checkout',
      disabled: false,
    })
    // A card-less trial has no Stripe customer, so 'manage' would 404.
    for (const tier of ['free', 'supporter', 'premium', 'founder'] as const) {
      expect(resolveTierCta(tier, 'trial', 'open').action).not.toBe('manage')
    }
  })

  it('frames Free as where a trial user lands, not a plan they hold', () => {
    const free = resolveTierCta('free', 'trial', 'open')
    expect(free.label).toBe(TIER_PICKER_COPY.cta.freeAfterTrial)
    expect(free.disabled).toBe(true)
  })

  it('keeps the other acquisition CTAs identical to the free state', () => {
    for (const tier of ['supporter', 'founder'] as const) {
      expect(resolveTierCta(tier, 'trial', 'open')).toEqual(
        resolveTierCta(tier, 'free', 'open'),
      )
    }
  })

  it("shows the founder's Premium row as already-covered", () => {
    const cta = resolveTierCta('premium', 'founder', 'closed')
    expect(cta.label).toBe(TIER_PICKER_COPY.cta.alreadyViaFounder)
    expect(cta.disabled).toBe(true)
  })
})

describe('visibleTiers', () => {
  it('keeps all four tiers while the window is open or pre-launch', () => {
    expect(visibleTiers('open', 'free').map((tier) => tier.key)).toEqual([
      'free',
      'supporter',
      'premium',
      'founder',
    ])
    expect(visibleTiers('pre-launch', 'free')).toHaveLength(4)
  })

  it('hides Founder once closed — except for founders themselves', () => {
    expect(visibleTiers('closed', 'free').map((tier) => tier.key)).toEqual([
      'free',
      'supporter',
      'premium',
    ])
    expect(visibleTiers('closed', 'founder')).toHaveLength(4)
  })
})

describe('defaultExpandedTier', () => {
  it('expands the current plan when present', () => {
    expect(
      defaultExpandedTier(visibleTiers('open', 'supporter'), 'supporter'),
    ).toBe('supporter')
  })

  it('falls back to Premium for non-plan states', () => {
    expect(
      defaultExpandedTier(visibleTiers('open', 'logged-out'), 'logged-out'),
    ).toBe('premium')
  })
})

describe('scarcityRailData', () => {
  const now = new Date('2026-08-01T00:00:00Z')

  it('returns null outside the open state', () => {
    expect(
      scarcityRailData(
        { state: 'pre-launch', seatsTotal: 100, closesAt: null },
        now,
      ),
    ).toBeNull()
  })

  it('derives seats + countdown and flags hot when seats run low', () => {
    const rail = scarcityRailData(
      {
        state: 'open',
        seatsTotal: 100,
        seatsRemaining: 12,
        closesAt: '2026-08-20T14:30:00Z',
      },
      now,
    )
    expect(rail).toEqual({
      seatsClaimed: 88,
      seatsTotal: 100,
      seatsLeft: 12,
      daysLeft: 19,
      hoursLeft: 14,
      hot: true,
    })
    if (rail === null) throw new Error('rail missing')
    expect(scarcityTimeText(rail)).toBe(
      TIER_PICKER_COPY.scarcity.daysAndHoursLeft(19, 14),
    )
  })

  it('is calm with many seats and weeks left, hot inside 3 days', () => {
    const calm = scarcityRailData(
      {
        state: 'open',
        seatsTotal: 100,
        seatsRemaining: 77,
        closesAt: '2026-08-28T00:00:00Z',
      },
      now,
    )
    expect(calm?.hot).toBe(false)

    const soon = scarcityRailData(
      {
        state: 'open',
        seatsTotal: 100,
        seatsRemaining: 40,
        closesAt: '2026-08-03T11:00:00Z',
      },
      now,
    )
    expect(soon?.hot).toBe(true)
    if (!soon) throw new Error('rail missing')
    expect(scarcityTimeText(soon)).toBe(
      TIER_PICKER_COPY.scarcity.daysAndHoursLeft(2, 11),
    )
  })
})
