import { boolean, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'premium'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'past_due',
])

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull(),
  tier: subscriptionTierEnum('tier').notNull().default('free'),
  founder: boolean('founder').notNull().default(false),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const costTracking = pgTable('cost_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  service: text('service').notNull(), // "claude", "render", etc.
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull(),
  tokensUsed: numeric('tokens_used'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: text('metadata'), // JSON string for flexibility
})
