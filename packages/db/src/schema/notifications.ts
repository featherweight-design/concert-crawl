import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const notificationTypeEnum = pgEnum('notification_type', [
  'admin_alert',
  'user_notification',
])

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id'), // nullable for system-level notifications
    type: notificationTypeEnum('type').notNull(),
    category: text('category').notNull(), // e.g. "crawl.low_confidence", "crawl.failed"
    title: text('title').notNull(),
    body: text('body').notNull(),
    actionUrl: text('action_url'),
    readAt: timestamp('read_at', { withTimezone: true }),
    metadata: text('metadata'), // JSON string
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // #1311 replay protection (migration 0091). A writer that must not
    // duplicate sets a natural key for the transition it announces and inserts
    // ON CONFLICT DO NOTHING, so the row is its own claim. NULL for writers
    // with their own ledger (spotify-fanout) or none needed (admin alerts,
    // crew); NULLs are distinct under the unique index.
    dedupeKey: text('dedupe_key'),
  },
  (table) => ({
    dedupeKeyIdx: uniqueIndex('notifications_dedupe_key_idx').on(
      table.dedupeKey,
    ),
  }),
)
