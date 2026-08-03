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
    // Every act headlining the bill, in billing order, INCLUDING the primary
    // one already stored in `artist` (#1203). Invariant: headliners[0] ===
    // artist. Written only from the LLM extractor's own `headliners` output,
    // falling back to [artist] when it emits none — nothing in this codebase
    // ever splits an artist string on punctuation to derive it, because band
    // names legitimately contain '&', 'and' and '+' ("Iron & Wine",
    // "Coheed and Cambria", "for KING + COUNTRY").
    headliners: text('headliners').array(),
    supportingArtists: text('supporting_artists').array(),
    tourName: text('tour_name'),
    date: date('date').notNull(),
    doorsTime: time('doors_time'),
    showTime: time('show_time'),
    ticketUrl: text('ticket_url'),
    // The event's own detail page on the source venue site. Serves as the
    // "Get tickets" deep-link fallback when `ticketUrl` is absent, so users
    // land on the specific event instead of the venue's generic index (#1152).
    eventUrl: text('event_url'),
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
    // packages/crawler-core/src/lib/canonical-artist.ts for the rules.
    // Populated by the crawler on every upsert (INSERT + UPDATE) so the
    // field tracks artist-substring drift across crawl runs. NO LONGER the
    // dedup key — that role moved to canonical_title in migration 0044
    // (#821). The non-unique btree index above is kept for search relevance
    // and for the eventual artist-history feature; this column is otherwise
    // descriptive metadata, not a load-bearing constraint surface.
    canonicalArtist: text('canonical_artist').notNull().default(''),
    // Normalized title identifier — backs the crawler's ON CONFLICT target.
    // Closes the gap where the LLM extracts different `artist` substrings
    // from the same compound title across crawl runs (e.g. "BPM BINGO!" vs
    // "Dombresky" vs "Dombresky / Walker & Royce" — same listing, six rows
    // under canonical_artist dedup). See
    // packages/crawler-core/src/lib/canonical-title.ts for the rules and
    // migration 0044 for the partial UNIQUE index swap (#821).
    canonicalTitle: text('canonical_title').notNull().default(''),
    // canonicalizeArtist() applied element-wise to supportingArtists —
    // the equality-match surface for Spotify follow highlighting (#763).
    // Written by the crawler wherever supporting_artists is written;
    // backfilled by scripts/2026-07-18-events-canonical-supporting-backfill.ts.
    canonicalSupporting: text('canonical_supporting').array(),
    // canonicalizeArtist() applied element-wise to headliners — the
    // equality-match surface for artist-page attribution (#1203), so a
    // co-headliner resolves to their own artist page instead of appearing as
    // an opener. Written by the crawler wherever headliners is written.
    canonicalHeadliners: text('canonical_headliners').array(),
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
    canonicalSupportingIdx: index('events_canonical_supporting_idx').using(
      'gin',
      table.canonicalSupporting,
    ),
    canonicalHeadlinersIdx: index('events_canonical_headliners_idx').using(
      'gin',
      table.canonicalHeadliners,
    ),
    // Partial UNIQUE on (venue_id, date, canonical_artist, show_time) WHERE
    // status='upcoming' — backs the crawler's ON CONFLICT target (#1053).
    // Replaces the (venue_id, date, canonical_title) unique from #0044, which
    // under-collapsed on billing/title variants ("Hilary Duff" vs "Hilary Duff
    // with La Roux, Jade LeMac"). Post-#643 canonical_artist is stable across
    // those variants. show_time is in the key (NULLS NOT DISTINCT) so genuine
    // same-artist same-day double-headers (matinee + evening) stay as separate
    // rows; null show_time still dedups by (venue_id, date, canonical_artist).
    //
    // NULLS NOT DISTINCT cannot be expressed on IndexBuilder in drizzle-orm
    // 0.45.2 (the method exists only on the unique() table-constraint path,
    // which does not support the partial WHERE predicate). The clause is
    // applied in the raw SQL migration 0057 — the authoritative source for
    // this index. This definition models the column set + partial predicate
    // for type inference and documentation.
    //
    // Status overrides (cancelled, postponed) sit outside this index so
    // relists at the same venue/date produce a new upcoming row alongside the
    // cancelled one. canonical_title remains on the table as a display/search
    // column with the non-unique btree index above.
    venueDateCanonicalArtistShowtimeIdx: uniqueIndex(
      'events_venue_date_canonical_artist_showtime_idx',
    )
      .on(table.venueId, table.date, table.canonicalArtist, table.showTime)
      .where(sql`status = 'upcoming'`),
  }),
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
