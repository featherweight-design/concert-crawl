import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const extractionStrategyEnum = pgEnum('extraction_strategy', [
  'structured_data',
  'llm',
  'manual',
])

export const crawlWaitUntilEnum = pgEnum('crawl_wait_until', [
  'networkidle',
  'load',
  'domcontentloaded',
])

export const ticketVendorEnum = pgEnum('ticket_vendor', [
  'axs',
  'ticketmaster',
  'seatgeek',
  'dice',
  'eventbrite',
  'venue_box_office',
  'unknown',
])

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  websiteUrl: text('website_url').notNull(),
  city: text('city').notNull().default('Denver'),
  timezone: text('timezone').notNull().default('America/Denver'),
  active: boolean('active').notNull().default(true),
  verified: boolean('verified').notNull().default(true),
  verifiedBy: text('verified_by'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
  crawlNotes: text('crawl_notes'),
  crawlDelayMs: integer('crawl_delay_ms').notNull().default(3000),
  robotsTxtAllowed: boolean('robots_txt_allowed'),
  robotsTxtCheckedAt: timestamp('robots_txt_checked_at', {
    withTimezone: true,
  }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  lastEventCountAlertAt: timestamp('last_event_count_alert_at', {
    withTimezone: true,
  }),
  extractionStrategy: extractionStrategyEnum('extraction_strategy'),
  crawlWaitUntil: crawlWaitUntilEnum('crawl_wait_until')
    .notNull()
    .default('networkidle'),
  crawlWaitForSelector: text('crawl_wait_for_selector'),
  crawlMode: varchar('crawl_mode', { length: 10 }).$type<'http' | 'browser'>(),
  address: text('address'),
  capacity: integer('capacity'),
  venueType: text('venue_type'),
  about: text('about'),
  neighborhood: text('neighborhood'),
  featured: boolean('featured').notNull().default(false),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  contactEmail: text('contact_email'),
  priceUrl: text('price_url'),
  ticketVendor: ticketVendorEnum('ticket_vendor'),
  debugCaptureHtml: boolean('debug_capture_html').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Venue = typeof venues.$inferSelect
export type NewVenue = typeof venues.$inferInsert
