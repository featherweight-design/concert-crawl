import {
  AnyPgColumn,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { events, priceSourceEnum } from './events.js'
import { venues } from './venues.js'

export const priceRetrievalOutcomeEnum = pgEnum('price_retrieval_outcome', [
  'hit',
  'miss',
  'error',
])

export const priceSubmissionStatusEnum = pgEnum('price_submission_status', [
  'pending',
  'corroborated',
  'disputed',
  'stale',
])

export const submissionTierEnum = pgEnum('submission_tier', [
  'GA',
  'Reserved',
  'VIP',
  'Pit',
  'Lawn',
])

export const submissionVendorEnum = pgEnum('submission_vendor', [
  'AXS',
  'Ticketmaster',
  'SeatGeek',
  'DICE',
  'Eventbrite',
  'VenueBoxOffice',
])

export const submissionHowFoundEnum = pgEnum('submission_how_found', [
  'bought_myself',
  'saw_listing',
  'at_the_venue',
])

export const priceRetrievalLog = pgTable(
  'price_retrieval_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id),
    source: priceSourceEnum('source').notNull(),
    outcome: priceRetrievalOutcomeEnum('outcome').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    errorMessage: text('error_message'),
    attemptedAt: timestamp('attempted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    priceLogVenueSourceAttemptedAtIdx: index(
      'price_log_venue_source_attempted_at_idx',
    ).on(table.venueId, table.source, table.attemptedAt),
    priceLogEventIdIdx: index('price_log_event_id_idx').on(
      table.eventId,
      table.attemptedAt,
    ),
  }),
)

export const priceSubmissions = pgTable('price_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
  priceMax: numeric('price_max', { precision: 10, scale: 2 }),
  tier: submissionTierEnum('tier').notNull(),
  vendor: submissionVendorEnum('vendor').notNull(),
  howFound: submissionHowFoundEnum('how_found').notNull(),
  disputedSubmissionId: uuid('disputed_submission_id').references(
    (): AnyPgColumn => priceSubmissions.id,
  ),
  status: priceSubmissionStatusEnum('status').notNull().default('pending'),
  corroborationCount: integer('corroboration_count').notNull().default(0),
  note: varchar('note', { length: 280 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type PriceRetrievalLog = typeof priceRetrievalLog.$inferSelect
export type NewPriceRetrievalLog = typeof priceRetrievalLog.$inferInsert

export type PriceSubmission = typeof priceSubmissions.$inferSelect
export type NewPriceSubmission = typeof priceSubmissions.$inferInsert
