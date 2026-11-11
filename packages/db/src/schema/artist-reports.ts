import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { ArtistReportReason } from '@concert-crawl/types';

export const ARTIST_REPORT_STATUSES = [
  'open',
  'fixed',
  'dismissed',
  'withdrawn',
] as const;
export type ArtistReportStatus = (typeof ARTIST_REPORT_STATUSES)[number];

/**
 * A fan's "this artist page is matched to the wrong act" report.
 *
 * `artist_id` has no foreign key on purpose: `artists` is a projection that
 * nothing else references by FK, and it can be rebuilt. A report whose artist
 * row is gone simply stops showing.
 *
 * `suggested_spotify_artist_id` is parsed from a pasted link on the server, so
 * only the id is ever stored.
 */
export const artistReports = pgTable(
  'artist_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id').notNull(),
    reporterId: text('reporter_id').notNull(),
    reason: text('reason').notNull().$type<ArtistReportReason>(),
    suggestedSpotifyArtistId: text('suggested_spotify_artist_id'),
    note: varchar('note', { length: 280 }),
    status: text('status')
      .notNull()
      .default('open')
      .$type<ArtistReportStatus>(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One open report per fan per artist.
    uniqueIndex('artist_reports_one_open_per_reporter')
      .on(table.artistId, table.reporterId)
      .where(sql`${table.status} = 'open'`),
    // The admin queue and the sidebar count read the open rows by artist.
    index('artist_reports_open_by_artist')
      .on(table.artistId)
      .where(sql`${table.status} = 'open'`),
  ],
);

export type ArtistReport = typeof artistReports.$inferSelect;
export type NewArtistReport = typeof artistReports.$inferInsert;
