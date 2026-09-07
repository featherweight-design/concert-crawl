import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text('updated_by').notNull(),
})

export type FeatureFlagRow = typeof featureFlags.$inferSelect
export type NewFeatureFlagRow = typeof featureFlags.$inferInsert
