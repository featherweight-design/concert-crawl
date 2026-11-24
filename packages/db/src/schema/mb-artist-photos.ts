import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Spotify photos for MusicBrainz-only search rows, cached out of band.
 *
 * Its own table, not columns on `mb_artists`: the weekly loader drops
 * `mb_artists` and renames a shadow table into place, so anything stored on
 * it would be wiped every week. For the same reason `mbid` carries no foreign
 * key (the swap's DROP would fail or cascade). A row here outlives a swap and
 * is simply never read once its act leaves `mb_artists`.
 *
 * Filled by the match-artists cron (`refreshMbPhotos`), never by a search
 * request. Spotify allows only temporary caching, so readers refuse a photo
 * older than `PHOTO_MAX_AGE_DAYS` (lib/artist-photo.ts).
 */
export const mbArtistPhotos = pgTable('mb_artist_photos', {
  mbid: uuid('mbid').primaryKey(),
  photoUrl: text('photo_url'),
  /** When Spotify last answered for this act, whether or not it had a photo. */
  photoFetchedAt: timestamp('photo_fetched_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
