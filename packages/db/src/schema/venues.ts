import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const extractionStrategyEnum = pgEnum('extraction_strategy', [
  'structured_data',
  'llm',
  'manual',
])

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  websiteUrl: text('website_url').notNull(),
  city: text('city').notNull().default('Denver'),
  active: boolean('active').notNull().default(true),
  verified: boolean('verified').notNull().default(false),
  lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
  crawlNotes: text('crawl_notes'),
  crawlDelayMs: integer('crawl_delay_ms').notNull().default(3000),
  robotsTxtAllowed: boolean('robots_txt_allowed'),
  robotsTxtCheckedAt: timestamp('robots_txt_checked_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  extractionStrategy: extractionStrategyEnum('extraction_strategy'),
  contactEmail: text('contact_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Venue = typeof venues.$inferSelect
export type NewVenue = typeof venues.$inferInsert
