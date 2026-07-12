// apps/api/src/lib/stripe-webhook-handlers.ts
//
// Per-event Stripe webhook handling (eng infra spec Part 2 §1.5).
//
// Handlers write subscription_events rows + subscriptions/user_billing state
// inside the webhook transaction, and QUEUE transactional emails on
// ctx.postCommitEmails (spec §4.4 trigger map) — the route fires the queue
// fire-and-forget only AFTER the transaction commits, so a rollback never
// leaves a sent email behind. Events that reference an unknown
// customer/subscription log a warning and resolve (Stripe must not
// 500-retry-loop on unmatchable events); genuine processing failures throw
// so the route 500s and Stripe retries.

import { eq } from 'drizzle-orm'
import {
  subscriptions,
  subscriptionEvents,
  userBilling,
} from '@concert-crawl/db'
import type { BillingStripeClient } from './stripe.js'
import type { DbExecutor } from './db-executor.js'
import {
  epochSecondsToDate,
  resolveInvoiceSubscriptionId,
  stripeInvoiceSchema,
  stripePaymentIntentSchema,
  stripeSubscriptionSchema,
  type StripeSubscriptionSnapshot,
} from './stripe-webhook-schemas.js'
import { mapDeclineCategory } from '@concert-crawl/types'
import {
  parseFounderSeatNumber,
  restoreFounderSeat,
  subscriptionNeverPaid,
} from './founder-seats.js'
import { apiLogger } from './logger.js'
import type { TransactionalEmailParams } from '../emails/types.js'

export type DbSubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'

export type DbSubscriptionTier = 'free' | 'premium' | 'supporter' | 'founder'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

// Tiers whose data survives 90 days post-downgrade before purge (#780 §5 —
// "premium-and-up"; supporter never had the premium data).
const PREMIUM_AND_UP: readonly DbSubscriptionTier[] = ['premium', 'founder']

const LOOKUP_KEY_TIERS: Record<string, DbSubscriptionTier> = {
  supporter_monthly: 'supporter',
  premium_monthly: 'premium',
  founder_monthly: 'founder',
}

/**
 * Stripe subscription status → our subscription_status enum (Part 1 §1).
 * Stripe `canceled` maps to 'cancelled'; statuses we never expect (`unpaid`,
 * `paused`, anything future) map to 'past_due' with a logged warning — the
 * handler must not throw on unknown status.
 */
export const mapStripeStatus = (
  stripeStatus: string,
): { status: DbSubscriptionStatus; unexpected: boolean } => {
  switch (stripeStatus) {
    case 'active':
      return { status: 'active', unexpected: false }
    case 'past_due':
      return { status: 'past_due', unexpected: false }
    case 'trialing':
      return { status: 'trialing', unexpected: false }
    case 'canceled':
      return { status: 'cancelled', unexpected: false }
    case 'incomplete':
      return { status: 'incomplete', unexpected: false }
    case 'incomplete_expired':
      return { status: 'incomplete_expired', unexpected: false }
    default:
      return { status: 'past_due', unexpected: true }
  }
}

/** Dunning stage from the invoice attempt_count (spec §1.5, Decision 11). */
export const dunningStageForAttempt = (attemptCount: number): 1 | 2 | 3 => {
  if (attemptCount <= 1) return 1
  if (attemptCount === 2) return 2
  return 3
}

const TIER_DISPLAY_NAMES: Record<DbSubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  supporter: 'Supporter',
  founder: 'Founder',
}

// Dunning CTA target — /settings/plan hosts the Stripe-portal entry point
// (POST /v1/billing/portal-session); portal sessions themselves are
// short-lived and cannot be minted into an email. Origin comes from
// ALLOWED_ORIGIN (same convention as app.ts CORS and the portal return_url)
// so staging/local emails never link prod.
const billingPortalEntryUrl = (): string =>
  `${process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:3000'}/settings/plan`

const DUNNING_TEMPLATE_BY_STAGE = {
  1: 'dunning_1_card_declined',
  2: 'dunning_2_still_declined',
  3: 'dunning_3_final_warning',
} as const

const tierDisplayName = (tier: DbSubscriptionTier | null): string | null =>
  tier !== null ? TIER_DISPLAY_NAMES[tier] : null

const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Denver',
})

const monthLabel = (date: Date): string => monthLabelFormatter.format(date)

const formatUsd = (cents: number): string => `$${(cents / 100).toFixed(2)}`

/** welcome_paid / renewal_receipt_monthly intent (spec §4.4 rows 1 + 3). */
export const emailForInvoicePaymentSucceeded = (input: {
  userId: string
  subscriptionId: string
  invoiceId: string | null
  billingReason: string | null
  tier: DbSubscriptionTier | null
  seatNumber: number | null
  customerId: string
  amountPaidCents: number | null
  chargedAt: Date | null
  periodEnd: Date | null
  hostedInvoiceUrl: string | null
}): TransactionalEmailParams | null => {
  if (input.billingReason === 'subscription_create') {
    const tier = input.tier
    if (tier !== 'premium' && tier !== 'supporter' && tier !== 'founder') {
      return null
    }
    return {
      templateKey: 'welcome_paid',
      userId: input.userId,
      dedupeKey: `sub:${input.subscriptionId}`,
      vars: {
        tier,
        ...(input.seatNumber !== null
          ? { founderSeatNumber: input.seatNumber }
          : {}),
      },
    }
  }
  // No invoice id = no dedupe key; no created timestamp = wrong period label
  // and charge date on the receipt — skip rather than guess.
  if (input.invoiceId === null || input.chargedAt === null) return null
  return {
    templateKey: 'renewal_receipt_monthly',
    userId: input.userId,
    dedupeKey: `invoice:${input.invoiceId}`,
    vars: {
      periodLabel: monthLabel(input.chargedAt),
      amount:
        input.amountPaidCents !== null
          ? formatUsd(input.amountPaidCents)
          : null,
      tierName: tierDisplayName(input.tier),
      periodEnd: input.periodEnd?.toISOString() ?? null,
      chargeDate: input.chargedAt.toISOString(),
      customerId: input.customerId,
      stripeReceiptUrl: input.hostedInvoiceUrl,
    },
  }
}

/** dunning_1/2/3 intent by attempt_count (spec §4.4 row 4, §1.5 row 3). */
export const emailForInvoicePaymentFailed = (input: {
  userId: string
  invoiceId: string | null
  attemptCount: number
  tier: DbSubscriptionTier | null
}): TransactionalEmailParams | null => {
  if (input.invoiceId === null) return null
  const stage = dunningStageForAttempt(input.attemptCount)
  return {
    templateKey: DUNNING_TEMPLATE_BY_STAGE[stage],
    userId: input.userId,
    dedupeKey: `invoice:${input.invoiceId}:attempt:${input.attemptCount}`,
    vars: {
      tierName: tierDisplayName(input.tier),
      portalUrl: billingPortalEntryUrl(),
    },
  }
}

/**
 * cancellation_ack intent (spec §4.4 row 6). The dedupe key carries the
 * current period end so a later cancel after a resubscribe re-acks. Skipped
 * for account-deletion cancels, flagged via subscription metadata.
 */
export const emailForCancelScheduled = (input: {
  userId: string
  subscriptionId: string
  tier: DbSubscriptionTier | null
  currentPeriodEndSeconds: number | null
  accountDeletion: boolean
}): TransactionalEmailParams | null => {
  if (input.accountDeletion) return null
  return {
    templateKey: 'cancellation_ack',
    userId: input.userId,
    dedupeKey: `sub:${input.subscriptionId}:${input.currentPeriodEndSeconds ?? 'unknown'}`,
    vars: {
      tierName: tierDisplayName(input.tier),
      accessEndsAt:
        epochSecondsToDate(input.currentPeriodEndSeconds)?.toISOString() ??
        null,
    },
  }
}

interface HandlerContext {
  stripe: BillingStripeClient
  stripeEventId: string
  /**
   * Transaction handle from the webhook route — every handler write shares
   * the idempotency insert's transaction so a failure rolls back atomically.
   */
  dbClient: DbExecutor
  /**
   * Emails queued by handlers; the route fires them fire-and-forget AFTER
   * the transaction commits (spec §4.4) — never inside it.
   */
  postCommitEmails: TransactionalEmailParams[]
}

const parseSubscriptionSnapshot = (
  raw: unknown,
  context: string,
): StripeSubscriptionSnapshot => {
  const parsed = stripeSubscriptionSchema.safeParse(raw)
  if (!parsed.success) {
    // A malformed subscription object is a genuine processing failure — the
    // schema drifted from Stripe's payload shape. Throw so the route 500s.
    throw new Error(
      `${context}: subscription payload failed validation — ${parsed.error.message}`,
    )
  }
  return parsed.data
}

/**
 * Resolves the Clerk userId for a Stripe subscription: creation metadata
 * first (stamped by checkout-session, PR 2.2), then the DB mirror by
 * subscription/customer ID. Null ⇒ unmatchable event (caller warns + skips).
 */
const resolveUserId = async (
  snapshot: StripeSubscriptionSnapshot,
  dbClient: DbExecutor,
): Promise<string | null> => {
  const metadataUserId = snapshot.metadata?.['userId']
  if (metadataUserId) return metadataUserId
  const [bySubscription] = await dbClient
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, snapshot.id))
    .limit(1)
  if (bySubscription) return bySubscription.userId
  const [byCustomer] = await dbClient
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, snapshot.customer))
    .limit(1)
  return byCustomer?.userId ?? null
}

const firstItem = (snapshot: StripeSubscriptionSnapshot) =>
  snapshot.items?.data[0] ?? null

const tierFromSnapshot = (
  snapshot: StripeSubscriptionSnapshot,
): DbSubscriptionTier | null => {
  const lookupKey = firstItem(snapshot)?.price.lookup_key ?? null
  return lookupKey !== null ? (LOOKUP_KEY_TIERS[lookupKey] ?? null) : null
}

/**
 * Upserts the subscriptions mirror row (unique per user). Fields absent from
 * the snapshot (unknown lookup_key, missing period bounds) are omitted from
 * the update so an existing row keeps its values; a brand-new row that lacks
 * a tier or period end cannot be inserted and is skipped with a warning.
 */
const mirrorSubscription = async (
  userId: string,
  snapshot: StripeSubscriptionSnapshot,
  status: DbSubscriptionStatus,
  dbClient: DbExecutor,
): Promise<void> => {
  const item = firstItem(snapshot)
  const tier = tierFromSnapshot(snapshot)
  const currentPeriodStart = epochSecondsToDate(item?.current_period_start)
  const currentPeriodEnd = epochSecondsToDate(item?.current_period_end)
  const cancelAtPeriodEnd = snapshot.cancel_at_period_end ?? false

  const [existing] = await dbClient
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)

  if (existing) {
    await dbClient
      .update(subscriptions)
      .set({
        stripeCustomerId: snapshot.customer,
        stripeSubscriptionId: snapshot.id,
        status,
        cancelAtPeriodEnd,
        updatedAt: new Date(),
        ...(tier !== null ? { tier } : {}),
        ...(item !== null ? { stripePriceId: item.price.id } : {}),
        ...(currentPeriodStart !== null ? { currentPeriodStart } : {}),
        ...(currentPeriodEnd !== null ? { currentPeriodEnd } : {}),
      })
      .where(eq(subscriptions.userId, userId))
    return
  }

  if (tier === null || currentPeriodEnd === null) {
    apiLogger.warn(
      { userId, subscriptionId: snapshot.id, tier, status },
      'stripe-webhooks: cannot insert mirror row without tier/period end — skipping',
    )
    return
  }
  await dbClient.insert(subscriptions).values({
    userId,
    stripeCustomerId: snapshot.customer,
    stripeSubscriptionId: snapshot.id,
    tier,
    status,
    cancelAtPeriodEnd,
    stripePriceId: item?.price.id ?? null,
    currentPeriodStart,
    currentPeriodEnd,
  })
}

/** invoice.payment_succeeded (spec §1.5 row 2). */
export const handleInvoicePaymentSucceeded = async (
  rawObject: unknown,
  ctx: HandlerContext,
): Promise<void> => {
  const parsed = stripeInvoiceSchema.safeParse(rawObject)
  if (!parsed.success) {
    throw new Error(
      `invoice.payment_succeeded: invoice payload failed validation — ${parsed.error.message}`,
    )
  }
  const invoice = parsed.data
  const subscriptionId = resolveInvoiceSubscriptionId(invoice)
  if (subscriptionId === null) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, invoiceId: invoice.id },
      'invoice.payment_succeeded: no subscription on invoice — skipping',
    )
    return
  }

  const snapshot = parseSubscriptionSnapshot(
    await ctx.stripe.subscriptions.retrieve(subscriptionId),
    'invoice.payment_succeeded',
  )
  const userId = await resolveUserId(snapshot, ctx.dbClient)
  if (userId === null) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, subscriptionId },
      'invoice.payment_succeeded: unmatchable subscription — skipping',
    )
    return
  }

  const { status, unexpected } = mapStripeStatus(snapshot.status)
  if (unexpected) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, stripeStatus: snapshot.status },
      'invoice.payment_succeeded: unexpected Stripe status mapped to past_due',
    )
  }
  await mirrorSubscription(userId, snapshot, status, ctx.dbClient)

  const isFirstInvoice = invoice.billing_reason === 'subscription_create'
  const seatNumber = parseFounderSeatNumber(snapshot.metadata)
  const tier = tierFromSnapshot(snapshot)
  await ctx.dbClient.insert(subscriptionEvents).values({
    userId,
    type: isFirstInvoice ? 'subscription_created' : 'renewal_succeeded',
    stripeEventId: ctx.stripeEventId,
    metadata: {
      subscriptionId,
      invoiceId: invoice.id ?? null,
      tier,
      ...(seatNumber !== null ? { seatNumber } : {}),
    },
  })

  const emailParams = emailForInvoicePaymentSucceeded({
    userId,
    subscriptionId,
    invoiceId: invoice.id ?? null,
    billingReason: invoice.billing_reason ?? null,
    tier,
    seatNumber,
    customerId: snapshot.customer,
    amountPaidCents: invoice.amount_paid ?? null,
    chargedAt: epochSecondsToDate(invoice.created),
    periodEnd: epochSecondsToDate(firstItem(snapshot)?.current_period_end),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  })
  if (emailParams !== null) {
    ctx.postCommitEmails.push(emailParams)
  } else {
    apiLogger.warn(
      {
        stripeEventId: ctx.stripeEventId,
        subscriptionId,
        tier,
        billingReason: invoice.billing_reason ?? null,
      },
      'invoice.payment_succeeded: no email queued — non-paid tier on first invoice, or missing invoice id/created timestamp on renewal',
    )
  }

  // Re-upgrade to premium-and-up clears the 90-day preserve-then-purge clock
  // (#780 §5). Supporter payments must NOT clear it — a premium→supporter
  // downgrade starts the clock (§5.3), and the user's premium data still
  // purges after 90 days while they pay for supporter.
  if (tier !== null && PREMIUM_AND_UP.includes(tier)) {
    await ctx.dbClient
      .update(userBilling)
      .set({ premiumDataExpiresAt: null, updatedAt: new Date() })
      .where(eq(userBilling.userId, userId))
  }
}

/** invoice.payment_failed (spec §1.5 row 3). */
export const handleInvoicePaymentFailed = async (
  rawObject: unknown,
  ctx: HandlerContext,
): Promise<void> => {
  const parsed = stripeInvoiceSchema.safeParse(rawObject)
  if (!parsed.success) {
    throw new Error(
      `invoice.payment_failed: invoice payload failed validation — ${parsed.error.message}`,
    )
  }
  const invoice = parsed.data
  const subscriptionId = resolveInvoiceSubscriptionId(invoice)
  if (subscriptionId === null) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, invoiceId: invoice.id },
      'invoice.payment_failed: no subscription on invoice — skipping',
    )
    return
  }

  // Incomplete first invoices (subscription never activated) get NO dunning
  // treatment — the in-surface #782 decline flow owns that moment (spec
  // §1.5); payment_intent.payment_failed carries the analytics event.
  if (invoice.billing_reason === 'subscription_create') {
    apiLogger.info(
      { stripeEventId: ctx.stripeEventId, subscriptionId },
      'invoice.payment_failed: first-invoice failure — no dunning treatment (spec §1.5)',
    )
    return
  }

  const snapshot = parseSubscriptionSnapshot(
    await ctx.stripe.subscriptions.retrieve(subscriptionId),
    'invoice.payment_failed',
  )
  const userId = await resolveUserId(snapshot, ctx.dbClient)
  if (userId === null) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, subscriptionId },
      'invoice.payment_failed: unmatchable subscription — skipping',
    )
    return
  }

  const [existingRow] = await ctx.dbClient
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  const firstPastDueTransition = existingRow?.status !== 'past_due'

  await mirrorSubscription(userId, snapshot, 'past_due', ctx.dbClient)

  const attemptCount = invoice.attempt_count ?? 1
  await ctx.dbClient.insert(subscriptionEvents).values({
    userId,
    type: 'payment_failed',
    stripeEventId: ctx.stripeEventId,
    metadata: {
      subscriptionId,
      invoiceId: invoice.id ?? null,
      attemptCount,
      dunningStage: dunningStageForAttempt(attemptCount),
    },
  })
  if (firstPastDueTransition) {
    await ctx.dbClient.insert(subscriptionEvents).values({
      userId,
      type: 'past_due_entered',
      stripeEventId: ctx.stripeEventId,
      metadata: { subscriptionId },
    })
  }

  const emailParams = emailForInvoicePaymentFailed({
    userId,
    invoiceId: invoice.id ?? null,
    attemptCount,
    tier: tierFromSnapshot(snapshot),
  })
  if (emailParams !== null) {
    ctx.postCommitEmails.push(emailParams)
  } else {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, subscriptionId, attemptCount },
      'invoice.payment_failed: no dunning email queued — missing invoice id',
    )
  }
}

/** customer.subscription.updated (spec §1.5 row 4). */
export const handleSubscriptionUpdated = async (
  rawObject: unknown,
  ctx: HandlerContext,
): Promise<void> => {
  const snapshot = parseSubscriptionSnapshot(
    rawObject,
    'customer.subscription.updated',
  )
  const userId = await resolveUserId(snapshot, ctx.dbClient)
  if (userId === null) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, subscriptionId: snapshot.id },
      'customer.subscription.updated: unmatchable subscription — skipping',
    )
    return
  }

  const { status, unexpected } = mapStripeStatus(snapshot.status)
  if (unexpected) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, stripeStatus: snapshot.status },
      'customer.subscription.updated: unexpected Stripe status mapped to past_due',
    )
  }

  // Cancel-schedule flips are detected against our mirror, read pre-update.
  const [existingRow] = await ctx.dbClient
    .select({ cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  const previousCancelFlag = existingRow?.cancelAtPeriodEnd ?? false
  const nextCancelFlag = snapshot.cancel_at_period_end ?? false

  await mirrorSubscription(userId, snapshot, status, ctx.dbClient)

  if (!previousCancelFlag && nextCancelFlag) {
    await ctx.dbClient.insert(subscriptionEvents).values({
      userId,
      type: 'cancel_scheduled',
      stripeEventId: ctx.stripeEventId,
      metadata: { subscriptionId: snapshot.id },
    })
    const emailParams = emailForCancelScheduled({
      userId,
      subscriptionId: snapshot.id,
      tier: tierFromSnapshot(snapshot),
      currentPeriodEndSeconds: firstItem(snapshot)?.current_period_end ?? null,
      accountDeletion: snapshot.metadata?.['accountDeletion'] === 'true',
    })
    if (emailParams !== null) ctx.postCommitEmails.push(emailParams)
  }
  if (previousCancelFlag && !nextCancelFlag) {
    await ctx.dbClient.insert(subscriptionEvents).values({
      userId,
      type: 'resubscribed',
      stripeEventId: ctx.stripeEventId,
      metadata: { subscriptionId: snapshot.id },
    })
  }

  // Stripe auto-expires unconfirmed subscriptions after ~23h — a founder
  // claim held by an incomplete subscription is released here (§3.2 path 2).
  if (snapshot.status === 'incomplete_expired') {
    const seatNumber = parseFounderSeatNumber(snapshot.metadata)
    if (seatNumber !== null) {
      await restoreFounderSeat(
        {
          userId,
          subscriptionId: snapshot.id,
          seatNumber,
          reason: 'incomplete_expired',
          stripeEventId: ctx.stripeEventId,
        },
        ctx.dbClient,
      )
    }
  }
}

/** customer.subscription.deleted (spec §1.5 row 5). */
export const handleSubscriptionDeleted = async (
  rawObject: unknown,
  ctx: HandlerContext,
): Promise<void> => {
  const snapshot = parseSubscriptionSnapshot(
    rawObject,
    'customer.subscription.deleted',
  )
  const userId = await resolveUserId(snapshot, ctx.dbClient)
  if (userId === null) {
    apiLogger.warn(
      { stripeEventId: ctx.stripeEventId, subscriptionId: snapshot.id },
      'customer.subscription.deleted: unmatchable subscription — skipping',
    )
    return
  }

  const [existingRow] = await ctx.dbClient
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  const tier = existingRow?.tier ?? tierFromSnapshot(snapshot)

  await mirrorSubscription(userId, snapshot, 'cancelled', ctx.dbClient)

  await ctx.dbClient.insert(subscriptionEvents).values({
    userId,
    type: 'cancel_completed',
    stripeEventId: ctx.stripeEventId,
    metadata: { subscriptionId: snapshot.id, tier },
  })

  // Never-paid check BEFORE any premium-data clock: a subscription with no
  // subscription_created audit event never produced a paid invoice.
  if (await subscriptionNeverPaid(snapshot.id, ctx.dbClient)) {
    const seatNumber = parseFounderSeatNumber(snapshot.metadata)
    if (seatNumber !== null) {
      await restoreFounderSeat(
        {
          userId,
          subscriptionId: snapshot.id,
          seatNumber,
          reason: 'never_paid_deleted',
          stripeEventId: ctx.stripeEventId,
        },
        ctx.dbClient,
      )
    }
    return
  }

  // Paid premium-and-up tiers start the 90-day preserve-then-purge clock
  // (#780 §5). Supporter never held premium data; nothing to preserve.
  if (tier !== null && PREMIUM_AND_UP.includes(tier)) {
    const premiumDataExpiresAt = new Date(Date.now() + NINETY_DAYS_MS)
    await ctx.dbClient
      .insert(userBilling)
      .values({ userId, premiumDataExpiresAt })
      .onConflictDoUpdate({
        target: userBilling.userId,
        set: { premiumDataExpiresAt, updatedAt: new Date() },
      })
  }
}

/** payment_intent.payment_failed (spec §1.5 row 6) — analytics only. */
export const handlePaymentIntentFailed = async (
  rawObject: unknown,
  ctx: HandlerContext,
): Promise<void> => {
  const parsed = stripePaymentIntentSchema.safeParse(rawObject)
  if (!parsed.success) {
    throw new Error(
      `payment_intent.payment_failed: payload failed validation — ${parsed.error.message}`,
    )
  }
  const paymentIntent = parsed.data
  const lastError = paymentIntent.last_payment_error ?? null
  const declineCategory = mapDeclineCategory({
    declineCode: lastError?.decline_code ?? null,
    errorCode: lastError?.code ?? null,
    errorType: lastError?.type ?? null,
  })

  const customerId = paymentIntent.customer ?? null
  let userId: string | null = null
  if (customerId !== null) {
    const [byCustomer] = await ctx.dbClient
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1)
    userId = byCustomer?.userId ?? null
  }
  if (userId === null) {
    apiLogger.warn(
      {
        stripeEventId: ctx.stripeEventId,
        paymentIntentId: paymentIntent.id,
        declineCategory,
      },
      'payment_intent.payment_failed: unmatchable customer — skipping',
    )
    return
  }

  // No state change — the client surface owns the retry UX. The raw
  // decline_code lands in metadata only (never rendered to users).
  await ctx.dbClient.insert(subscriptionEvents).values({
    userId,
    type: 'payment_failed',
    stripeEventId: ctx.stripeEventId,
    metadata: {
      paymentIntentId: paymentIntent.id,
      declineCategory,
      declineCode: lastError?.decline_code ?? null,
    },
  })
}
