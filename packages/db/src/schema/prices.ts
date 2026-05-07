import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { events } from './events.js'
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
    source: text('source').notNull(),
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
  }),
)

export const priceSubmissions = pgTable(
  'price_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    priceMin: numeric('price_min', { precision: 10, scale: 2 }).notNull(),
    priceMax: numeric('price_max', { precision: 10, scale: 2 }),
    tierLabel: text('tier_label'),
    sourceNote: text('source_note'),
    status: priceSubmissionStatusEnum('status').notNull().default('pending'),
    corroborationCount: integer('corroboration_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export type PriceRetrievalLog = typeof priceRetrievalLog.$inferSelect
export type NewPriceRetrievalLog = typeof priceRetrievalLog.$inferInsert

export type PriceSubmission = typeof priceSubmissions.$inferSelect
export type NewPriceSubmission = typeof priceSubmissions.$inferInsert
