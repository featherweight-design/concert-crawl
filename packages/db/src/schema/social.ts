import {
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

export const userArtistFollows = pgTable('user_artist_follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  artistName: text('artist_name').notNull(),
  spotifyArtistId: text('spotify_artist_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  pageUrl: text('page_url').notNull(),
  category: feedbackCategoryEnum('category').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
