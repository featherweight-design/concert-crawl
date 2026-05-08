import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const avatarColorEnum = pgEnum('avatar_color', [
  'signal',
  'accent',
  'success',
  'warning',
])

export const userThemeEnum = pgEnum('user_theme', ['electric', 'jade', 'light'])

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  handle: text('handle').unique(),
  city: text('city'),
  avatarColor: avatarColorEnum('avatar_color'),
  theme: userThemeEnum('theme').notNull().default('electric'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
