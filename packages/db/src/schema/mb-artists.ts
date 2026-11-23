import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * A slim local copy of MusicBrainz's CC0 core artist data, for artist search
 * (docs/superpowers/plans/2026-11-22-artist-search-musicbrainz.md, decision 1).
 *
 * Search reads this table instead of MusicBrainz's API, which refused 44% of
 * searches at one request a second in the research spike. The weekly loader
 * (plan PR 2) replaces the whole table through a shadow-table swap, so rows
 * are never edited in place, and nothing references them by foreign key:
 * `artists.mbid` and `user_artist_follows.mbid` hold the MBID as a plain value,
 * so a swap that drops an act leaves those rows intact.
 *
 * Only CC0 fields belong here. MusicBrainz tags, ratings and annotations are
 * CC BY-NC-SA and stay out.
 */
export const mbArtists = pgTable(
  'mb_artists',
  {
    mbid: uuid('mbid').primaryKey(),
    name: text('name').notNull(),
    sortName: text('sort_name'),
    /** Alias names, deduplicated by the loader. Never null; empty when none. */
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`'{}'`),
    /** MusicBrainz artist type: Person, Group, Orchestra, Choir, Character, Other. */
    type: text('type'),
    /** The area's name (a country, or a city where MusicBrainz is that precise). */
    area: text('area'),
    /** MusicBrainz's own line for telling same-named acts apart. */
    disambiguation: text('disambiguation'),
    /** From the Spotify URL relation. The safety check in plan decision 7 compares it with ours. */
    spotifyId: text('spotify_id'),
    /** From the Wikidata URL relation, e.g. "Q1299". */
    wikidataId: text('wikidata_id'),
    /** When the load that wrote this row ran. */
    refreshedAt: timestamp('refreshed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // gin_trgm_ops comes from pg_trgm, created by migration 0128.
    nameTrgmIdx: index('mb_artists_name_trgm_idx').using(
      'gin',
      table.name.op('gin_trgm_ops'),
    ),
    // mb_artist_aliases_text() is migration 0128's IMMUTABLE wrapper around
    // array_to_string(). A search must call it, not array_to_string(), or the
    // planner cannot use these two alias indexes.
    aliasesTrgmIdx: index('mb_artists_aliases_trgm_idx').using(
      'gin',
      sql`mb_artist_aliases_text(${table.aliases}) gin_trgm_ops`,
    ),
    nameFtsIdx: index('mb_artists_name_fts_idx').using(
      'gin',
      sql`to_tsvector('simple', ${table.name})`,
    ),
    aliasesFtsIdx: index('mb_artists_aliases_fts_idx').using(
      'gin',
      sql`to_tsvector('simple', mb_artist_aliases_text(${table.aliases}))`,
    ),
  }),
);
