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
  'archived',
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
  'Etix',
  'StubHub',
  'VividSeats',
  'Viagogo',
  'TicketNetwork',
  'Other',
])

export const submissionHowFoundEnum = pgEnum('submission_how_found', [
  'bought_myself',
  'saw_listing',
  'at_the_venue',
])

// source_category replaces how_found semantically — the submit form now asks
// "Where's this price from?" directly (boxoffice / standard / resale) instead of
// inferring from the submitter's action. how_found stays during the expand
// phase; a follow-up contract PR drops it once nothing reads it.
export const sourceCategoryEnum = pgEnum('source_category', [
  'boxoffice',
  'standard',
  'resale',
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

export const priceSubmissions = pgTable(
  'price_submissions',
  {
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
    sourceCategory: sourceCategoryEnum('source_category'),
    disputedSubmissionId: uuid('disputed_submission_id').references(
      (): AnyPgColumn => priceSubmissions.id,
    ),
    status: priceSubmissionStatusEnum('status').notNull().default('pending'),
    // Submitter counts as observation #1 in the 1/2 confirmation model — one
    // additional non-submitter confirm promotes a pending row to corroborated.
    // Existing rows are backfilled by +1 in migration 0040 so the semantics are
    // uniform across the table (corroborationCount = total observations).
    corroborationCount: integer('corroboration_count').notNull().default(1),
    note: varchar('note', { length: 280 }),
    // archived_reason: text — admin's archive reason. No DB-level cap;
    // the API enforces min 10 / max 2000 at the resolve/defer Zod
    // validators (resolveBodySchema + deferBodySchema in
    // apps/api/src/routes/admin/contests.ts). Also written by migration
    // 0041's pre-unique-index cleanup on rows it retires as status='stale'
    // (the Postgres same-transaction enum restriction prevented using
    // 'archived' inside that migration — spec §5.2). Non-null
    // archived_reason does NOT imply status='archived' — query by status
    // for behavior, read archived_reason for the explanation.
    archivedReason: text('archived_reason'),
    // Engagement-signal columns — surfaced via priceByTier[].counterSubmission
    // so consumers see a quiet "Admin requested more info" pill on the event
    // detail page after an admin defers the contest. `lastAdminActionKind`
    // stays text (not enum) per spec §4.5 — only 'defer' is legal today;
    // app-layer validation enforces the union.
    lastAdminActionAt: timestamp('last_admin_action_at', {
      withTimezone: true,
    }),
    lastAdminActionKind: text('last_admin_action_kind', { enum: ['defer'] }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Supports the per-(user, event) rate-limit count in the 24h window (#876).
    priceSubmissionsEventUserCreatedIdx: index(
      'price_submissions_event_user_created_idx',
    ).on(table.eventId, table.userId, table.createdAt),
  }),
)

export type PriceRetrievalLog = typeof priceRetrievalLog.$inferSelect
export type NewPriceRetrievalLog = typeof priceRetrievalLog.$inferInsert

export type PriceSubmission = typeof priceSubmissions.$inferSelect
export type NewPriceSubmission = typeof priceSubmissions.$inferInsert
