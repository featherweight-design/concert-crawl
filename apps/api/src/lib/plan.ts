import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, giftedComps, subscriptions, userBilling } from '@concert-crawl/db'
import type { PlanState } from '@concert-crawl/types'
import { derivePlanState, isGiftLive } from '@concert-crawl/entitlements'
import { apiLogger } from './logger.js'

// Pure derivation moved to @concert-crawl/entitlements (#763 PR 10) so the
// crawler's Spotify fan-out can gate on plan without importing API code.
// Re-exported here so existing consumers (plan.test.ts, nudges.ts) are
// unchanged.
export {
  derivePlanState,
  LIVE_STATUSES,
  type PlanDerivationInput,
} from '@concert-crawl/entitlements'

const publicMetadataSchema = z.object({
  role: z.string().optional(),
  plan: z.string().optional(),
})

// Nudge-predicate timestamps from user_billing, as Dates so callers never
// reparse the PlanState ISO strings (eng infra spec Part 2 §6; PR 4.2).
export interface PlanContext {
  planState: PlanState
  trialEndsAt: Date | null
  nudgeTimestamps: {
    lastTrialEndedShownAt: Date | null
    dayThirteenBannerDismissedAt: Date | null
    pastDueBannerDismissedAt: Date | null
  }
}

// Loads DB context and derives PlanState + nudge timestamps for an
// authenticated user. publicMetadata is Clerk's untyped payload — parsed at
// the boundary.
export async function loadPlanContext(
  userId: string,
  publicMetadata: unknown,
): Promise<PlanContext> {
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
      .select({
        trialEndsAt: userBilling.trialEndsAt,
        lastTrialEndedShownAt: userBilling.lastTrialEndedShownAt,
        dayThirteenBannerDismissedAt: userBilling.dayThirteenBannerDismissedAt,
        pastDueBannerDismissedAt: userBilling.pastDueBannerDismissedAt,
      })
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

  const planState = derivePlanState({
    userId,
    role: metadata.role,
    giftedComp: giftRow ?? null,
    subscription: subRow ?? null,
    billing: billingRow ? { trialEndsAt: billingRow.trialEndsAt } : null,
    now,
  })

  return {
    planState,
    trialEndsAt: billingRow?.trialEndsAt ?? null,
    nudgeTimestamps: {
      lastTrialEndedShownAt: billingRow?.lastTrialEndedShownAt ?? null,
      dayThirteenBannerDismissedAt:
        billingRow?.dayThirteenBannerDismissedAt ?? null,
      pastDueBannerDismissedAt: billingRow?.pastDueBannerDismissedAt ?? null,
    },
  }
}

// Thin wrapper — existing callers only need the derived PlanState.
export async function loadPlanState(
  userId: string,
  publicMetadata: unknown,
): Promise<PlanState> {
  const context = await loadPlanContext(userId, publicMetadata)
  return context.planState
}
