import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { events } from './events.js'

export const eventReports = pgTable('event_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').notNull(),
  status: text('status').notNull(),
  evidenceMethod: text('evidence_method').notNull(),
  evidenceUrl: varchar('evidence_url', { length: 500 }),
  note: varchar('note', { length: 280 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: text('resolution'),
  adminNote: varchar('admin_note', { length: 500 }),
})

export type EventReport = typeof eventReports.$inferSelect
export type NewEventReport = typeof eventReports.$inferInsert
