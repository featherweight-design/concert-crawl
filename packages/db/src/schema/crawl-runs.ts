import {
  date,
  doublePrecision,
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
  'skipped',
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
  // Raw extractor output, counted before the cross-venue presale filter and
  // the empty canonical artist/title guards in crawl.ts.
  eventsFound: integer('events_found').notNull().default(0),
  // What survived those guards (#1167). Went-dark detection keys off this;
  // eventsFound remains the extraction metric.
  eventsUsable: integer('events_usable').notNull().default(0),
  eventsInserted: integer('events_inserted').notNull().default(0),
  errorMessage: text('error_message'),
  pageHash: text('page_hash'),
  durationMs: integer('duration_ms'),
  llmCostUsd: doublePrecision('llm_cost_usd'),
  eventsUpdated: integer('events_updated').notNull().default(0),
  // Latest date among the events this run kept — the venue's announced event
  // horizon (#1185). A venue that starts truncating stops announcing far-out
  // shows, so this stalls or moves closer while the count stays healthy. NULL
  // means "no reading": zero-event, skipped, failed and robots-blocked runs,
  // plus every row that predates migration 0061.
  furthestEventDate: date('furthest_event_date'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type CrawlRun = typeof crawlRuns.$inferSelect
export type NewCrawlRun = typeof crawlRuns.$inferInsert
