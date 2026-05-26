import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { events } from './events.js'

export const eventReports = pgTable('event_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').notNull(),
  status: text('status')
    .notNull()
    .$type<'sold-out' | 'cancelled' | 'postponed'>(),
  evidenceMethod: text('evidence_method')
    .notNull()
    .$type<'bought_myself' | 'saw_listing' | 'venue_site' | 'other'>(),
  evidenceUrl: varchar('evidence_url', { length: 500 }),
  note: varchar('note', { length: 280 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: text('resolution').$type<
    'promoted' | 'rejected' | 'needs-more-info'
  >(),
  adminNote: varchar('admin_note', { length: 500 }),
})

export type EventReport = typeof eventReports.$inferSelect
export type NewEventReport = typeof eventReports.$inferInsert
