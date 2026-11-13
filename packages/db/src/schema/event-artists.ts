import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { artists } from './artists.js';
import { events } from './events.js';

export const EVENT_ARTIST_ROLES = ['headliner', 'support'] as const;
export type EventArtistRole = (typeof EVENT_ARTIST_ROLES)[number];

/**
 * An event's lineup as links to artists (admin 4a). During the expand phase
 * this is a PROJECTION of the four artist arrays on `events`, which stay the
 * source of truth: every write goes through `syncEventArtists`, which rebuilds
 * an event's rows from its arrays. A billed name with no `artists` row has no
 * row here. `position` follows the display order of `headliners` and
 * `supporting_artists` within each role.
 */
export const eventArtists = pgTable(
  'event_artists',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    artistId: uuid('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    role: text('role', { enum: EVENT_ARTIST_ROLES }).notNull(),
    position: smallint('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.artistId] }),
    index('event_artists_artist_idx').on(table.artistId),
    check(
      'event_artists_role_check',
      sql`${table.role} IN ('headliner', 'support')`,
    ),
  ],
);

export type EventArtist = typeof eventArtists.$inferSelect;
export type NewEventArtist = typeof eventArtists.$inferInsert;
