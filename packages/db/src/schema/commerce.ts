import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Expand-only (eng infra spec Part 1 §1): 'supporter' + 'founder' appended.
// The vestigial `subscriptions.founder` boolean is superseded by
// tier = 'founder' and is dropped in a post-launch contract migration.
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'premium',
  'supporter',
  'founder',
])

// Expand-only (spec §1): mirrors the Stripe subscription statuses we consume.
// Stripe `canceled` maps to 'cancelled'; unexpected statuses (`unpaid`,
// `paused`) map to 'past_due' with a logged warning at the webhook boundary.
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'past_due',
  'trialing',
  'incomplete',
  'incomplete_expired',
])

// Audit event types for subscription_events (spec §5) — exactly 16 values.
export const subscriptionEventTypeEnum = pgEnum('subscription_event_type', [
  'checkout_started',
  'subscription_created',
  'renewal_succeeded',
  'payment_failed',
  'past_due_entered',
  'cancel_scheduled',
  'resubscribed',
  'cancel_completed',
  'upgraded',
  'downgraded',
  'founder_claimed',
  'founder_seat_restored',
  'trial_ended',
  'gift_granted',
  'gift_revoked',
  'data_purged',
])

// The 11 #783 transactional email template keys (eng infra spec Part 2 §4.4).
// email_template_config is seeded with one enabled row per key.
export const EMAIL_TEMPLATE_KEYS = [
  'welcome_paid',
  'welcome_gifted',
  'renewal_receipt_monthly',
  'renewal_receipt_annual',
  'dunning_1_card_declined',
  'dunning_2_still_declined',
  'dunning_3_final_warning',
  'card_expiring_soon',
  'cancellation_ack',
  'gifting_ending_notice',
  'winback',
] as const

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number]

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull(),
    tier: subscriptionTierEnum('tier').notNull().default('free'),
    founder: boolean('founder').notNull().default(false),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    // Mirror of Stripe cancel_at_period_end; drives the cancel-grace Plan
    // card variant (#780 §3).
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    // Active price (lookup-key-resolved) — render tier + amount without a
    // Stripe round trip.
    stripePriceId: text('stripe_price_id'),
    // With currentPeriodEnd, supports proration disclosure math.
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // One live subscription row per user; historical states live in
    // subscription_events, not extra rows (spec §2).
    userIdUniqueIdx: uniqueIndex('subscriptions_user_id_unique_idx').on(
      table.userId,
    ),
  }),
)

// Billing-adjacent user state that must exist without a subscription row
// (spec §3, Decision 13) — one row per user, lazily upserted.
export const userBilling = pgTable('user_billing', {
  userId: text('user_id').primaryKey(),
  // account_created_at + 14 days on first touch; NULL for pre-monetization
  // accounts that already consumed beta gifting.
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  // Trial-ended takeover single-fire predicate (#780 §2).
  lastTrialEndedShownAt: timestamp('last_trial_ended_shown_at', {
    withTimezone: true,
  }),
  // Day-13 banner single-fire-per-trial-expiry predicate (#780 §6).
  dayThirteenBannerDismissedAt: timestamp('day_thirteen_banner_dismissed_at', {
    withTimezone: true,
  }),
  // Past-due banner per-session predicate (#782 §1).
  pastDueBannerDismissedAt: timestamp('past_due_banner_dismissed_at', {
    withTimezone: true,
  }),
  // 90-day preserve-then-purge clock (#780 §5).
  premiumDataExpiresAt: timestamp('premium_data_expires_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Founder window singleton (spec §4). Seeded with id = 1, opens_at = NULL;
// flipping opens_at is a HARD PAUSE / Hugh-only action.
export const founderWindow = pgTable(
  'founder_window',
  {
    id: integer('id').primaryKey(),
    opensAt: timestamp('opens_at', { withTimezone: true }),
    seatsTotal: integer('seats_total').notNull(),
    seatsRemaining: integer('seats_remaining').notNull(),
    // Decremented only by the admin simulate-claim path (Part 2 §3.4).
    seatsRemainingTest: integer('seats_remaining_test').notNull(),
    windowDays: integer('window_days').notNull(),
    // Propagates NULL while opens_at is NULL. UTC round-trip keeps the
    // expression IMMUTABLE (bare timestamptz + interval is only STABLE,
    // which Postgres rejects for generated columns) — see migration 0045.
    closesAt: timestamp('closes_at', {
      withTimezone: true,
    }).generatedAlwaysAs(
      sql`((opens_at AT TIME ZONE 'utc') + make_interval(days => window_days)) AT TIME ZONE 'utc'`,
    ),
  },
  (table) => ({
    singletonCheck: check('founder_window_singleton_check', sql`id = 1`),
    seatsRemainingCheck: check(
      'founder_window_seats_remaining_check',
      sql`seats_remaining >= 0`,
    ),
  }),
)

// Append-only audit trail for every subscription state change (spec §5).
export const subscriptionEvents = pgTable(
  'subscription_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    type: subscriptionEventTypeEnum('type').notNull(),
    // Correlates to the webhook that produced it; NULL for app-originated
    // events like trial_ended.
    stripeEventId: text('stripe_event_id'),
    // Tier from/to, amount, decline category, seat number, etc.
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index('subscription_events_user_id_idx').on(table.userId),
  }),
)

// Webhook idempotency (spec §6): INSERT … ON CONFLICT DO NOTHING on the
// Stripe event ID; handler runs only when the insert lands. Rows older than
// 90 days are pruned by the daily billing job.
export const processedStripeEvents = pgTable('processed_stripe_events', {
  eventId: text('event_id').primaryKey(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Source of truth for gifted Premium (spec §7, Decision 10). Clerk
// publicMetadata.plan = 'premium_gifted' remains the JWT-fast mirror;
// if they disagree, this table wins and the mirror is repaired (logged).
export const giftedComps = pgTable(
  'gifted_comps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    // Admin Clerk ID (audit).
    grantedBy: text('granted_by').notNull(),
    // NULL = lifetime (beta cohort).
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    // For future gift-link flows; beta grants set it = createdAt.
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    // Soft revoke; derivePlan treats revoked/expired as absent.
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdUniqueIdx: uniqueIndex('gifted_comps_user_id_unique_idx').on(
      table.userId,
    ),
  }),
)

// Transactional-send idempotency + audit (spec §8; behavior in Part 2 §4).
export const emailSendLog = pgTable(
  'email_send_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateKey: text('template_key').notNull(),
    userId: text('user_id').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    // Resend message ID on success.
    resendId: text('resend_id'),
    // 'sent' / 'failed' / 'suppressed' (kill switch).
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    templateDedupeUniqueIdx: uniqueIndex(
      'email_send_log_template_dedupe_unique_idx',
    ).on(table.templateKey, table.dedupeKey),
  }),
)

// Per-template kill switch (spec §8) — disabled templates log 'suppressed'
// sends. Seeded with every EMAIL_TEMPLATE_KEYS entry, enabled.
export const emailTemplateConfig = pgTable('email_template_config', {
  templateKey: text('template_key').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const costTracking = pgTable('cost_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  service: text('service').notNull(), // "claude", "render", etc.
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull(),
  tokensUsed: numeric('tokens_used'),
  recordedAt: timestamp('recorded_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  metadata: text('metadata'), // JSON string for flexibility
})
