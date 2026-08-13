import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * A Spotify search hit, snapshotted at match time into
 * `artists.spotifyCandidates`.
 *
 * `genres` is `null` when the snapshot has not been genre-hydrated: `/search`
 * returns simplified artist objects that always carry an empty genre list, and
 * the real list needs a second call the match job deliberately does not make.
 * `null` therefore means "unknown" and `[]` means "Spotify lists none" — the
 * picker needs to tell those apart to know whether hydrating is worth a call.
 */
export type SpotifyCandidateSnapshot = {
  id: string
  name: string
  imageUrl: string | null
  genres: string[] | null
  spotifyUrl: string | null
}

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
    /**
     * Admin kill switch for a row that doesn't name a performer (#1342) — a
     * festival ticket package, a benefit bill. Every public surface excludes
     * hidden rows; nothing in the match pipeline reads it, so the row keeps
     * being worked and an unhide needs no repair.
     *
     * Not a delete: the projection is insert-only and would recreate the row
     * from its events on the next crawl.
     */
    hidden: boolean('hidden').notNull().default(false),
    matchCheckedAt: timestamp('match_checked_at', { withTimezone: true }),
    /**
     * What Spotify returned the last time this row was searched.
     *
     * Written on every verdict, not just the unresolved ones: the picker is
     * also how an admin corrects a wrong `matched` row, and a scoped write
     * would leave a stale list behind whenever a row changes status. One
     * invariant holds instead — this is what the last search returned. The
     * search is already paid for by the match job, so snapshotting it is free;
     * without it the picker re-runs that same search against the quota
     * MATCH_BATCH_SIZE exists to ration.
     *
     * Deliberately a cache, not a source of truth. It goes stale the moment an
     * artist edits their Spotify profile, so the picker offers an explicit
     * refresh and nothing auto-resolves from it.
     */
    spotifyCandidates:
      jsonb('spotify_candidates').$type<SpotifyCandidateSnapshot[]>(),
    spotifyCandidatesFetchedAt: timestamp('spotify_candidates_fetched_at', {
      withTimezone: true,
    }),
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
