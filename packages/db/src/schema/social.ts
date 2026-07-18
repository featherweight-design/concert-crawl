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
import { events } from './events.js'

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
    status: userEventStatusEnum('status').notNull(),
    savedPrice: numeric('saved_price', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userEventUniqueIdx: uniqueIndex('user_events_user_event_idx').on(
      table.userId,
      table.eventId,
    ),
  }),
)

export const artistFollowSourceEnum = pgEnum('artist_follow_source', [
  'manual',
  'spotify_followed',
  'spotify_top',
])

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
    // Replace-set-per-source upsert target. NULL spotify_artist_id rows
    // (manual follows) are all distinct under Postgres NULL semantics —
    // intended: manual duplicates are guarded at the API layer, not here.
    userSourceArtistIdx: uniqueIndex(
      'user_artist_follows_user_source_artist_idx',
    ).on(table.userId, table.source, table.spotifyArtistId),
    canonicalNameIdx: index('user_artist_follows_canonical_name_idx').on(
      table.canonicalName,
    ),
  }),
)

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
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
