import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { venues } from './venues.js'

export const eventStatusEnum = pgEnum('event_status', [
  'upcoming',
  'cancelled',
  'postponed',
])

export const priceSourceEnum = pgEnum('price_source', [
  'structured_data',
  'ticketmaster',
  'eventbrite',
  'dice',
  'songkick',
  'bandsintown',
  'seatgeek',
  'community',
])

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id').references(() => venues.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    date: date('date').notNull(),
    doorsTime: time('doors_time'),
    showTime: time('show_time'),
    ticketUrl: text('ticket_url'),
    ticketPriceMin: numeric('ticket_price_min', { precision: 10, scale: 2 }),
    ticketPriceMax: numeric('ticket_price_max', { precision: 10, scale: 2 }),
    priceSource: priceSourceEnum('price_source'),
    pipelineExhaustedAt: timestamp('pipeline_exhausted_at', {
      withTimezone: true,
    }),
    description: text('description'),
    imageUrl: text('image_url'),
    genre: text('genre').array(),
    status: eventStatusEnum('status').notNull().default('upcoming'),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
    verified: boolean('verified').notNull().default(false),
    setlist: jsonb('setlist'),
    sourceUrl: text('source_url'),
    sourceHash: text('source_hash'),
    extractionStrategy: text('extraction_strategy'),
    // Normalized artist identifier used to collapse artist-string variants of
    // the same show (e.g. "Earl Sweatshirt" vs "Earl Sweatshirt & MIKE"). See
    // packages/crawler-core/src/lib/canonical-artist.ts for the canonicalization
    // rules. Populated by the crawler on every upsert. The unique index swap
    // from (venue_id, date, artist) to (venue_id, date, canonical_artist) is
    // intentionally deferred — see issue #608 — because existing duplicate
    // rows would cause the unique index creation to fail.
    canonicalArtist: text('canonical_artist').notNull().default(''),
    // Stale-event detection (issue #607). lastSeenAt is bumped to NOW() on
    // every successful crawl run that returns this event row. firstMissingAt
    // is set to NOW() on the first successful crawl that *should* have
    // returned this event (venue crawled, date >= today, status = upcoming)
    // but didn't — and cleared back to NULL on any subsequent crawl that
    // surfaces the event again. NULL means "currently being seen, or
    // admin-dismissed". See packages/crawler-core/src/crawl.ts for the
    // post-upsert update passes that maintain these columns.
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    firstMissingAt: timestamp('first_missing_at', { withTimezone: true }),
    // search_vector is a generated column managed via raw SQL in migration
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dateStatusIdx: index('events_date_status_idx').on(table.date, table.status),
    verifiedDateIdx: index('events_verified_date_idx').on(
      table.verified,
      table.date,
    ),
    venueIdx: index('events_venue_id_idx').on(table.venueId),
    artistIdx: index('events_artist_idx').on(table.artist),
    canonicalArtistIdx: index('events_canonical_artist_idx').on(
      table.canonicalArtist,
    ),
    venueDateArtistIdx: uniqueIndex('events_venue_date_artist_idx').on(
      table.venueId,
      table.date,
      table.artist,
    ),
  }),
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
