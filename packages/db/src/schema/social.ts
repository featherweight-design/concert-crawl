import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { ARTIST_FOLLOW_SOURCES } from '@concert-crawl/types'
import { events } from './events.js'

/**
 * `watching` is the only value application code writes.
 *
 * `going` and `interested` are legacy read-only (#70): attendance now lives in
 * `userEvents.attendingAt`, and `going` is derived from `attending_at IS NOT NULL`.
 * Migration 0065 nulls out the remaining `going` rows. The enum values stay
 * because recreating a Postgres enum type rewrites every dependent column for
 * zero benefit — they are simply unreachable. Do not reintroduce writes to them.
 */
export const userEventStatusEnum = pgEnum('user_event_status', [
  'going',
  'interested',
  'watching',
])
export const feedbackCategoryEnum = pgEnum('feedback_category', [
  'bug',
  'idea',
  'praise',
  'other',
])

export const feedbackStatusEnum = pgEnum('feedback_status', [
  'unread',
  'read',
  'flagged',
  'issue_opened',
  'resolved',
  'archived',
])

export const userEvents = pgTable(
  'user_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    // Nullable since 0064: NULL means "no Watching relationship on this row",
    // which is how an attendance-only row exists under the unique index below.
    status: userEventStatusEnum('status'),
    savedPrice: numeric('saved_price', { precision: 10, scale: 2 }),
    // Set when the user explicitly says "I'm going!". Independent of `status` —
    // Watching is not Attending (#70).
    attendingAt: timestamp('attending_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userEventUniqueIdx: uniqueIndex('user_events_user_event_idx').on(
      table.userId,
      table.eventId,
    ),
    // Partial — mirrors the WHERE predicate in migration 0064. A full index here
    // would diverge from the database and produce a spurious drizzle-kit diff.
    userAttendingIdx: index('user_events_user_attending_idx')
      .on(table.userId, table.attendingAt)
      .where(sql`${table.attendingAt} IS NOT NULL`),
  }),
)

// Declared from the shared tuple in @concert-crawl/types so the DB enum and
// the `ArtistFollowSource` API contract cannot drift. Same values, same order
// as before — drizzle-kit sees no diff.
export const artistFollowSourceEnum = pgEnum(
  'artist_follow_source',
  ARTIST_FOLLOW_SOURCES,
)

export const userArtistFollows = pgTable(
  'user_artist_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    artistName: text('artist_name').notNull(),
    spotifyArtistId: text('spotify_artist_id'),
    source: artistFollowSourceEnum('source').notNull().default('manual'),
    // canonicalizeArtist(artistName) — written by app code on every insert;
    // parity rule: the transform lives ONLY in JS (see canonical-artist.ts),
    // backfilled by scripts/2026-07-18-follows-canonical-name-backfill.ts.
    canonicalName: text('canonical_name').notNull().default(''),
    // 1-based position for source='spotify_top'; NULL otherwise.
    rank: integer('rank'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Replace-set-per-source upsert target. NULL spotify_artist_id rows are
    // all distinct under Postgres NULL semantics, so this index cannot dedupe
    // manual follows of an unmatched artist — manualCanonicalIdx below does.
    userSourceArtistIdx: uniqueIndex(
      'user_artist_follows_user_source_artist_idx',
    ).on(table.userId, table.source, table.spotifyArtistId),
    // A user can follow an artist by hand exactly once, matched or not. The
    // API's read-before-insert can't close the window between two concurrent
    // follows; this can.
    manualCanonicalIdx: uniqueIndex('user_artist_follows_manual_canonical_idx')
      .on(table.userId, table.canonicalName)
      .where(sql`source = 'manual'`),
    canonicalNameIdx: index('user_artist_follows_canonical_name_idx').on(
      table.canonicalName,
    ),
    // Serves the taste-filter correlated EXISTS (user_id + canonical_name
    // lookup) so it stays index-backed as follow counts grow.
    userCanonicalNameIdx: index(
      'user_artist_follows_user_canonical_name_idx',
    ).on(table.userId, table.canonicalName),
  }),
)

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Nullable only so the reporter can delete their account: USER_DATA_REGISTRY
  // anonymizes feedback rather than deleting it, because the report stays
  // actionable after its author leaves. Null means "the reporter has left",
  // never "submitted anonymously" — the endpoint still requires auth.
  userId: text('user_id'),
  pageUrl: text('page_url').notNull(),
  category: feedbackCategoryEnum('category').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  status: feedbackStatusEnum('status').notNull().default('unread'),
  adminNotes: text('admin_notes'),
  issueUrl: text('issue_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
