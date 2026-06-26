import { sql } from 'drizzle-orm'
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

// Typed entry in events.ticketLinks (issue #641). Populated by the crawler
// (PR 2 of the price-source cycle) from URL host + venue.ticketVendor; consumed
// by the Consumer UI (PR 4) for source-category disclosure. Replaces the
// single ticketUrl during the expand phase; ticketUrl is dropped in a
// follow-up contract PR once nothing reads it.
export type TicketLink = {
  kind: 'boxoffice' | 'primary' | 'resale'
  vendor: string | null
  url: string
}

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
    ticketLinks: jsonb('ticket_links').$type<TicketLink[]>(),
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
    // Admin "Mark non-concert" hides an event from every consumer-facing
    // listing query without deleting it. See migration 0039 + the consumer
    // route audit in PR 6 — every public events query must filter
    // `WHERE NOT hidden_from_consumer`.
    hiddenFromConsumer: boolean('hidden_from_consumer')
      .notNull()
      .default(false),
    // LLM-classifier uncertainty signal for the isConcert predicate. Set
    // by the crawler INSERT path when the LLM emits reviewNeeded=true;
    // crawler-frozen on UPDATE. Written symmetrically (both true and
    // false isConcert classifications) but only the hidden-and-flagged
    // slice surfaces in the admin UI today. A one-shot backfill script
    // lands in a follow-up PR as the only post-INSERT writer (see
    // docs/superpowers/specs/2026-06-24-classification-review-queue-design.md).
    // Admin actions never touch this column.
    isConcertReviewNeeded: boolean('is_concert_review_needed')
      .notNull()
      .default(false),
    setlist: jsonb('setlist'),
    sourceUrl: text('source_url'),
    sourceHash: text('source_hash'),
    extractionStrategy: text('extraction_strategy'),
    // Normalized artist identifier used to collapse artist-string variants of
    // the same show (e.g. "Earl Sweatshirt" vs "Earl Sweatshirt & MIKE"). See
    // packages/crawler-core/src/lib/canonical-artist.ts for the canonicalization
    // rules. Populated by the crawler on every upsert. The partial UNIQUE
    // index on (venue_id, date, canonical_artist) WHERE status = 'upcoming'
    // backs the crawler's ON CONFLICT target (see migration 0035).
    canonicalArtist: text('canonical_artist').notNull().default(''),
    // Normalized title identifier used to collapse the case where the LLM
    // extracts different `artist` substrings from the same compound title
    // across crawl runs (e.g. "BPM BINGO!" vs "Dombresky" vs "Dombresky /
    // Walker & Royce" — same listing, six rows). See
    // packages/crawler-core/src/lib/canonical-title.ts for the rules.
    // Populated by the crawler on every upsert. The follow-up index swap
    // will switch the crawler's ON CONFLICT target from
    // (venue_id, date, canonical_artist) to (venue_id, date, canonical_title)
    // — tracked by issue #821.
    canonicalTitle: text('canonical_title').notNull().default(''),
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
    canonicalTitleIdx: index('events_canonical_title_idx').on(
      table.canonicalTitle,
    ),
    // Both unique indexes are partial WHERE status='upcoming' so admin
    // status overrides (cancelled, postponed) sit outside the constraint
    // and relists produce a new upcoming row alongside the cancelled one.
    // The canonical_artist index backs the crawler's ON CONFLICT target;
    // the artist index is kept for historical query patterns but no longer
    // enforces global uniqueness. Migration 0035 dropped + recreated the
    // legacy artist index as partial on the same predicate.
    venueDateArtistIdx: uniqueIndex('events_venue_date_artist_idx')
      .on(table.venueId, table.date, table.artist)
      .where(sql`status = 'upcoming'`),
    venueDateCanonicalArtistIdx: uniqueIndex(
      'events_venue_date_canonical_artist_idx',
    )
      .on(table.venueId, table.date, table.canonicalArtist)
      .where(sql`status = 'upcoming'`),
  }),
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
