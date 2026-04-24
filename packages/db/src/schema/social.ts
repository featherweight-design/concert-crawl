import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { events } from './events.js'

export const userEventStatusEnum = pgEnum('user_event_status', [
  'going',
  'interested',
])
export const feedbackCategoryEnum = pgEnum('feedback_category', [
  'bug',
  'suggestion',
  'praise',
])

export const userEvents = pgTable('user_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  status: userEventStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
