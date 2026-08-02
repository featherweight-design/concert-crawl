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

export const apiProviderEnum = pgEnum('api_provider', ['venuepilot'])

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
  // Cooldown marker for the capped-catalogue alert (#1185). Separate from
  // lastEventCountAlertAt so a went-dark incident can't silence a ceiling
  // alert, or vice versa — the two describe different failures and an
  // operator needs to hear about both.
  lastEventCeilingAlertAt: timestamp('last_event_ceiling_alert_at', {
    withTimezone: true,
  }),
  // Cooldown marker for the CTA URL-coverage alert. Its own column for the
  // same reason as the ceiling marker above: a venue can be simultaneously
  // capped and serving homepage-only ticket links, and silencing one because
  // the other fired would hide a live consumer-facing defect.
  lastUrlCoverageAlertAt: timestamp('last_url_coverage_alert_at', {
    withTimezone: true,
  }),
  // When the upcoming catalogue was last FULLY covered — every visible
  // upcoming event carrying a ticket or event URL. Distinct from the cooldown
  // marker above, which records when a gap was DETECTED: the two diverge by
  // however long the venue went uncrawled before the alert fired, and the
  // triage panel needs the completeness date to say "last fully covered
  // Jul 12" (#1266).
  lastUrlCoverageOkAt: timestamp('last_url_coverage_ok_at', {
    withTimezone: true,
  }),
  // Per-platform fetcher dispatch (#623). When set, the crawler routes
  // this venue to a platform-specific fetcher (e.g. AEG's JSON blob)
  // instead of the HTML → JSON-LD → LLM cascade. The platform value is
  // validated by Zod at the application layer (intentionally not a
  // Postgres enum, to avoid the ALTER TYPE pain when we add more
  // platforms in follow-up PRs).
  platform: text('platform').$type<'aeg' | 'livenation' | null>(),
  platformVenueId: text('platform_venue_id'),
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
  // #764 first-timer guide. The insider tip is 1:1 with the venue and renders
  // with its own treatment (it LEADS the guide) — it is not a chip, so it
  // lives here rather than in venue_guide_chips.
  insiderTip: text('insider_tip'),
  // Draft vs. live. NULL = never published; the consumer endpoint omits the
  // guide entirely until the publish gate sets this.
  guidePublishedAt: timestamp('guide_published_at', { withTimezone: true }),
  featured: boolean('featured').notNull().default(false),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  contactEmail: text('contact_email'),
  priceUrl: text('price_url'),
  ticketVendor: ticketVendorEnum('ticket_vendor'),
  apiProvider: apiProviderEnum('api_provider'),
  apiAccountId: text('api_account_id'),
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
