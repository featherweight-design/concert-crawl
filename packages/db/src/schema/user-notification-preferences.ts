import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Per-user push preferences (#971). One row per user; created lazily on first
// PATCH from /v1/me/notification-preferences (GET is side-effect-free — returns
// defaults without inserting). The send pipeline checks these before firing a
// push and skips categories the user has disabled; the notification row is
// still written for the bell (#737) — push is a side channel that respects
// these toggles.
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    userId: text('user_id').primaryKey(),
    masterEnabled: boolean('master_enabled').notNull().default(false),
    watchUpdatesEnabled: boolean('watch_updates_enabled')
      .notNull()
      .default(true),
    priceDropsEnabled: boolean('price_drops_enabled').notNull().default(true),
    // Artist following (migration 0078). These three moved here off
    // `user_spotify_connections` so a user who never connected Spotify can
    // still control what a follow sends them.
    //
    // The defaults are asymmetric on purpose, matching the COALESCE the crawl
    // fan-out already encodes: following is the opt-in, so alerts default on;
    // following must never silently mutate Watching, so auto-watch defaults
    // off. Do not tidy them into a matching pair.
    artistAlertsEnabled: boolean('artist_alerts_enabled')
      .notNull()
      .default(true),
    artistAutoWatch: boolean('artist_auto_watch').notNull().default(false),
    weeklyDigestEnabled: boolean('weekly_digest_enabled')
      .notNull()
      .default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export type UserNotificationPreferences =
  typeof userNotificationPreferences.$inferSelect
export type NewUserNotificationPreferences =
  typeof userNotificationPreferences.$inferInsert
