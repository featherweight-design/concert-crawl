import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { venues } from './venues.js'

export const crawlStatusEnum = pgEnum('crawl_status', [
  'success',
  'failed',
  'partial',
])

export const crawlRuns = pgTable('crawl_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id')
    .notNull()
    .references(() => venues.id, { onDelete: 'cascade' }),
  status: crawlStatusEnum('status').notNull(),
  httpStatusCode: integer('http_status_code'),
  robotsTxtBlocked: text('robots_txt_blocked'), // 'yes' | 'no' | 'unchecked'
  extractionStrategyUsed: text('extraction_strategy_used'),
  eventsFound: integer('events_found').notNull().default(0),
  eventsInserted: integer('events_inserted').notNull().default(0),
  errorMessage: text('error_message'),
  pageHash: text('page_hash'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type CrawlRun = typeof crawlRuns.$inferSelect
export type NewCrawlRun = typeof crawlRuns.$inferInsert
