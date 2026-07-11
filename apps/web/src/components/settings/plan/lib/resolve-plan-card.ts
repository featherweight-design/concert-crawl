// Pure PlanState → PlanCardContent resolver for the settings "Your plan"
// card (#780 lifecycle matrix + #782 past-due + #781 gifted).
//
// Precedence (same as the PR 3.1 card, extended):
//   1. past_due          — dunning outranks every celebratory treatment
//   2. gifted/roleComped — gratitude card, no payment relationship
//   3. onTrial           — early / ends-tomorrow / ends-today
//   4. cancelAtPeriodEnd — winding-down grace card (paid plans)
//   5. active paid tier  — supporter / premium / founder
//   6. free              — post-cancel / post-trial context, else plain

import type { PlanState } from '@concert-crawl/types'
import { TIER_DEFINITIONS } from '@/components/consumer/tier-picker/definitions/constants'
import type { TierKey } from '@/components/consumer/tier-picker/definitions/types'
import { PLAN_CARD_COPY } from '../definitions/copy'
import { DISPLAY_TIME_ZONE, TRIAL_LENGTH_DAYS } from '../definitions/constants'
import type { PlanCardContent, PlanCardCta } from '../definitions/types'

const MS_PER_DAY = 86_400_000

const PAID_TIERS = ['supporter', 'premium', 'founder'] as const
type PaidTier = (typeof PAID_TIERS)[number]

const isPaidTier = (plan: PlanState['plan']): plan is PaidTier =>
  (PAID_TIERS as readonly string[]).includes(plan)

const periodEndFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
})

/** ISO timestamp → "Jul 15" in Mountain Time; null for absent/unparseable. */
const formatPeriodEnd = (iso: string | null): string | null => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return periodEndFormatter.format(date)
}

// "Ends today / tomorrow" are calendar statements in Mountain Time, not
// 24-hour windows — a trial ending in 2 hours ends *today*.
const calendarDayFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: DISPLAY_TIME_ZONE,
})

// formatToParts (matching lib/time.ts localDateString) instead of parsing
// the formatted string — locale output is not a stable parse target.
const utcMidnightOf = (date: Date): number => {
  const parts = calendarDayFormatter.formatToParts(date)
  const partValue = (type: 'year' | 'month' | 'day'): number => {
    const part = parts.find((candidate) => candidate.type === type)
    return part ? Number(part.value) : NaN
  }
  const year = partValue('year')
  const month = partValue('month')
  const day = partValue('day')
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    // Callers NaN-guard their inputs; this only trips on an Intl anomaly.
    // Fall back to the raw instant so day-diffs stay finite, never NaN.
    return date.getTime()
  }
  return Date.UTC(year, month - 1, day)
}

const isPastTimestamp = (iso: string, now: Date): boolean => {
  const date = new Date(iso)
  return !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime()
}

const trialDaysRemaining = (trialEndsAt: string | null, now: Date): number => {
  if (!trialEndsAt) return 0
  const endsAt = new Date(trialEndsAt)
  if (Number.isNaN(endsAt.getTime())) return 0
  const dayDiff = Math.round(
    (utcMidnightOf(endsAt) - utcMidnightOf(now)) / MS_PER_DAY,
  )
  return Math.max(0, dayDiff)
}

const clampTrialDay = (daysRemaining: number): number =>
  Math.min(Math.max(TRIAL_LENGTH_DAYS - daysRemaining, 1), TRIAL_LENGTH_DAYS)

const managePortalCta = (label: string): PlanCardCta => ({
  label,
  kind: 'primary',
  action: 'portal',
})

const baseContent = {
  betaChip: false,
  chip: null,
  chipMuted: false,
  rail: null,
  emphasis: false,
  founderGradient: false,
} satisfies Partial<PlanCardContent>

export const resolvePlanCard = (
  planState: PlanState,
  now: Date = new Date(),
): PlanCardContent => {
  const { plan, roleComped, status, onTrial, trialEndsAt } = planState
  const periodEnd = formatPeriodEnd(planState.currentPeriodEnd)

  // 1 — dunning outranks celebration (#782; pinned since PR 3.1).
  if (status === 'past_due') {
    // Defensive: plan should stay paid during the dunning window; if the
    // API ever reports past_due on a free plan, name Premium (#782 call).
    const tier: PaidTier = isPaidTier(plan) ? plan : 'premium'
    const tierDef = TIER_DEFINITIONS[tier]
    const copy = PLAN_CARD_COPY.pastDue
    return {
      ...baseContent,
      variant: 'past-due',
      tone: 'warning',
      badgeTier: tier,
      chip: copy.chip,
      eyebrow: copy.eyebrow(tierDef.priceText),
      headline: copy.headline,
      body: copy.body(tierDef.name, periodEnd),
      punchline: copy.punchline,
      rail: {
        tone: 'warning',
        label: copy.railLabel(tierDef.name, periodEnd),
        sub: copy.railSub,
      },
      ctas: [
        {
          label: copy.updateCardCta,
          kind: 'primary',
          action: 'portal',
          glow: true,
          portalArrow: true,
        },
        { label: copy.manageCta, kind: 'ghost', action: 'portal' },
      ],
    }
  }

  // 2 — gifted / role-comped: gratitude voice, no payment relationship
  // to manage (#781 §4). Discovery-only CTA.
  if (roleComped || plan === 'gifted') {
    const copy = PLAN_CARD_COPY.gifted
    return {
      ...baseContent,
      variant: 'gifted',
      tone: 'signal',
      badgeTier: 'premium',
      betaChip: true,
      eyebrow: copy.eyebrow,
      headline: copy.headline,
      body: copy.body,
      punchline: copy.punchline,
      ctas: [{ label: copy.discoverCta, kind: 'ghost', action: 'tier-picker' }],
    }
  }

  // 3 — trial (Decision 7: card-less Premium trial; no portal to manage).
  if (onTrial) {
    const daysRemaining = trialDaysRemaining(trialEndsAt, now)
    const trialEndDisplay = formatPeriodEnd(trialEndsAt)
    const chip = PLAN_CARD_COPY.trial.chip
    if (daysRemaining <= 0) {
      const copy = PLAN_CARD_COPY.trial.endsToday
      return {
        ...baseContent,
        variant: 'trial-ends-today',
        tone: 'signal',
        badgeTier: 'premium',
        chip,
        eyebrow: copy.eyebrow,
        headline: copy.headline,
        body: copy.body,
        punchline: copy.punchline,
        rail: { tone: 'signal', label: copy.railLabel, sub: copy.railSub },
        emphasis: true,
        ctas: [
          {
            label: copy.cta,
            kind: 'primary',
            action: 'tier-picker',
            glow: true,
          },
        ],
      }
    }
    if (daysRemaining === 1) {
      const copy = PLAN_CARD_COPY.trial.endsTomorrow
      return {
        ...baseContent,
        variant: 'trial-ends-tomorrow',
        tone: 'signal',
        badgeTier: 'premium',
        chip,
        eyebrow: copy.eyebrow,
        headline: copy.headline,
        body: copy.body,
        punchline: copy.punchline,
        rail: {
          tone: 'signal',
          label: copy.railLabel,
          sub: copy.railSub(
            clampTrialDay(daysRemaining),
            TRIAL_LENGTH_DAYS,
            trialEndDisplay,
          ),
        },
        emphasis: true,
        ctas: [
          {
            label: copy.cta,
            kind: 'primary',
            action: 'tier-picker',
            glow: true,
          },
        ],
      }
    }
    const copy = PLAN_CARD_COPY.trial.early
    return {
      ...baseContent,
      variant: 'trial-early',
      tone: 'signal',
      badgeTier: 'premium',
      chip,
      eyebrow: copy.eyebrow(clampTrialDay(daysRemaining), TRIAL_LENGTH_DAYS),
      headline: copy.headline,
      body: copy.body(daysRemaining),
      punchline: copy.punchline,
      ctas: [{ label: copy.cta, kind: 'primary', action: 'tier-picker' }],
    }
  }

  // 4 — cancel-at-period-end grace window (#780). Portal restores
  // auto-renew (one-tap Resubscribe is the PR 4.5 in-app flow).
  if (planState.cancelAtPeriodEnd && isPaidTier(plan)) {
    const tierDef = TIER_DEFINITIONS[plan]
    const copy = PLAN_CARD_COPY.cancelGrace
    return {
      ...baseContent,
      variant: 'cancel-grace',
      tone: plan === 'supporter' ? 'accent' : 'signal',
      badgeTier: plan,
      chip: copy.chip,
      chipMuted: true,
      eyebrow: copy.eyebrow(tierDef.name, periodEnd),
      headline: copy.headline(tierDef.name, periodEnd),
      body: copy.body(tierDef.name, periodEnd),
      punchline: copy.punchline,
      rail: {
        tone: 'muted',
        label: copy.railLabel(periodEnd),
        sub: copy.railSub,
      },
      ctas: [managePortalCta(copy.manageCta)],
    }
  }

  // 5 — active paid tiers.
  if (plan === 'supporter') {
    const copy = PLAN_CARD_COPY.activeSupporter
    return {
      ...baseContent,
      variant: 'active-supporter',
      tone: 'accent',
      badgeTier: 'supporter',
      eyebrow: copy.eyebrow(TIER_DEFINITIONS.supporter.priceText, periodEnd),
      headline: copy.headline,
      body: copy.body,
      punchline: copy.punchline,
      ctas: [managePortalCta(copy.manageCta)],
    }
  }
  if (plan === 'founder') {
    const copy = PLAN_CARD_COPY.activeFounder
    return {
      ...baseContent,
      variant: 'active-founder',
      tone: 'accent',
      badgeTier: 'founder',
      eyebrow: copy.eyebrow(TIER_DEFINITIONS.founder.priceText, periodEnd),
      headline: copy.headline,
      body: copy.body,
      punchline: copy.punchline,
      founderGradient: true,
      ctas: [managePortalCta(copy.manageCta)],
    }
  }
  if (plan === 'premium') {
    const copy = PLAN_CARD_COPY.activePremium
    return {
      ...baseContent,
      variant: 'active-premium',
      tone: 'signal',
      badgeTier: 'premium',
      eyebrow: copy.eyebrow(TIER_DEFINITIONS.premium.priceText, periodEnd),
      headline: copy.headline,
      body: copy.body,
      punchline: copy.punchline,
      ctas: [managePortalCta(copy.manageCta)],
    }
  }

  // 6 — free / logged-out, with lifecycle context where the fields
  // make it reachable (KISS: no new columns, existing PlanState only).
  const freeBadge: TierKey | null = null
  if (status === 'cancelled') {
    const copy = PLAN_CARD_COPY.freePostCancel
    return {
      ...baseContent,
      variant: 'free-post-cancel',
      tone: 'accent',
      badgeTier: freeBadge,
      chip: copy.chip(periodEnd),
      eyebrow: copy.eyebrow,
      headline: copy.headline,
      body: copy.body(periodEnd),
      punchline: copy.punchline,
      ctas: [{ label: copy.cta, kind: 'primary', action: 'tier-picker' }],
    }
  }
  // Post-trial context only applies once the trial has actually ended; a
  // future (or unparseable) trialEndsAt on a free plan is inconsistent
  // state and falls through to the plain free card.
  if (
    plan === 'free' &&
    trialEndsAt !== null &&
    isPastTimestamp(trialEndsAt, now)
  ) {
    const copy = PLAN_CARD_COPY.freePostTrial
    const endedAt = formatPeriodEnd(trialEndsAt)
    return {
      ...baseContent,
      variant: 'free-post-trial',
      tone: 'signal',
      badgeTier: freeBadge,
      chip: copy.chip(endedAt),
      eyebrow: copy.eyebrow,
      headline: copy.headline,
      body: copy.body,
      punchline: copy.punchline,
      ctas: [{ label: copy.cta, kind: 'primary', action: 'tier-picker' }],
    }
  }
  const copy = PLAN_CARD_COPY.free
  return {
    ...baseContent,
    variant: 'free',
    tone: 'muted',
    badgeTier: freeBadge,
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    body: copy.body,
    punchline: copy.punchline,
    ctas: [{ label: copy.cta, kind: 'primary', action: 'tier-picker' }],
  }
}
