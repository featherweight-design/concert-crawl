import {
  boolean,
  date,
  index,
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
    description: text('description'),
    imageUrl: text('image_url'),
    genre: text('genre').array(),
    status: eventStatusEnum('status').notNull().default('upcoming'),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
    verified: boolean('verified').notNull().default(false),
    sourceUrl: text('source_url'),
    sourceHash: text('source_hash'),
    extractionStrategy: text('extraction_strategy'),
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
    venueIdx: index('events_venue_id_idx').on(table.venueId),
    artistIdx: index('events_artist_idx').on(table.artist),
    venueDateArtistIdx: uniqueIndex('events_venue_date_artist_idx').on(
      table.venueId,
      table.date,
      table.artist,
    ),
  }),
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
