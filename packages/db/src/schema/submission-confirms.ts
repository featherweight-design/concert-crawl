import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { priceSubmissions } from './prices.js'

export const submissionConfirms = pgTable(
  'submission_confirms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => priceSubmissions.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    method: text('method').notNull().default('same-vendor'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueUserSubmission: unique('submission_confirms_submission_user_uniq').on(
      table.submissionId,
      table.userId,
    ),
  }),
)

export type SubmissionConfirm = typeof submissionConfirms.$inferSelect
export type NewSubmissionConfirm = typeof submissionConfirms.$inferInsert
