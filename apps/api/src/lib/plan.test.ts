import { describe, it, expect } from 'vitest'
import { derivePlanState, type PlanDerivationInput } from './plan.js'

const NOW = new Date('2026-07-11T12:00:00Z')
const FUTURE = new Date('2026-07-25T12:00:00Z')
const PAST = new Date('2026-07-01T12:00:00Z')

const baseInput = (
  overrides: Partial<PlanDerivationInput> = {},
): PlanDerivationInput => ({
  userId: 'user_test',
  role: 'user',
  giftedComp: null,
  subscription: null,
  billing: null,
  now: NOW,
  ...overrides,
})

const subscription = (
  overrides: Partial<NonNullable<PlanDerivationInput['subscription']>> = {},
): NonNullable<PlanDerivationInput['subscription']> => ({
  tier: 'premium',
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: FUTURE,
  ...overrides,
})

describe('derivePlanState — step 1: no auth', () => {
  it('returns logged-out with empty state when userId is null', () => {
    expect(derivePlanState(baseInput({ userId: null }))).toEqual({
      plan: 'logged-out',
      onTrial: false,
      trialEndsAt: null,
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      roleComped: false,
    })
  })

  it('ignores role/gifted/subscription when logged out', () => {
    const state = derivePlanState(
      baseInput({
        userId: null,
        role: 'admin',
        giftedComp: { revokedAt: null, expiresAt: null },
        subscription: subscription(),
      }),
    )
    expect(state.plan).toBe('logged-out')
    expect(state.roleComped).toBe(false)
  })
})

describe('derivePlanState — step 2: PREMIUM_ROLES', () => {
  it.each(['admin', 'sub_admin', 'promoter', 'beta'])(
    '%s role sets roleComped and continues derivation to free',
    (role) => {
      const state = derivePlanState(baseInput({ role }))
      expect(state.roleComped).toBe(true)
      expect(state.plan).toBe('free')
    },
  )

  it('role-holder with a live subscription keeps the paid tier', () => {
    const state = derivePlanState(
      baseInput({
        role: 'beta',
        subscription: subscription({ tier: 'founder' }),
      }),
    )
    expect(state.roleComped).toBe(true)
    expect(state.plan).toBe('founder')
  })

  it('plain user role is not roleComped', () => {
    expect(derivePlanState(baseInput({ role: 'user' })).roleComped).toBe(false)
  })

  it('missing or unknown role is not roleComped', () => {
    expect(derivePlanState(baseInput({ role: undefined })).roleComped).toBe(
      false,
    )
    expect(derivePlanState(baseInput({ role: 'wizard' })).roleComped).toBe(
      false,
    )
  })
})

describe('derivePlanState — step 3: gifted comps (before Stripe)', () => {
  it('live lifetime gift derives gifted', () => {
    const state = derivePlanState(
      baseInput({ giftedComp: { revokedAt: null, expiresAt: null } }),
    )
    expect(state.plan).toBe('gifted')
  })

  it('unexpired gift derives gifted', () => {
    const state = derivePlanState(
      baseInput({ giftedComp: { revokedAt: null, expiresAt: FUTURE } }),
    )
    expect(state.plan).toBe('gifted')
  })

  it('gifted wins over a live subscription (locked ordering)', () => {
    const state = derivePlanState(
      baseInput({
        giftedComp: { revokedAt: null, expiresAt: null },
        subscription: subscription({ tier: 'supporter' }),
      }),
    )
    expect(state.plan).toBe('gifted')
  })

  it('revoked gift is treated as absent', () => {
    const state = derivePlanState(
      baseInput({ giftedComp: { revokedAt: PAST, expiresAt: null } }),
    )
    expect(state.plan).toBe('free')
  })

  it('expired gift is treated as absent', () => {
    const state = derivePlanState(
      baseInput({ giftedComp: { revokedAt: null, expiresAt: PAST } }),
    )
    expect(state.plan).toBe('free')
  })
})

describe('derivePlanState — step 4: subscription tiers', () => {
  const liveStatuses = ['active', 'past_due', 'trialing'] as const
  const tiers = [
    ['founder', 'founder'],
    ['premium', 'premium'],
    ['supporter', 'supporter'],
  ] as const

  for (const [tier, expectedPlan] of tiers) {
    it.each(liveStatuses)(
      `tier ${tier} with %s status derives ${expectedPlan}`,
      (status) => {
        const state = derivePlanState(
          baseInput({ subscription: subscription({ tier, status }) }),
        )
        expect(state.plan).toBe(expectedPlan)
        expect(state.status).toBe(status)
      },
    )
  }

  it.each(['cancelled', 'incomplete', 'incomplete_expired'] as const)(
    '%s status falls through to free',
    (status) => {
      const state = derivePlanState(
        baseInput({ subscription: subscription({ status }) }),
      )
      expect(state.plan).toBe('free')
      expect(state.status).toBe(status)
    },
  )

  it('vestigial tier=free subscription row falls through to free', () => {
    const state = derivePlanState(
      baseInput({ subscription: subscription({ tier: 'free' }) }),
    )
    expect(state.plan).toBe('free')
  })

  it('past_due keeps the paid tier during dunning', () => {
    const state = derivePlanState(
      baseInput({
        subscription: subscription({ tier: 'founder', status: 'past_due' }),
      }),
    )
    expect(state.plan).toBe('founder')
    expect(state.status).toBe('past_due')
  })

  it('cancel-grace: cancelAtPeriodEnd true with active status keeps the plan', () => {
    const state = derivePlanState(
      baseInput({ subscription: subscription({ cancelAtPeriodEnd: true }) }),
    )
    expect(state.plan).toBe('premium')
    expect(state.cancelAtPeriodEnd).toBe(true)
    expect(state.status).toBe('active')
    expect(state.currentPeriodEnd).toBe(FUTURE.toISOString())
  })

  it('cancelled subscription with a live trial falls through to the trial', () => {
    const state = derivePlanState(
      baseInput({
        subscription: subscription({ status: 'cancelled' }),
        billing: { trialEndsAt: FUTURE },
      }),
    )
    expect(state.plan).toBe('premium')
    expect(state.onTrial).toBe(true)
  })
})

describe('derivePlanState — step 5: trial', () => {
  it('live trial derives premium with onTrial', () => {
    const state = derivePlanState(
      baseInput({ billing: { trialEndsAt: FUTURE } }),
    )
    expect(state.plan).toBe('premium')
    expect(state.onTrial).toBe(true)
    expect(state.trialEndsAt).toBe(FUTURE.toISOString())
  })

  it('expired trial derives free but keeps trialEndsAt', () => {
    const state = derivePlanState(baseInput({ billing: { trialEndsAt: PAST } }))
    expect(state.plan).toBe('free')
    expect(state.onTrial).toBe(false)
    expect(state.trialEndsAt).toBe(PAST.toISOString())
  })

  it('live subscription wins over a live trial (onTrial stays false)', () => {
    const state = derivePlanState(
      baseInput({
        subscription: subscription({ tier: 'supporter' }),
        billing: { trialEndsAt: FUTURE },
      }),
    )
    expect(state.plan).toBe('supporter')
    expect(state.onTrial).toBe(false)
  })

  it('null trialEndsAt (pre-monetization account) derives free', () => {
    const state = derivePlanState(baseInput({ billing: { trialEndsAt: null } }))
    expect(state.plan).toBe('free')
    expect(state.trialEndsAt).toBeNull()
  })
})

describe('derivePlanState — step 6: free default', () => {
  it('no rows at all derives free', () => {
    expect(derivePlanState(baseInput())).toEqual({
      plan: 'free',
      onTrial: false,
      trialEndsAt: null,
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      roleComped: false,
    })
  })
})
