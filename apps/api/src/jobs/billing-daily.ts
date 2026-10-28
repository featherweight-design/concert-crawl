// apps/api/src/jobs/billing-daily.ts
//
// The daily billing background job (eng infra spec Part 2 §5.1). Runs as the
// Render Cron Job `concert-crawl-billing-jobs` (staging + prod) on the schedule
// `0 15 * * *` = 15:00 UTC (9 AM MDT / 8 AM MST — see render.yaml for the
// UTC/DST rationale). The cron builds the API (`turbo build`) and runs the
// compiled artifact via `node apps/api/dist/jobs/billing-daily.js` — the same
// deploy build as the API, no new package and no `tsx` at runtime. Env:
// DATABASE_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, CLERK_SECRET_KEY.
//
// Eight independent sub-tasks (§5.1, plus the #737 notification prune), each
// wrapped in its own try/catch and logged via apiLogger — one failure never
// blocks the rest. Idempotency comes
// from the email dedupe keys + subscription_events existence checks, so a
// re-run (or a missed day catching up) is safe.
//
//   runCardExpiryWarnings   — task 1  (card_expiring_soon at 30/14/7 days)
//   runGiftEndingNotices    — task 2  (gifting_ending_notice + expired-gift revoke)
//   runTrialEndEvents       — task 3  (trial_ended event + premiumDataExpiresAt)
//   runWinback              — task 4  (winback email, day-60 post-cancel)
//   runNinetyDayPurge       — task 5  (§5.3 preserve-then-purge)
//   runDunningFallbackSweep — task 6  (past_due > 8d webhook-loss safety net)
//   runHousekeeping         — task 7  (prune processed events; retry failed sends)
//   runNotificationPrune    — task 8  (#737: delete user_notification rows past
//                                      the 90-day retention window)
//
// Task 8 is not a billing concern; it lives here because this is the only daily
// cron in apps/api and a per-watcher fan-out table needs a daily prune. Adding a
// second Render cron for one DELETE would not earn its keep.
//
// SCHEMA LIMITATIONS called out where they bite (see the per-task headers):
//   - No card-cache columns on `subscriptions` yet (the `customer.updated` /
//     `payment_method.attached` webhooks are logged no-ops until they land),
//     so task 1 ALWAYS takes the Stripe payment-method fetch fallback.
//   - No alert-prefs table and no Spotify sync-state table exist (Spotify sync
//     is a future design, #763), so task 5 implements only the reachable
//     categories (attended history + follows) and log-skips the rest.
//   - `email_send_log` has no metadata/attempt-count column and does not
//     persist template vars, so task 7's "retry failed sends" can only be
//     safely implemented for templates whose vars are re-derivable; it is
//     log-skipped with an explicit comment until the schema supports it.

import { pathToFileURL } from 'node:url'
import { and, eq, isNotNull, isNull, lt, lte, ne, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import {
  db,
  giftedComps,
  processedStripeEvents,
  subscriptionEvents,
  subscriptions,
  userArtistFollows,
  userBilling,
  userEvents,
} from '@concert-crawl/db'
import {
  canUseFeature,
  isGiftLive,
  USER_PLANS,
} from '@concert-crawl/entitlements'
import type { PremiumFeature } from '@concert-crawl/entitlements'
import { isRole, PREMIUM_ROLES } from '@concert-crawl/types'
import { sendTransactionalEmail } from '../lib/email.js'
import { buildUnsubscribeUrl } from '../lib/email-unsubscribe.js'
import type { PaidEmailTier } from '../emails/types.js'
import { apiLogger } from '../lib/logger.js'
import { pruneNotifications } from '../lib/prune-notifications.js'
import {
  getBillingJobStripeClient,
  type BillingJobStripeClient,
} from './billing-daily-stripe.js'

const DAY_MS = 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * DAY_MS
const WINBACK_DELAY_MS = 60 * DAY_MS
const GIFT_ENDING_WINDOW_MS = 7 * DAY_MS
const DUNNING_FALLBACK_AGE_MS = 8 * DAY_MS
const PROCESSED_EVENT_RETENTION_MS = NINETY_DAYS_MS

// Card-expiry warning windows (§5.1 task 1). A card is warned for the TIGHTEST
// window it currently falls into, so a card 6 days out sends the 7-day notice
// (not 30/14). This array is the set of valid window values (used for the
// CardExpiryWindow type); the tightest-band selection is done by the explicit
// if-ladder in selectCardExpiryWindow, not by iterating this array.
export const CARD_EXPIRY_WINDOWS = [30, 14, 7] as const
export type CardExpiryWindow = (typeof CARD_EXPIRY_WINDOWS)[number]

// Premium-and-up: a live subscription on one of these is never purge-eligible
// (isPurgeEligible) and counts as an upgrade for the trial reminders. Mirrors
// PREMIUM_AND_UP in stripe-webhook-handlers.ts.
const PREMIUM_AND_UP: readonly string[] = ['premium', 'founder']

// Tiers whose cancellation starts the 90-day preserve-then-purge clock (#780
// §5). Supporter joined in #1229: since the 2026-07-29 amendment it unlocks
// concert history and calendar export, and Hugh ruled its data purges like
// the other tiers'. Mirrors PURGE_CLOCK_TIERS in stripe-webhook-handlers.ts.
const PURGE_CLOCK_TIERS: readonly string[] = ['supporter', 'premium', 'founder']

const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: 'Free',
  premium: 'Premium',
  supporter: 'Supporter',
  founder: 'Founder',
}

const tierDisplayName = (tier: string | null): string | null =>
  tier !== null ? (TIER_DISPLAY_NAMES[tier] ?? null) : null

// Narrows a raw subscriptions.tier string to the paid-tier union the email
// templates accept, so card_expiring_soon can render the tier-aware accent +
// badge. 'free' (and any unknown value) yields undefined — the template then
// falls back to the neutral signal accent and omits the badge.
const isPaidEmailTier = (tier: string | null): tier is PaidEmailTier =>
  tier === 'premium' || tier === 'supporter' || tier === 'founder'

// ---------------------------------------------------------------------------
// Pure decidable helpers (unit-tested directly, no DB)
// ---------------------------------------------------------------------------

/**
 * A Stripe card expires at the END of its exp month — a card marked 06/2026 is
 * valid through 2026-06-30 23:59:59. We treat the expiry instant as the start
 * of the following month (2026-07-01T00:00:00Z) so "days remaining" is honest.
 */
export const cardExpiryInstant = (expMonth: number, expYear: number): Date =>
  new Date(Date.UTC(expYear, expMonth, 1))

/**
 * Whole days between `now` and the card's expiry instant. Negative once the
 * card has already lapsed. Floors to whole days so a card 6.5 days out reads
 * as 6 (never rounds up into a window it hasn't reached).
 */
export const daysUntilCardExpiry = (
  expMonth: number,
  expYear: number,
  now: Date,
): number =>
  Math.floor(
    (cardExpiryInstant(expMonth, expYear).getTime() - now.getTime()) / DAY_MS,
  )

/**
 * Which warning window a card falls into given days-remaining, or null if it
 * is outside every window (too far out, or already lapsed). The window is the
 * TIGHTEST band the card currently sits inside: 0<days<=7 → 7, 7<days<=14 → 14,
 * 14<days<=30 → 30. Because the dedupe key carries the window, a card crossing
 * from the 30 band into the 14 band sends a fresh notice; re-runs inside the
 * same band dedupe to a single send.
 */
export const selectCardExpiryWindow = (
  daysRemaining: number,
): CardExpiryWindow | null => {
  if (daysRemaining <= 0) return null
  if (daysRemaining <= 7) return 7
  if (daysRemaining <= 14) return 14
  if (daysRemaining <= 30) return 30
  return null
}

/** card_expiring_soon dedupe key (design table CE-6). */
export const cardExpiryDedupeKey = (input: {
  cardFingerprint: string
  expMonth: number
  expYear: number
  window: CardExpiryWindow
}): string =>
  `${input.cardFingerprint}:${input.expMonth}-${input.expYear}:${input.window}`

/** A gift is "ending soon" when it expires within the next 7 days (GE-1). */
export const isGiftEndingSoon = (
  expiresAt: Date | null,
  now: Date,
): boolean => {
  if (expiresAt === null) return false // lifetime gift — never ends
  const remaining = expiresAt.getTime() - now.getTime()
  return remaining > 0 && remaining <= GIFT_ENDING_WINDOW_MS
}

/** A gift is expired (past its end) and still needs revoking (§5.1 task 2). */
export const isGiftExpired = (expiresAt: Date | null, now: Date): boolean =>
  expiresAt !== null && expiresAt.getTime() <= now.getTime()

/**
 * Winback fires exactly 60 days after cancel completion (WB-1), single-shot.
 * True once `now` has reached cancelledAt + 60d. The dedupe key + the
 * event-existence guards make an already-fired winback a no-op, so this only
 * needs to gate the earliest fire.
 */
export const isWinbackDue = (cancelledAt: Date, now: Date): boolean =>
  now.getTime() - cancelledAt.getTime() >= WINBACK_DELAY_MS

/** winback dedupe key (WB-2). */
export const winbackDedupeKey = (subscriptionId: string): string =>
  `sub:${subscriptionId}`

/**
 * Purge guard (§5.3): a user is purge-eligible only when the 90-day clock has
 * elapsed AND their current tier is still non-premium. A re-upgrade clears
 * premiumDataExpiresAt via webhook, but we re-check the tier here so a race
 * (re-upgrade landing between the clock read and the purge) never deletes live
 * premium data. `liveTier` is the user's current subscription tier (null when
 * they have no live paid subscription). `compedPremium` is a live gifted comp
 * or a PREMIUM_ROLES role, either of which grants Premium whatever the
 * subscription says: a user who cancelled while holding one is still entitled
 * to everything, so nothing purges.
 */
export const isPurgeEligible = (input: {
  premiumDataExpiresAt: Date | null
  liveTier: string | null
  compedPremium?: boolean
  now: Date
}): boolean => {
  if (input.premiumDataExpiresAt === null) return false
  if (input.premiumDataExpiresAt.getTime() >= input.now.getTime()) return false
  if (input.compedPremium === true) return false
  // Still-premium (re-upgraded) users are never purged.
  if (input.liveTier !== null && PREMIUM_AND_UP.includes(input.liveTier)) {
    return false
  }
  return true
}

/**
 * Per-category purge guard. `isPurgeEligible` decides whether a user enters the
 * purge at all; this decides which categories are actually deleted once they
 * do. The distinction matters for a live Supporter (one who re-subscribed with
 * a clock still running): they fall below PREMIUM_AND_UP, so their follows are
 * still purged, but concert history and calendar export are Supporter unlocks
 * (2026-07-29 amendment) and deleting their history would destroy data they
 * are paying for. A cancelled Supporter has no live tier, so theirs purges.
 *
 * Delegates to the entitlements matrix rather than a second hardcoded tier list
 * so a future matrix edit can never silently desync from the purge.
 */
export const shouldPurgeFeature = (
  liveTier: string | null,
  feature: PremiumFeature,
): boolean => {
  const plan = USER_PLANS.find((candidate) => candidate === liveTier)
  // `liveTier` is a subscription-tier string, so an unrecognized or absent
  // value means no active subscription row grants this feature. Role-comped
  // entitlement is out of scope here: the caller only reads the subscriptions
  // table, and a comped user has no premiumDataExpiresAt clock to expire in
  // the first place, so they never reach the purge.
  if (plan === undefined) return true
  return !canUseFeature({ plan, roleComped: false }, feature)
}

/**
 * Where-clause for the 90-day purge's follows delete (E9): manual rows only.
 * Spotify-sourced follows (source = 'spotify_followed' | 'spotify_top') live
 * and die with the Spotify connection (PR 3 disconnect purge), never the
 * billing clock. Exported as a pure helper so the delete scope is
 * unit-testable (billing-daily has no integration harness yet — #914).
 * Returns non-optional `SQL` so no call site can ever pass `undefined` into
 * `.where()` (which would widen the delete to the whole table); the guard is
 * unreachable because both `and()` predicates are always defined.
 */
export const purgeFollowsWhere = (userId: string): SQL => {
  const condition = and(
    eq(userArtistFollows.userId, userId),
    eq(userArtistFollows.source, 'manual'),
  )
  if (condition === undefined) {
    throw new Error('purgeFollowsWhere: and() returned undefined')
  }
  return condition
}

/**
 * Whether a cancellation of `tier` should start the 90-day preserve-then-purge
 * clock. Mirrors the PURGE_CLOCK_TIERS gate in handleSubscriptionDeleted: every
 * paid tier, Supporter included since #1229 (Hugh, 2026-07-29: "We should purge
 * Supporter data if we do it with other tiers"). Used by the task-6
 * lost-webhook reconcile so a synthesized cancellation starts the same clock
 * the real webhook would have.
 */
export const cancellationStartsPurgeClock = (tier: string | null): boolean =>
  tier !== null && PURGE_CLOCK_TIERS.includes(tier)

// ---------------------------------------------------------------------------
// Task 1 — Card-expiry warnings
// ---------------------------------------------------------------------------

/**
 * SCHEMA LIMITATION: `subscriptions` has no cached card-metadata columns yet
 * (the `customer.updated` / `payment_method.attached` webhooks are logged
 * no-ops in stripe-webhooks.ts until those columns land). The spec's "prefer
 * cached card metadata" path is therefore unreachable today — we ALWAYS take
 * the fallback: fetch the customer's default payment method from Stripe. When
 * the card cache lands, add a cache read here before the fetch.
 */
export const runCardExpiryWarnings = async (
  now: Date,
  stripe: BillingJobStripeClient,
): Promise<void> => {
  // Active/trialing/past_due all keep a live card on file worth warning about.
  const rows = await db
    .select({
      userId: subscriptions.userId,
      stripeCustomerId: subscriptions.stripeCustomerId,
      tier: subscriptions.tier,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(sql`${subscriptions.status} in ('active', 'trialing', 'past_due')`)

  for (const row of rows) {
    try {
      const card = await stripe.getDefaultCard(row.stripeCustomerId)
      if (card === null) continue // no card on file / non-card method

      const daysRemaining = daysUntilCardExpiry(
        card.expMonth,
        card.expYear,
        now,
      )
      const window = selectCardExpiryWindow(daysRemaining)
      if (window === null) continue

      await sendTransactionalEmail({
        templateKey: 'card_expiring_soon',
        userId: row.userId,
        dedupeKey: cardExpiryDedupeKey({
          cardFingerprint: card.fingerprint,
          expMonth: card.expMonth,
          expYear: card.expYear,
          window,
        }),
        vars: {
          tierName: tierDisplayName(row.tier),
          daysRemaining,
          ...(isPaidEmailTier(row.tier) ? { tier: row.tier } : {}),
          card: {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.expMonth,
            expYear: card.expYear,
          },
        },
      })
    } catch (err) {
      apiLogger.error(
        { err, userId: row.userId },
        'billing-daily task1: card-expiry check failed for one subscription — continuing',
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Task 2 — Gift-ending notices + expired-gift revoke
// ---------------------------------------------------------------------------

/**
 * Repairs the Clerk entitlement mirror after a gift revoke: clears
 * publicMetadata.plan when it still reads 'premium_gifted'. Mirrors the
 * source-of-truth pattern from loadPlanContext (plan.ts) — gifted_comps wins,
 * the Clerk mirror is repaired. Failure logs and does NOT throw (the DB revoke
 * already committed; a stale mirror self-heals on next loadPlanContext read,
 * which logs the drift).
 */
const repairGiftMirror = async (userId: string): Promise<void> => {
  const clerkSecretKey = process.env['CLERK_SECRET_KEY']
  if (!clerkSecretKey) {
    apiLogger.warn(
      { userId },
      'billing-daily task2: CLERK_SECRET_KEY not set — gift mirror repair skipped',
    )
    return
  }
  try {
    // Lazy import so the job never requires Clerk unless a revoke happens.
    const { createClerkClient } = await import('@clerk/backend')
    const clerkClient = createClerkClient({ secretKey: clerkSecretKey })
    const user = await clerkClient.users.getUser(userId)
    const currentPlan = (user.publicMetadata as { plan?: unknown }).plan
    if (currentPlan === 'premium_gifted') {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: { plan: null },
      })
    }
  } catch (err) {
    apiLogger.error(
      { err, userId },
      'billing-daily task2: gift mirror repair failed — DB revoke stands, mirror self-heals on next read',
    )
  }
}

/**
 * Revokes an expired gift: sets revokedAt, repairs the Clerk mirror, writes a
 * gift_revoked event (guarded by existence so a re-run never double-writes),
 * and starts the 90-day preserve-then-purge clock at expiresAt + 90d (§5.3
 * clock-start = gift expiry). Reuses the same event-write + userBilling upsert
 * shape as the webhook handlers.
 */
const revokeExpiredGift = async (input: {
  giftId: string
  userId: string
  expiresAt: Date
}): Promise<void> => {
  // Atomic: the revoke UPDATE, the gift_revoked event, and the 90-day clock
  // must land together. `runGiftEndingNotices` filters on `revoked_at is null`,
  // so if the revoke committed but the event/clock did not, the gift would be
  // skipped on every future run and the clock would be permanently missed.
  // The transaction makes a partial failure roll the revoke back so the next
  // run retries the whole unit.
  const premiumDataExpiresAt = new Date(
    input.expiresAt.getTime() + NINETY_DAYS_MS,
  )
  await db.transaction(async (tx) => {
    await tx
      .update(giftedComps)
      .set({ revokedAt: new Date() })
      .where(and(eq(giftedComps.id, input.giftId), sql`revoked_at is null`))

    // Event-existence guard: at most one gift_revoked per gift (idempotent
    // re-run). Matches the metadata-probe pattern in founder-seats.ts.
    const [existingEvent] = await tx
      .select({ id: subscriptionEvents.id })
      .from(subscriptionEvents)
      .where(
        and(
          eq(subscriptionEvents.type, 'gift_revoked'),
          sql`${subscriptionEvents.metadata}->>'giftId' = ${input.giftId}`,
        ),
      )
      .limit(1)
    if (existingEvent === undefined) {
      await tx.insert(subscriptionEvents).values({
        userId: input.userId,
        type: 'gift_revoked',
        metadata: { giftId: input.giftId, reason: 'expired' },
      })
    }

    // Start the 90-day clock at expiry (§5.3 clock-start rule for gift expiry).
    await tx
      .insert(userBilling)
      .values({ userId: input.userId, premiumDataExpiresAt })
      .onConflictDoUpdate({
        target: userBilling.userId,
        set: { premiumDataExpiresAt, updatedAt: new Date() },
      })
  })

  // Best-effort Clerk mirror repair AFTER the DB unit commits — it is an
  // external call that self-heals on next read, so it stays outside the tx.
  await repairGiftMirror(input.userId)
}

export const runGiftEndingNotices = async (now: Date): Promise<void> => {
  // Live gifts (not revoked) with a finite expiry, bounded to those already
  // expired or ending within the 7-day window — the only two actions this task
  // takes. Anything expiring farther out is irrelevant today, so we keep the
  // scan bounded as gifted_comps grows (avoids a full-table read every run).
  const endingCutoff = new Date(now.getTime() + GIFT_ENDING_WINDOW_MS)
  const rows = await db
    .select({
      giftId: giftedComps.id,
      userId: giftedComps.userId,
      grantedBy: giftedComps.grantedBy,
      expiresAt: giftedComps.expiresAt,
    })
    .from(giftedComps)
    .where(
      and(
        isNotNull(giftedComps.expiresAt),
        lte(giftedComps.expiresAt, endingCutoff),
        sql`revoked_at is null`,
      ),
    )

  for (const row of rows) {
    try {
      const expiresAt = row.expiresAt
      if (expiresAt === null) continue

      if (isGiftExpired(expiresAt, now)) {
        await revokeExpiredGift({
          giftId: row.giftId,
          userId: row.userId,
          expiresAt,
        })
        continue
      }

      if (isGiftEndingSoon(expiresAt, now)) {
        await sendTransactionalEmail({
          templateKey: 'gifting_ending_notice',
          userId: row.userId,
          dedupeKey: `gift:${row.giftId}`,
          vars: {
            // GE-5 ("names the gifter") is not satisfiable from today's data
            // model: gifted_comps.grantedBy is an admin Clerk ID (audit), not a
            // peer gifter — surfacing it would leak an admin's name into user
            // copy. There is no peer-gifter identity until the future gift-link
            // flow lands (see gifted_comps.redeemedAt "future gift-link flows").
            // Until then the template's warm fallback ("a friend of the crawl")
            // is the intended copy. Wire gifterName through once gift-links
            // populate a real gifter identity. Follow-up: #910.
            gifterName: null,
            giftEndsAt: expiresAt.toISOString(),
            unsubscribeUrl: buildUnsubscribeUrl(row.userId, 'product') ?? null,
          },
        })
      }
    } catch (err) {
      apiLogger.error(
        { err, giftId: row.giftId, userId: row.userId },
        'billing-daily task2: gift notice/revoke failed for one gift — continuing',
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Task 3 — Trial-end events
// ---------------------------------------------------------------------------

/**
 * Users whose trial crossed since the last run get a trial_ended event + the
 * 90-day clock started at trialEndsAt + 90d — but ONLY if they never upgraded
 * (still non-premium). No email (the takeover is session-driven). Idempotent
 * via a trial_ended event-existence check keyed to trialEndsAt.
 */
export const runTrialEndEvents = async (now: Date): Promise<void> => {
  // Billing rows whose trial has elapsed. We further gate on "never upgraded"
  // by checking for a live premium-and-up subscription per user.
  const rows = await db
    .select({
      userId: userBilling.userId,
      trialEndsAt: userBilling.trialEndsAt,
    })
    .from(userBilling)
    .where(
      and(isNotNull(userBilling.trialEndsAt), lt(userBilling.trialEndsAt, now)),
    )

  for (const row of rows) {
    try {
      const trialEndsAt = row.trialEndsAt
      if (trialEndsAt === null) continue

      // Never-upgraded gate: any live premium-and-up subscription means they
      // converted — no trial_ended clock.
      const [liveSub] = await db
        .select({ tier: subscriptions.tier, status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.userId, row.userId))
        .limit(1)
      const upgraded =
        liveSub !== undefined &&
        ['active', 'trialing', 'past_due'].includes(liveSub.status) &&
        PREMIUM_AND_UP.includes(liveSub.tier)
      if (upgraded) continue

      // Idempotency: one trial_ended per trial expiry (keyed to trialEndsAt so
      // a re-issued trial can fire again).
      const trialEndsAtIso = trialEndsAt.toISOString()
      const [existingEvent] = await db
        .select({ id: subscriptionEvents.id })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.type, 'trial_ended'),
            eq(subscriptionEvents.userId, row.userId),
            sql`${subscriptionEvents.metadata}->>'trialEndsAt' = ${trialEndsAtIso}`,
          ),
        )
        .limit(1)

      // Start the 90-day clock at trialEndsAt + 90d (§5.3 clock-start rule for
      // trial end). Event insert + clock start are one transaction so a crash
      // between them can't leave the event recorded with the clock unstarted.
      // We do NOT `continue` when the event already exists: a prior run may have
      // inserted the event but crashed before the clock update, so we still run
      // the clock update (guarded by `premium_data_expires_at is null`, which
      // makes it a no-op once a later event has set the clock).
      const premiumDataExpiresAt = new Date(
        trialEndsAt.getTime() + NINETY_DAYS_MS,
      )
      await db.transaction(async (tx) => {
        if (existingEvent === undefined) {
          await tx.insert(subscriptionEvents).values({
            userId: row.userId,
            type: 'trial_ended',
            metadata: { trialEndsAt: trialEndsAtIso },
          })
        }
        await tx
          .update(userBilling)
          .set({ premiumDataExpiresAt, updatedAt: new Date() })
          .where(
            and(
              eq(userBilling.userId, row.userId),
              sql`premium_data_expires_at is null`,
            ),
          )
      })
    } catch (err) {
      apiLogger.error(
        { err, userId: row.userId },
        'billing-daily task3: trial-end processing failed for one user — continuing',
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Task 4 — Winback
// ---------------------------------------------------------------------------

/**
 * 60 days after a cancel_completed event, if the user has no new live
 * subscription, send a single-shot winback email. Dedupe key sub:{id} keeps it
 * single-shot; the email_send_log claim is the durable guard.
 */
export const runWinback = async (now: Date): Promise<void> => {
  // cancel_completed events at least 60 days old. metadata carries
  // subscriptionId + tier (written by handleSubscriptionDeleted).
  const cutoff = new Date(now.getTime() - WINBACK_DELAY_MS)
  const rows = await db
    .select({
      userId: subscriptionEvents.userId,
      metadata: subscriptionEvents.metadata,
      createdAt: subscriptionEvents.createdAt,
    })
    .from(subscriptionEvents)
    .where(
      and(
        eq(subscriptionEvents.type, 'cancel_completed'),
        lte(subscriptionEvents.createdAt, cutoff),
      ),
    )

  for (const row of rows) {
    try {
      if (!isWinbackDue(row.createdAt, now)) continue

      const metadata =
        row.metadata !== null && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : {}
      const subscriptionId =
        typeof metadata['subscriptionId'] === 'string'
          ? metadata['subscriptionId']
          : null
      if (subscriptionId === null) {
        apiLogger.warn(
          { userId: row.userId },
          'billing-daily task4: cancel_completed event missing subscriptionId — cannot dedupe winback, skipping',
        )
        continue
      }
      const tier =
        typeof metadata['tier'] === 'string' ? metadata['tier'] : null

      // "no new active sub": a live subscription means they re-subscribed —
      // no winback.
      const [liveSub] = await db
        .select({ status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.userId, row.userId))
        .limit(1)
      const hasLiveSub =
        liveSub !== undefined &&
        ['active', 'trialing', 'past_due'].includes(liveSub.status)
      if (hasLiveSub) continue

      await sendTransactionalEmail({
        templateKey: 'winback',
        userId: row.userId,
        dedupeKey: winbackDedupeKey(subscriptionId),
        vars: {
          tierName: tierDisplayName(tier),
          unsubscribeUrl: buildUnsubscribeUrl(row.userId, 'product') ?? null,
        },
      })
    } catch (err) {
      apiLogger.error(
        { err, userId: row.userId },
        'billing-daily task4: winback failed for one user — continuing',
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Task 5 — 90-day preserve-then-purge (§5.3)
// ---------------------------------------------------------------------------

/**
 * Purges premium-only data for users whose 90-day clock elapsed AND whose
 * current tier is still non-premium (guard re-checked at purge time). Writes a
 * data_purged event with per-category counts, then clears premiumDataExpiresAt.
 *
 * SCHEMA LIMITATION: only two of the four §5.3 categories have tables today:
 *   - Concert history (attended)  → user_events with attending_at IS NOT NULL
 *     (Watching = status 'watching' is NEVER touched — Free feature, §5.3).
 *     Because both concerns share one row (#70), a row that is also watched is
 *     NULLed rather than deleted; only attendance-only rows are removed.
 *   - Following                   → user_artist_follows rows.
 * Alert prefs and Spotify sync state have NO tables yet (Spotify sync is a
 * future design, #763). Those categories are log-skipped with a count of null
 * so the data_purged event records that they were not applicable this run.
 */
/**
 * Whether the user holds a PREMIUM_ROLES role, read from Clerk publicMetadata
 * (the role's source of truth). Null when it can't be read, so the purge can
 * defer rather than guess.
 */
const loadRoleComped = async (userId: string): Promise<boolean | null> => {
  const clerkSecretKey = process.env['CLERK_SECRET_KEY']
  if (!clerkSecretKey) return null
  try {
    const { createClerkClient } = await import('@clerk/backend')
    const clerkClient = createClerkClient({ secretKey: clerkSecretKey })
    const user = await clerkClient.users.getUser(userId)
    const metadata: unknown = user.publicMetadata
    const role =
      typeof metadata === 'object' && metadata !== null && 'role' in metadata
        ? metadata.role
        : undefined
    return isRole(role) && PREMIUM_ROLES.includes(role)
  } catch (err) {
    apiLogger.warn(
      { err, userId },
      'billing-daily task5: Clerk role read failed',
    )
    return null
  }
}

export const runNinetyDayPurge = async (now: Date): Promise<void> => {
  const rows = await db
    .select({
      userId: userBilling.userId,
      premiumDataExpiresAt: userBilling.premiumDataExpiresAt,
    })
    .from(userBilling)
    .where(
      and(
        isNotNull(userBilling.premiumDataExpiresAt),
        lt(userBilling.premiumDataExpiresAt, now),
      ),
    )

  for (const row of rows) {
    try {
      // Re-check the tier guard at purge time (§5.3): a re-upgrade landing
      // between clock-set and now must abort the purge.
      const [liveSub] = await db
        .select({ tier: subscriptions.tier, status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.userId, row.userId))
        .limit(1)
      const liveTier =
        liveSub !== undefined &&
        ['active', 'trialing', 'past_due'].includes(liveSub.status)
          ? liveSub.tier
          : null
      // A live gift grants Premium regardless of the subscription (gifted is
      // derived BEFORE Stripe, #781), so the purge must check it too.
      const [gift] = await db
        .select({
          revokedAt: giftedComps.revokedAt,
          expiresAt: giftedComps.expiresAt,
        })
        .from(giftedComps)
        .where(eq(giftedComps.userId, row.userId))
        .limit(1)

      if (
        !isPurgeEligible({
          premiumDataExpiresAt: row.premiumDataExpiresAt,
          liveTier,
          compedPremium: isGiftLive(gift ?? null, now),
          now,
        })
      ) {
        continue
      }
      // A PREMIUM_ROLES role (admin, promoter, beta…) comps everything too,
      // and roles live in Clerk. If the role can't be read, skip this user
      // today rather than delete data they might be entitled to.
      const roleComped = await loadRoleComped(row.userId)
      if (roleComped !== false) {
        if (roleComped === null) {
          apiLogger.warn(
            { userId: row.userId },
            'billing-daily task5: role lookup failed — purge deferred to the next run',
          )
        }
        continue
      }

      // Delete + audit-event insert + clock clear are one transaction: a crash
      // between them would otherwise lose the accurate deletion counts, or clear
      // the clock without the audit record, or (on retry) re-delete against an
      // already-purged user and write a duplicate data_purged event with zero
      // counts. Committing atomically makes the whole purge a single unit.
      const purgeCounts = await db.transaction(async (tx) => {
        // Concert history (attended) — attending_at IS NOT NULL. NEVER touches
        // the Watching relationship, which is Free (§5.3). Only status =
        // 'watching' earns the null-instead-of-delete treatment; every other
        // status (NULL, and the legacy 'going'/'interested' values still live
        // until 0065 contracts them) carries no Free relationship worth
        // keeping, so the whole row goes.
        // Skipped entirely for a live Supporter, who is entitled to keep it.
        const purgeHistory = shouldPurgeFeature(liveTier, 'concert-history')
        const deletedHistory = purgeHistory
          ? await tx
              .delete(userEvents)
              .where(
                and(
                  eq(userEvents.userId, row.userId),
                  isNotNull(userEvents.attendingAt),
                  or(
                    isNull(userEvents.status),
                    ne(userEvents.status, 'watching'),
                  ),
                ),
              )
              .returning({ id: userEvents.id })
          : []
        const nulledHistory = purgeHistory
          ? await tx
              .update(userEvents)
              .set({ attendingAt: null })
              .where(
                and(
                  eq(userEvents.userId, row.userId),
                  isNotNull(userEvents.attendingAt),
                  eq(userEvents.status, 'watching'),
                ),
              )
              .returning({ id: userEvents.id })
          : []

        // Following — manual rows only (E9): Spotify-sourced rows live and
        // die with the Spotify connection (PR 3 disconnect purge), not the
        // billing clock.
        const deletedFollows = await tx
          .delete(userArtistFollows)
          .where(purgeFollowsWhere(row.userId))
          .returning({ id: userArtistFollows.id })

        // Alert prefs + Spotify sync state: the Spotify tables now exist
        // (migration 0053) but are intentionally excluded from the billing
        // purge — they are cleaned up by the PR 3 disconnect flow instead.
        // Recorded as null so the audit event shows they were not applicable.
        const counts = {
          // null (not 0) when the category was skipped, matching the convention
          // below — the audit event distinguishes "nothing to delete" from
          // "not applicable to this user's tier".
          attendedHistory: purgeHistory
            ? deletedHistory.length + nulledHistory.length
            : null,
          follows: deletedFollows.length,
          alertPrefs: null,
          spotifySyncState: null,
        }

        await tx.insert(subscriptionEvents).values({
          userId: row.userId,
          type: 'data_purged',
          metadata: counts,
        })

        // Clear the clock so the user is not re-purged next run.
        await tx
          .update(userBilling)
          .set({ premiumDataExpiresAt: null, updatedAt: new Date() })
          .where(eq(userBilling.userId, row.userId))

        return counts
      })

      apiLogger.info(
        { userId: row.userId, purgeCounts },
        'billing-daily task5: purged premium data after 90-day window',
      )
    } catch (err) {
      apiLogger.error(
        { err, userId: row.userId },
        'billing-daily task5: purge failed for one user — continuing',
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Task 6 — Dunning fallback sweep (webhook-loss safety net)
// ---------------------------------------------------------------------------

/**
 * Subscriptions stuck `past_due` for > 8 days with no cancel_completed event
 * processed ⇒ re-fetch from Stripe and reconcile. Smart Retries cancel a
 * subscription by day ~8; if the customer.subscription.deleted webhook were
 * lost, the row would sit past_due forever. Re-fetching the live status and
 * mirroring it closes that gap. Reuses the existing webhook mirror path is not
 * possible here (that path is transaction-scoped to a verified event), so this
 * performs the minimal reconcile: read Stripe status, mirror it, and let the
 * next run's derivation fall through to free once cancelled.
 */
export const runDunningFallbackSweep = async (
  now: Date,
  stripe: BillingJobStripeClient,
): Promise<void> => {
  const cutoff = new Date(now.getTime() - DUNNING_FALLBACK_AGE_MS)
  const rows = await db
    .select({
      userId: subscriptions.userId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      tier: subscriptions.tier,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'past_due'),
        lt(subscriptions.updatedAt, cutoff),
      ),
    )

  for (const row of rows) {
    try {
      // Skip if a cancel_completed already landed (webhook not actually lost).
      const [cancelled] = await db
        .select({ id: subscriptionEvents.id })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.type, 'cancel_completed'),
            sql`${subscriptionEvents.metadata}->>'subscriptionId' = ${row.stripeSubscriptionId}`,
          ),
        )
        .limit(1)
      if (cancelled !== undefined) continue

      const liveStatus = await stripe.getSubscriptionStatus(
        row.stripeSubscriptionId,
      )
      if (liveStatus === null) continue

      // Stripe says canceled but our mirror still reads past_due ⇒ the delete
      // webhook was lost. Reconcile the mirror + write the missing events so
      // derivation falls through to free and the 90-day clock starts.
      if (liveStatus === 'canceled') {
        // Atomic: the status flip, the synthesized cancel_completed event, and
        // the 90-day clock must land together. The outer scan matches on
        // `status = 'past_due'`, so if the flip committed but the event/clock
        // did not, this subscription would no longer be picked up and the
        // missing writes would be permanently dropped. The transaction rolls
        // the flip back on partial failure so the next run retries the unit.
        await db.transaction(async (tx) => {
          await tx
            .update(subscriptions)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(subscriptions.userId, row.userId))

          const [existing] = await tx
            .select({ id: subscriptionEvents.id })
            .from(subscriptionEvents)
            .where(
              and(
                eq(subscriptionEvents.type, 'cancel_completed'),
                sql`${subscriptionEvents.metadata}->>'subscriptionId' = ${row.stripeSubscriptionId}`,
              ),
            )
            .limit(1)
          if (existing === undefined) {
            await tx.insert(subscriptionEvents).values({
              userId: row.userId,
              type: 'cancel_completed',
              metadata: {
                subscriptionId: row.stripeSubscriptionId,
                tier: row.tier,
                reconciledBy: 'billing-daily-fallback-sweep',
              },
            })
          }

          // Mirror handleSubscriptionDeleted: every paid tier, Supporter
          // included (#1229), starts the 90-day preserve-then-purge clock
          // (#780 §5). Without this the
          // lost webhook would leave premium_data_expires_at unset and the user
          // would never become eligible for the §5.3 purge (task 5). Idempotent
          // via onConflictDoUpdate, so a re-run does not extend the window.
          if (cancellationStartsPurgeClock(row.tier)) {
            const premiumDataExpiresAt = new Date(
              now.getTime() + NINETY_DAYS_MS,
            )
            await tx
              .insert(userBilling)
              .values({ userId: row.userId, premiumDataExpiresAt })
              .onConflictDoUpdate({
                target: userBilling.userId,
                set: { premiumDataExpiresAt, updatedAt: new Date() },
              })
          }
        })
        apiLogger.warn(
          { userId: row.userId, subscriptionId: row.stripeSubscriptionId },
          'billing-daily task6: reconciled lost subscription-deleted webhook — mirror set to cancelled',
        )
      }
    } catch (err) {
      apiLogger.error(
        { err, userId: row.userId },
        'billing-daily task6: dunning fallback reconcile failed for one subscription — continuing',
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Task 7 — Housekeeping
// ---------------------------------------------------------------------------

/**
 * Prunes processed_stripe_events older than 90 days (§5.1 task 7 + the schema's
 * own 90-day note).
 *
 * SCHEMA LIMITATION: the spec also asks to "retry failed email_send_log rows <
 * 24h old, max 3 attempts (attempt count in row metadata)". The email_send_log
 * table has NO metadata/attempt-count column and does NOT persist the template
 * vars needed to re-render a send. Without stored vars a generic retry cannot
 * reconstruct the email, and without an attempt counter the 3-attempt cap is
 * untrackable. Retrying is therefore not safely implementable against the
 * current schema for any template whose vars are not re-derivable — which is
 * all of them (every template takes at least a tier/days/date var that lived
 * only in the triggering context). The retry is log-skipped here until the
 * schema grows an attempts counter + a vars snapshot (or the daily job's own
 * tasks re-issue the send naturally on the next run, which the dedupe key makes
 * safe). See the report for the follow-up.
 */
export const runHousekeeping = async (now: Date): Promise<void> => {
  const cutoff = new Date(now.getTime() - PROCESSED_EVENT_RETENTION_MS)
  const pruned = await db
    .delete(processedStripeEvents)
    .where(lt(processedStripeEvents.processedAt, cutoff))
    .returning({ eventId: processedStripeEvents.eventId })

  apiLogger.info(
    { prunedCount: pruned.length },
    'billing-daily task7: pruned processed_stripe_events older than 90 days',
  )

  // Failed-send retry: not implementable against the current email_send_log
  // schema (no attempts counter, no persisted vars) — log-skipped. The daily
  // job's own tasks (1/2/4) re-issue their sends on the next run, and the
  // dedupe-key claim makes those re-issues safe, so a transiently-failed send
  // for a job-driven template naturally gets a fresh attempt without a
  // dedicated retry sweep.
  apiLogger.info(
    'billing-daily task7: failed email_send_log retry skipped — schema lacks attempts counter + vars snapshot (see job header)',
  )
}

// ---------------------------------------------------------------------------
// Task 8 — Notification retention prune (#737)
// ---------------------------------------------------------------------------

/**
 * Deletes `user_notification` rows past the retention window. Thin wrapper so
 * the orchestrator's task table stays uniform; all the logic (and the
 * admin-alert exclusion) lives in prune-notifications.ts.
 */
export const runNotificationPrune = async (now: Date): Promise<void> => {
  const { deleted } = await pruneNotifications(db, now)
  apiLogger.info(
    { deletedCount: deleted },
    'billing-daily task8: pruned expired user notifications',
  )
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs all eight sub-tasks, each in its own try/catch so one failure never
 * blocks the rest (§5.1). Returns nothing; the outer entry guard exits
 * non-zero only on a catastrophic (setup) failure, never on a single sub-task.
 */
export const runBillingDaily = async (
  now: Date = new Date(),
  stripe: BillingJobStripeClient = getBillingJobStripeClient(),
): Promise<void> => {
  const tasks: [string, () => Promise<void>][] = [
    ['card-expiry-warnings', () => runCardExpiryWarnings(now, stripe)],
    ['gift-ending-notices', () => runGiftEndingNotices(now)],
    ['trial-end-events', () => runTrialEndEvents(now)],
    ['winback', () => runWinback(now)],
    ['ninety-day-purge', () => runNinetyDayPurge(now)],
    ['dunning-fallback-sweep', () => runDunningFallbackSweep(now, stripe)],
    ['housekeeping', () => runHousekeeping(now)],
    ['notification-prune', () => runNotificationPrune(now)],
  ]

  for (const [name, run] of tasks) {
    try {
      apiLogger.info({ task: name }, 'billing-daily: starting task')
      await run()
      apiLogger.info({ task: name }, 'billing-daily: task complete')
    } catch (err) {
      apiLogger.error(
        { err, task: name },
        'billing-daily: task failed — continuing with remaining tasks',
      )
    }
  }
}

// CLI entry guard — same shape as the sibling tsx scripts (gifted-comps
// backfill). Runs only when executed directly, so tests import the functions
// without auto-running. Exits non-zero only on a catastrophic failure (the
// orchestrator itself throwing — individual sub-task failures are swallowed
// and logged inside runBillingDaily).
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  runBillingDaily()
    .then(() => {
      apiLogger.info('billing-daily: all tasks dispatched')
      process.exit(0)
    })
    .catch((err) => {
      apiLogger.error({ err }, 'billing-daily: catastrophic failure')
      process.exit(1)
    })
}
