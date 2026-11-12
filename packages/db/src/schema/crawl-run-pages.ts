import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { crawlRuns } from './crawl-runs.js';

// One row per page a crawl run fetched: metadata only, never the body (bodies
// wait for a retention decision). Capped at 50 per run by crawler-core's
// FetchLog. Rows go with their run.
export const crawlRunPages = pgTable(
  'crawl_run_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    crawlRunId: uuid('crawl_run_id')
      .notNull()
      .references(() => crawlRuns.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    finalUrl: text('final_url'),
    httpStatus: integer('http_status'),
    fetchMode: text('fetch_mode').notNull(), // 'browser' | 'http' | 'api'
    bytes: integer('bytes'),
    contentHash: text('content_hash'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('crawl_run_pages_crawl_run_id_idx').on(table.crawlRunId)],
);

export type CrawlRunPage = typeof crawlRunPages.$inferSelect;
export type NewCrawlRunPage = typeof crawlRunPages.$inferInsert;
