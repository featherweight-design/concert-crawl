import type { PlanState, SubscriptionStatus } from '@concert-crawl/types'
import { PREMIUM_ROLES, isRole } from '@concert-crawl/types'

// Pure plan derivation, moved here from apps/api/src/lib/plan.ts (#763 PR 10)
// so the crawler's Spotify fan-out can gate pushes on the premium
// entitlement without importing API code. apps/api re-exports these from
// lib/plan.ts so existing consumers are unchanged.
//
// `tier` is a plain string here (apps/api types it from the subscriptions
// Drizzle schema — entitlements deliberately has no db dependency because
// the web client imports it). Unknown tiers simply miss the PAID_TIER_PLANS
// lookup and fall through, identical to the previous behavior.
export interface PlanDerivationInput {
  userId: string | null
  role: string | undefined
  giftedComp: { revokedAt: Date | null; expiresAt: Date | null } | null
  subscription: {
    tier: string
    status: SubscriptionStatus
    cancelAtPeriodEnd: boolean
    currentPeriodEnd: Date | null
  } | null
  billing: { trialEndsAt: Date | null } | null
  now?: Date
}

// Statuses that keep the paid tier live. past_due stays paid through the
// 7-day dunning window (#782 §1); the webhook flips it to cancelled at
// dunning exhaustion, which falls through to free on next derivation.
export const LIVE_STATUSES: readonly SubscriptionStatus[] = [
  'active',
  'past_due',
  'trialing',
]

const PAID_TIER_PLANS: Partial<Record<string, PlanState['plan']>> = {
  founder: 'founder',
  premium: 'premium',
  supporter: 'supporter',
}

export const isGiftLive = (
  gift: PlanDerivationInput['giftedComp'],
  now: Date,
): boolean =>
  gift !== null &&
  gift.revokedAt === null &&
  (gift.expiresAt === null || gift.expiresAt.getTime() > now.getTime())

// Derivation order locked by #781's exclusions table: gifted BEFORE Stripe.
export const derivePlanState = (input: PlanDerivationInput): PlanState => {
  const now = input.now ?? new Date()

  if (!input.userId) {
    return {
      plan: 'logged-out',
      onTrial: false,
      trialEndsAt: null,
      status: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      roleComped: false,
    }
  }

  const roleComped = isRole(input.role) && PREMIUM_ROLES.includes(input.role)

  const trialEndsAt = input.billing?.trialEndsAt ?? null

  const base: Omit<PlanState, 'plan' | 'onTrial'> = {
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    status: input.subscription?.status ?? null,
    cancelAtPeriodEnd: input.subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd:
      input.subscription?.currentPeriodEnd?.toISOString() ?? null,
    roleComped,
  }

  if (isGiftLive(input.giftedComp, now)) {
    return { ...base, plan: 'gifted', onTrial: false }
  }

  if (input.subscription && LIVE_STATUSES.includes(input.subscription.status)) {
    const tierPlan = PAID_TIER_PLANS[input.subscription.tier]
    if (tierPlan) {
      return { ...base, plan: tierPlan, onTrial: false }
    }
  }

  if (trialEndsAt && trialEndsAt.getTime() > now.getTime()) {
    return { ...base, plan: 'premium', onTrial: true }
  }

  return { ...base, plan: 'free', onTrial: false }
}
