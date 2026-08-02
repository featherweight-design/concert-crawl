import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const avatarColorEnum = pgEnum('avatar_color', [
  'signal',
  'accent',
  'success',
  'warning',
])

export const userThemeEnum = pgEnum('user_theme', [
  'electric',
  'jade',
  'light',
  'pulse',
  'forge',
  'bluenote',
  'drip',
  'cedar',
  'gloss',
])

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  handle: text('handle').unique(),
  city: text('city'),
  avatarColor: avatarColorEnum('avatar_color'),
  theme: userThemeEnum('theme').notNull().default('electric'),
  // Set when the user dismisses the Spotify connect nudge (spec §8) so it
  // renders once. NULL = never shown/dismissed.
  spotifyNudgeSeenAt: timestamp('spotify_nudge_seen_at', {
    withTimezone: true,
  }),
  // Set when the user opens the in-app notification panel (#737). Drives the
  // "fresh vs. backfill" divider and the unread pip. NULL = never opened, so
  // every row in the backfill window counts as unseen.
  notificationsSeenAt: timestamp('notifications_seen_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
