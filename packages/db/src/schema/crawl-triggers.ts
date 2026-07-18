import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { venues } from './venues.js'

export const crawlTriggerStatusEnum = pgEnum('crawl_trigger_status', [
  'pending',
  'processing',
  'done',
  'failed',
])

export const crawlTriggers = pgTable('crawl_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id')
    .notNull()
    .references(() => venues.id, { onDelete: 'cascade' }),
  status: crawlTriggerStatusEnum('status').notNull().default('pending'),
  // When true, the crawler ignores both hash-skip short-circuits (venue-level
  // page hash and per-event source hash) and re-extracts + re-upserts every
  // event. Used to reprocess legacy rows (e.g. backfilling supportingArtists)
  // whose listings haven't changed. Default false keeps normal + scheduled
  // crawls on the cost-saving skip path.
  force: boolean('force').notNull().default(false),
  crawlRunId: uuid('crawl_run_id'),
  triggeredBy: text('triggered_by'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type CrawlTrigger = typeof crawlTriggers.$inferSelect
export type NewCrawlTrigger = typeof crawlTriggers.$inferInsert
