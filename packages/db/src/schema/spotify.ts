import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { events } from './events.js'

export const spotifyConnectionStatusEnum = pgEnum('spotify_connection_status', [
  'connected',
  'error',
  'revoked',
])

// One row per user with a linked Spotify account. Disconnect (user-initiated)
// DELETEs the row; an externally revoked grant keeps the row with
// status='revoked' so the UI can prompt a reconnect (spec §4/§6).
export const userSpotifyConnections = pgTable(
  'user_spotify_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    spotifyUserId: text('spotify_user_id').notNull(),
    displayName: text('display_name'),
    status: spotifyConnectionStatusEnum('status')
      .notNull()
      .default('connected'),
    autoWatch: boolean('auto_watch').notNull().default(false),
    digestEnabled: boolean('digest_enabled').notNull().default(true),
    pushEnabled: boolean('push_enabled').notNull().default(true),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastSyncError: text('last_sync_error'),
    artistCount: integer('artist_count').notNull().default(0),
  },
  (table) => ({
    userIdIdx: uniqueIndex('user_spotify_connections_user_id_idx').on(
      table.userId,
    ),
  }),
)

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    // Soft-disable on 404/410 push-endpoint responses (spec §9) rather than
    // delete, so repeated failures don't thrash re-subscribes.
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (table) => ({
    endpointIdx: uniqueIndex('push_subscriptions_endpoint_idx').on(
      table.endpoint,
    ),
    userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  }),
)

// Idempotency ledger for fan-out (spec §10): a (user, event, kind) row is
// claimed before the side effect fires, so retries never double-send.
export const spotifyAlertLog = pgTable(
  'spotify_alert_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'push' | 'auto_watch'
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userEventKindIdx: uniqueIndex('spotify_alert_log_user_event_kind_idx').on(
      table.userId,
      table.eventId,
      table.kind,
    ),
  }),
)

export type UserSpotifyConnection = typeof userSpotifyConnections.$inferSelect
export type NewUserSpotifyConnection =
  typeof userSpotifyConnections.$inferInsert
export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
export type SpotifyAlertLogRow = typeof spotifyAlertLog.$inferSelect
