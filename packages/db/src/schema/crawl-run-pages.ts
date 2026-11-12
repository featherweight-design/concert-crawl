import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { crawlRuns } from './crawl-runs.js';

// A Postgres bytea as a Node Buffer.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

// One row per page a crawl run fetched. Bounded by crawler-core's FetchLog: 50
// successful pages plus up to 200 failures per run. Rows go with their run.
// The body is kept only while `CRAWL_PAGE_BODIES=on`, gzipped in html_gz until
// body_expires_at, when a daily sweep nulls it (the row stays).
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
    htmlGz: bytea('html_gz'),
    bodyExpiresAt: timestamp('body_expires_at', { withTimezone: true }),
    // The body was over the size cap and was not kept.
    bodyTruncated: boolean('body_truncated').notNull().default(false),
  },
  (table) => [
    index('crawl_run_pages_crawl_run_id_idx').on(table.crawlRunId),
    index('crawl_run_pages_body_expires_at_idx')
      .on(table.bodyExpiresAt)
      .where(sql`${table.htmlGz} is not null`),
  ],
);

export type CrawlRunPage = typeof crawlRunPages.$inferSelect;
export type NewCrawlRunPage = typeof crawlRunPages.$inferInsert;
