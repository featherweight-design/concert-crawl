import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Where an artist sits in the Spotify identity-match lifecycle (#1115).
 *
 * `ambiguous` is a human queue, not an error: more than one Spotify artist
 * matched the canonical name exactly, and guessing would put the wrong
 * press photo on a public page.
 */
export const artistMatchStatusEnum = pgEnum('artist_match_status', [
  'unmatched', // never attempted
  'matched', // confidence cleared the bar, spotifyArtistId is trustworthy
  'ambiguous', // candidates found, none cleared the bar — needs a human
  'no_match', // searched, nothing plausible
])

/**
 * Projection table giving every artist a stable, URL-safe identity (#1115).
 *
 * This is a PROJECTION, not a source of truth: `events.canonical_artist` and
 * `events.canonical_supporting` remain the join surface, and rows here are
 * derived from them by `backfillArtists` and by the crawler write-through.
 * Nothing references it by foreign key, so a missing row degrades to "no
 * artist page" rather than to a broken event.
 *
 * `slug` is derived by `artistSlug()` (packages/types/src/artist-slug.ts) with
 * collisions resolved at write time — deliberately NOT a Postgres generated
 * column. SQL↔JS canonicalization parity has already produced a production
 * bug here (the Ø/ø incident); one JS implementation is the fix.
 */
export const artists = pgTable(
  'artists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Display name — the most-seen raw spelling across events. */
    name: text('name').notNull(),
    /** Join key against events.canonical_artist / events.canonical_supporting. Unique. */
    canonicalName: text('canonical_name').notNull(),
    /** URL identity. Unique. Derived by artistSlug(), collisions resolved at write. */
    slug: text('slug').notNull(),
    spotifyArtistId: text('spotify_artist_id'),
    matchStatus: artistMatchStatusEnum('match_status')
      .notNull()
      .default('unmatched'),
    /** 0..1. Null until a match is attempted. */
    matchConfidence: numeric('match_confidence', { precision: 4, scale: 3 }),
    /** Cached Spotify image URL. May be a signed URL that expires — the UI must onError-swap. */
    photoUrl: text('photo_url'),
    photoFetchedAt: timestamp('photo_fetched_at', { withTimezone: true }),
    matchCheckedAt: timestamp('match_checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    canonicalNameIdx: uniqueIndex('artists_canonical_name_idx').on(
      table.canonicalName,
    ),
    slugIdx: uniqueIndex('artists_slug_idx').on(table.slug),
    // The admin match-review queue scans by status.
    matchStatusIdx: index('artists_match_status_idx').on(table.matchStatus),
  }),
)
