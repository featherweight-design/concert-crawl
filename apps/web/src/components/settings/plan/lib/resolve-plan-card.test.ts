// Pure resolver tests — the full #780/#781/#782 plan-card matrix.
// Precedence pins carried forward from the PR 3.1 PlanCard tests: past_due
// outranks the celebratory founder/gifted card, and free/logged-out never
// falls through to a paid card.

import { describe, it, expect } from 'vitest'
import type { PlanState } from '@concert-crawl/types'
import { resolvePlanCard } from './resolve-plan-card'
import { PLAN_CARD_COPY } from '../definitions/copy'

const NOW = new Date('2026-07-11T18:00:00Z')

const DAY_MS = 86_400_000

const basePlanState: PlanState = {
  plan: 'free',
  onTrial: false,
  trialEndsAt: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
}

const state = (overrides: Partial<PlanState>): PlanState => ({
  ...basePlanState,
  ...overrides,
})

describe('resolvePlanCard — precedence', () => {
  it('past_due outranks the celebratory founder card', () => {
    const content = resolvePlanCard(
      state({ plan: 'founder', status: 'past_due' }),
      NOW,
    )
    expect(content.variant).toBe('past-due')
    expect(content.headline).toBe(PLAN_CARD_COPY.pastDue.headline)
    expect(content.tone).toBe('warning')
  })

  it('past_due outranks a role-comped user in dunning', () => {
    const content = resolvePlanCard(
      state({ plan: 'premium', roleComped: true, status: 'past_due' }),
      NOW,
    )
    expect(content.variant).toBe('past-due')
  })

  it('past_due outranks cancel-at-period-end', () => {
    const content = resolvePlanCard(
      state({ plan: 'premium', status: 'past_due', cancelAtPeriodEnd: true }),
      NOW,
    )
    expect(content.variant).toBe('past-due')
  })

  it('gifted outranks trial flags', () => {
    const content = resolvePlanCard(
      state({
        plan: 'gifted',
        onTrial: true,
        trialEndsAt: new Date(NOW.getTime() + 5 * DAY_MS).toISOString(),
      }),
      NOW,
    )
    expect(content.variant).toBe('gifted')
  })
})

describe('resolvePlanCard — past-due (#782)', () => {
  it('names the tier and its price, and both CTAs are portal-bound', () => {
    const content = resolvePlanCard(
      state({
        plan: 'supporter',
        status: 'past_due',
        currentPeriodEnd: '2026-07-15T07:00:00Z',
      }),
      NOW,
    )
    expect(content.eyebrow).toBe(PLAN_CARD_COPY.pastDue.eyebrow('$2'))
    expect(content.body).toContain('Supporter')
    expect(content.body).toContain('Jul 15')
    expect(content.rail?.tone).toBe('warning')
    expect(content.rail?.label).toBe(
      PLAN_CARD_COPY.pastDue.railLabel('Supporter', 'Jul 15'),
    )
    expect(content.ctas).toHaveLength(2)
    expect(content.ctas.every((cta) => cta.action === 'portal')).toBe(true)
    expect(content.ctas[0]?.label).toBe(PLAN_CARD_COPY.pastDue.updateCardCta)
  })

  it('falls back to Premium naming when plan is free (defensive per #782)', () => {
    const content = resolvePlanCard(
      state({ plan: 'free', status: 'past_due' }),
      NOW,
    )
    expect(content.body).toContain('Premium')
    expect(content.badgeTier).toBe('premium')
  })
})

describe('resolvePlanCard — gifted / role-comped (#781 §4)', () => {
  it.each([
    ['gifted plan', state({ plan: 'gifted' })],
    ['role-comped premium', state({ plan: 'premium', roleComped: true })],
  ])('%s gets the gratitude card with no portal CTA', (_label, planState) => {
    const content = resolvePlanCard(planState, NOW)
    expect(content.variant).toBe('gifted')
    expect(content.headline).toBe(PLAN_CARD_COPY.gifted.headline)
    expect(content.betaChip).toBe(true)
    expect(content.badgeTier).toBe('premium')
    expect(content.ctas).toHaveLength(1)
    expect(content.ctas[0]?.action).toBe('tier-picker')
    expect(content.ctas[0]?.label).toBe(PLAN_CARD_COPY.gifted.discoverCta)
  })
})

describe('resolvePlanCard — trial (Decision 7)', () => {
  it('early trial shows day count and a tier-picker CTA', () => {
    const content = resolvePlanCard(
      state({
        plan: 'premium',
        onTrial: true,
        trialEndsAt: new Date(NOW.getTime() + 8 * DAY_MS).toISOString(),
      }),
      NOW,
    )
    expect(content.variant).toBe('trial-early')
    expect(content.eyebrow).toBe(PLAN_CARD_COPY.trial.early.eyebrow(6, 14))
    expect(content.body).toBe(PLAN_CARD_COPY.trial.early.body(8))
    expect(content.chip).toBe(PLAN_CARD_COPY.trial.chip)
    expect(content.emphasis).toBe(false)
    expect(content.ctas).toHaveLength(1)
    expect(content.ctas[0]?.action).toBe('tier-picker')
  })

  it('ends-tomorrow gets the emphasis treatment and countdown rail', () => {
    const content = resolvePlanCard(
      state({
        plan: 'premium',
        onTrial: true,
        trialEndsAt: new Date(NOW.getTime() + 1 * DAY_MS).toISOString(),
      }),
      NOW,
    )
    expect(content.variant).toBe('trial-ends-tomorrow')
    expect(content.headline).toBe(PLAN_CARD_COPY.trial.endsTomorrow.headline)
    expect(content.emphasis).toBe(true)
    expect(content.rail?.label).toBe(
      PLAN_CARD_COPY.trial.endsTomorrow.railLabel,
    )
  })

  it('ends-today when the trial ends within the day', () => {
    const content = resolvePlanCard(
      state({
        plan: 'premium',
        onTrial: true,
        trialEndsAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString(),
      }),
      NOW,
    )
    expect(content.variant).toBe('trial-ends-today')
    expect(content.headline).toBe(PLAN_CARD_COPY.trial.endsToday.headline)
    expect(content.emphasis).toBe(true)
  })

  it('treats an unparseable trialEndsAt as ends-today, never NaN copy', () => {
    const content = resolvePlanCard(
      state({ plan: 'premium', onTrial: true, trialEndsAt: 'not-a-date' }),
      NOW,
    )
    expect(content.variant).toBe('trial-ends-today')
    expect(content.eyebrow).not.toContain('NaN')
    expect(content.body).not.toContain('NaN')
  })
})

describe('resolvePlanCard — cancel-at-period-end (#780)', () => {
  it('paid plan winding down: muted chip, grace copy, portal CTA', () => {
    const content = resolvePlanCard(
      state({
        plan: 'premium',
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: '2026-07-15T07:00:00Z',
      }),
      NOW,
    )
    expect(content.variant).toBe('cancel-grace')
    expect(content.chip).toBe(PLAN_CARD_COPY.cancelGrace.chip)
    expect(content.chipMuted).toBe(true)
    expect(content.headline).toBe(
      PLAN_CARD_COPY.cancelGrace.headline('Premium', 'Jul 15'),
    )
    expect(content.rail?.tone).toBe('muted')
    expect(content.ctas).toHaveLength(1)
    expect(content.ctas[0]?.action).toBe('portal')
  })

  it('cancelAtPeriodEnd on a free plan does not render the grace card', () => {
    const content = resolvePlanCard(
      state({ plan: 'free', cancelAtPeriodEnd: true }),
      NOW,
    )
    expect(content.variant).toBe('free')
  })
})

describe('resolvePlanCard — active paid tiers', () => {
  it('supporter: accent tone, badge, portal CTA', () => {
    const content = resolvePlanCard(
      state({
        plan: 'supporter',
        status: 'active',
        currentPeriodEnd: '2026-07-15T07:00:00Z',
      }),
      NOW,
    )
    expect(content.variant).toBe('active-supporter')
    expect(content.headline).toBe(PLAN_CARD_COPY.activeSupporter.headline)
    expect(content.eyebrow).toBe(
      PLAN_CARD_COPY.activeSupporter.eyebrow('$2', 'Jul 15'),
    )
    expect(content.badgeTier).toBe('supporter')
    expect(content.tone).toBe('accent')
    expect(content.ctas[0]?.action).toBe('portal')
  })

  it('premium: signal tone, renewal eyebrow', () => {
    const content = resolvePlanCard(
      state({ plan: 'premium', status: 'active' }),
      NOW,
    )
    expect(content.variant).toBe('active-premium')
    expect(content.headline).toBe(PLAN_CARD_COPY.activePremium.headline)
    expect(content.eyebrow).toBe(
      PLAN_CARD_COPY.activePremium.eyebrow('$5', null),
    )
    expect(content.ctas[0]?.action).toBe('portal')
  })

  it('founder: gradient primary, locked-price eyebrow', () => {
    const content = resolvePlanCard(
      state({
        plan: 'founder',
        status: 'active',
        currentPeriodEnd: '2026-07-15T07:00:00Z',
      }),
      NOW,
    )
    expect(content.variant).toBe('active-founder')
    expect(content.headline).toBe(PLAN_CARD_COPY.activeFounder.headline)
    expect(content.eyebrow).toBe(
      PLAN_CARD_COPY.activeFounder.eyebrow('$3', 'Jul 15'),
    )
    expect(content.founderGradient).toBe(true)
    expect(content.ctas[0]?.action).toBe('portal')
  })
})

describe('resolvePlanCard — free contexts', () => {
  it('plain free: no badge, tier-picker CTA, never a portal CTA', () => {
    const content = resolvePlanCard(basePlanState, NOW)
    expect(content.variant).toBe('free')
    expect(content.headline).toBe(PLAN_CARD_COPY.free.headline)
    expect(content.badgeTier).toBeNull()
    expect(content.ctas.every((cta) => cta.action === 'tier-picker')).toBe(true)
  })

  it('logged-out renders the plain free card', () => {
    const content = resolvePlanCard(state({ plan: 'logged-out' }), NOW)
    expect(content.variant).toBe('free')
  })

  it('recently-expired trial gets the post-trial context', () => {
    const content = resolvePlanCard(
      state({
        plan: 'free',
        trialEndsAt: new Date(NOW.getTime() - 2 * DAY_MS).toISOString(),
      }),
      NOW,
    )
    expect(content.variant).toBe('free-post-trial')
    expect(content.headline).toBe(PLAN_CARD_COPY.freePostTrial.headline)
    expect(content.ctas[0]?.action).toBe('tier-picker')
  })

  it('cancelled subscription rolls to the post-cancel context', () => {
    const content = resolvePlanCard(
      state({
        plan: 'free',
        status: 'cancelled',
        currentPeriodEnd: '2026-07-05T07:00:00Z',
      }),
      NOW,
    )
    expect(content.variant).toBe('free-post-cancel')
    expect(content.headline).toBe(PLAN_CARD_COPY.freePostCancel.headline)
    expect(content.chip).toBe(PLAN_CARD_COPY.freePostCancel.chip('Jul 5'))
    expect(content.ctas[0]?.action).toBe('tier-picker')
  })
})
