import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const notificationTypeEnum = pgEnum('notification_type', [
  'admin_alert',
  'user_notification',
])

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'), // nullable for system-level notifications
  type: notificationTypeEnum('type').notNull(),
  category: text('category').notNull(), // e.g. "crawl.low_confidence", "crawl.failed"
  title: text('title').notNull(),
  body: text('body').notNull(),
  actionUrl: text('action_url'),
  readAt: timestamp('read_at', { withTimezone: true }),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
