import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { venues } from './venues.js';

export const crawlTriggerStatusEnum = pgEnum('crawl_trigger_status', [
  'pending',
  'processing',
  'done',
  'failed',
]);

// 'test' crawls a venue without publishing what it finds (admin redesign 3c).
export const crawlTriggerModeEnum = pgEnum('crawl_trigger_mode', [
  'crawl',
  'test',
]);

// What a draft venue's test crawl found (migration 0129). Counts are per
// extraction stage: the stage that produced the shows holds the count, the
// others are 0. `samples` is up to three shows, so the admin can judge the
// Source before Go live. The run id opens the run in Inspect.
export interface TestCrawlSample {
  artist: string;
  title: string | null;
  date: string;
  showTime: string | null;
}

export interface TestCrawlResult {
  status: 'found' | 'none' | 'failed';
  strategy: string | null;
  found: number;
  counts: { html: number; jsonLd: number; haiku: number };
  samples: TestCrawlSample[];
  costUsd: number;
  crawlRunId: string | null;
  error: string | null;
}

export const crawlTriggers = pgTable(
  'crawl_triggers',
  {
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
    // A test re-crawl of a crawl-paused venue (migration 0119): a real crawl
    // whose run never moves the venue's pause or failure streak. Not `mode`
    // 'test', which tries a draft venue's config and keeps nothing.
    trial: boolean('trial').notNull().default(false),
    mode: crawlTriggerModeEnum('mode').notNull().default('crawl'),
    crawlRunId: uuid('crawl_run_id'),
    // Set once a mode 'test' trigger finishes (migration 0129); null otherwise.
    testResult: jsonb('test_result').$type<TestCrawlResult>(),
    // Page progress the triggered re-crawl reports (migration 0120), so the
    // admin row can read "Page 2 of 4". Null means no progress reported yet.
    pagesDone: integer('pages_done'),
    pagesTotal: integer('pages_total'),
    progressAt: timestamp('progress_at', { withTimezone: true }),
    // When the crawler claimed the trigger, pending to processing (migration
    // 0121). Unlike `updatedAt`, progress writes leave it alone, so the admin's
    // wait estimate can tell how long the run ahead has been going.
    startedAt: timestamp('started_at', { withTimezone: true }),
    triggeredBy: text('triggered_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The queue reads: pending triggers, oldest first (migration 0121).
    index('crawl_triggers_pending_created_idx')
      .on(table.createdAt)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export type CrawlTrigger = typeof crawlTriggers.$inferSelect;
export type NewCrawlTrigger = typeof crawlTriggers.$inferInsert;
