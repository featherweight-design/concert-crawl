import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { eventReports } from './event-reports.js'

export const eventReportConfirms = pgTable(
  'event_report_confirms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => eventReports.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueUserReport: unique('event_report_confirms_report_user_uniq').on(
      table.reportId,
      table.userId,
    ),
  }),
)

export type EventReportConfirm = typeof eventReportConfirms.$inferSelect
export type NewEventReportConfirm = typeof eventReportConfirms.$inferInsert
