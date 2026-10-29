import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Durable backing store for the API's request rate limits (#528). One row per
 * limiter key (e.g. `feedback:<clerk id>`, `waitlist:<ip>`): `count` hits
 * since the window opened, and `reset_at` when it closes. The window opens on
 * a key's first hit, not on a wall-clock boundary, so a 1-per-hour limit
 * never lets two requests through a few seconds apart across an hour mark.
 *
 * `user_id` is the Clerk ID a user-scoped limiter is keyed on (null for
 * IP-keyed ones), stored as its own column so account deletion removes the
 * user's buckets the same way it removes every other user-owned row.
 *
 * The API upserts a row in a single statement per hit and prunes expired rows
 * opportunistically, and the daily match-artists job sweeps every expired row;
 * see apps/api/src/lib/rate-limit.ts.
 */
export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
    userId: text('user_id'),
  },
  (table) => ({
    // The expired-row prune scans by reset_at.
    resetAtIdx: index('rate_limit_buckets_reset_at_idx').on(table.resetAt),
    // Account deletion removes a user's buckets by user_id.
    userIdIdx: index('rate_limit_buckets_user_id_idx').on(table.userId),
  }),
)

export type RateLimitBucketRow = typeof rateLimitBuckets.$inferSelect
