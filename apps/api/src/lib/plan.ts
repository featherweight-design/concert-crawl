import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db, giftedComps, subscriptions, userBilling } from '@concert-crawl/db'
import type { PlanState } from '@concert-crawl/types'
import { derivePlanState, isGiftLive } from '@concert-crawl/entitlements'
import { apiLogger } from './logger.js'
import { resolveTrialEndsAt } from './trial.js'

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

// The two instants the trial clock needs, passed together so a caller cannot
// supply the account without the cutover it is measured against.
// `monetizationLiveAt` is `founder_window.opensAt` — null before launch.
export interface TrialSeed {
  accountCreatedAt: Date
  monetizationLiveAt: Date | null
}

/**
 * Starts the card-less trial clock (spec §3, "Row creation"). Idempotent: a
 * trial is granted exactly once per account and no later call can extend it.
 * Returns the account's trial expiry, or null when it gets no trial.
 */
const seedTrial = async (
  userId: string,
  seed: TrialSeed,
): Promise<Date | null> => {
  const trialEndsAt = resolveTrialEndsAt(
    seed.accountCreatedAt,
    seed.monetizationLiveAt,
  )
  if (trialEndsAt === null) return null

  // The row may already exist without a trial: billing-nudges, the daily job
  // and the Stripe webhooks all upsert user_billing for their own columns, and
  // any of them can land first. So fill a null trialEndsAt rather than skipping
  // — but never touch a non-null one. setWhere is what makes this safe to run
  // repeatedly: it cannot extend a live trial or re-grant an ended one.
  const written = await db
    .insert(userBilling)
    .values({ userId, trialEndsAt })
    .onConflictDoUpdate({
      target: userBilling.userId,
      set: { trialEndsAt, updatedAt: new Date() },
      setWhere: isNull(userBilling.trialEndsAt),
    })
    .returning({ trialEndsAt: userBilling.trialEndsAt })
  if (written[0] !== undefined) return written[0].trialEndsAt

  // Empty means setWhere was false: the row already carries a trial. That value
  // is authoritative — read it back rather than reporting none, which would
  // show a trial user the free plan for this one response.
  const [existing] = await db
    .select({ trialEndsAt: userBilling.trialEndsAt })
    .from(userBilling)
    .where(eq(userBilling.userId, userId))
    .limit(1)
  return existing?.trialEndsAt ?? null
}

// Loads DB context and derives PlanState + nudge timestamps for an
// authenticated user. publicMetadata is Clerk's untyped payload — parsed at
// the boundary. `trialSeed` carries the two instants the trial clock needs;
// omit it on paths that must not seed.
export async function loadPlanContext(
  userId: string,
  publicMetadata: unknown,
  trialSeed?: TrialSeed,
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

  // Where the trial clock starts (spec §3). Keyed on a null trialEndsAt rather
  // than a missing row, because another writer may have created the row for its
  // own columns and left the trial unset — gating on the row would drop that
  // user's trial permanently. Ineligible accounts return before any write.
  let trialEndsAt = billingRow?.trialEndsAt ?? null
  if (trialEndsAt === null && trialSeed !== undefined) {
    try {
      trialEndsAt = await seedTrial(userId, trialSeed)
    } catch (err) {
      apiLogger.error(
        { err, userId },
        'trial seed failed — treating as no trial',
      )
    }
  }

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
    billing: { trialEndsAt },
    now,
  })

  return {
    planState,
    trialEndsAt,
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
