import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, giftedComps, subscriptions, userBilling } from '@concert-crawl/db'
import type { PlanState, SubscriptionStatus } from '@concert-crawl/types'
import { PREMIUM_ROLES, isRole } from '@concert-crawl/types'
import { apiLogger } from './logger.js'

type SubscriptionTier = (typeof subscriptions.$inferSelect)['tier']

export interface PlanDerivationInput {
  userId: string | null
  role: string | undefined
  giftedComp: { revokedAt: Date | null; expiresAt: Date | null } | null
  subscription: {
    tier: SubscriptionTier
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
const LIVE_STATUSES: readonly SubscriptionStatus[] = [
  'active',
  'past_due',
  'trialing',
]

const PAID_TIER_PLANS: Partial<Record<SubscriptionTier, PlanState['plan']>> = {
  founder: 'founder',
  premium: 'premium',
  supporter: 'supporter',
}

const isGiftLive = (
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

const publicMetadataSchema = z.object({
  role: z.string().optional(),
  plan: z.string().optional(),
})

// Loads DB context and derives PlanState for an authenticated user.
// publicMetadata is Clerk's untyped payload — parsed at the boundary.
export async function loadPlanState(
  userId: string,
  publicMetadata: unknown,
): Promise<PlanState> {
  const parsedMetadata = publicMetadataSchema.safeParse(publicMetadata)
  const metadata = parsedMetadata.success ? parsedMetadata.data : {}

  const [[giftRow], [subRow], [billingRow]] = await Promise.all([
    db
      .select({
        revokedAt: giftedComps.revokedAt,
        expiresAt: giftedComps.expiresAt,
      })
      .from(giftedComps)
      .where(eq(giftedComps.userId, userId))
      .limit(1),
    db
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1),
    db
      .select({ trialEndsAt: userBilling.trialEndsAt })
      .from(userBilling)
      .where(eq(userBilling.userId, userId))
      .limit(1),
  ])

  const now = new Date()
  const giftLive = isGiftLive(giftRow ?? null, now)
  const mirrorSaysGifted = metadata.plan === 'premium_gifted'
  // gifted_comps is the source of truth; the Clerk mirror is the JWT-fast
  // path. Disagreement is repaired by the gifting admin flows — here we log
  // so drift is visible (eng infra spec Part 1 §7).
  if (giftLive !== mirrorSaysGifted) {
    apiLogger.warn(
      { userId, giftLive, mirrorSaysGifted },
      'gifted_comps and Clerk publicMetadata.plan mirror disagree — table wins',
    )
  }

  return derivePlanState({
    userId,
    role: metadata.role,
    giftedComp: giftRow ?? null,
    subscription: subRow ?? null,
    billing: billingRow ?? null,
    now,
  })
}
