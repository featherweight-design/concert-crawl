// apps/api/src/lib/artist-photo.ts
//
// Spotify's developer terms allow only temporary caching of artist photos
// (plan 2026-11-22-artist-search-musicbrainz, decision 8). The daily
// match-artists job re-fetches each photo and clears the ones Spotify no
// longer has; this is the reader-side ceiling that holds even if that job is
// down: a photo last fetched more than PHOTO_MAX_AGE_DAYS ago is never served.
//
// Every public surface selects this in place of `artists.photoUrl`, so the
// age rule lives in one place. Admin screens read the raw column on purpose.
// A NULL `photo_fetched_at` is not "older than 30 days", and every writer
// stamps it with the URL; the job also selects such a row for a refresh, so a
// stray one is repaired rather than served forever.

import { sql, type SQL } from 'drizzle-orm';
import { artists, mbArtistPhotos } from '@concert-crawl/db';

/** A cached Spotify photo older than this is treated as absent. */
export const PHOTO_MAX_AGE_DAYS = 30;

// Built on call, not at module load. Several unit suites mock
// `@concert-crawl/db` with a stub that has no `artists` table, and a
// module-level constant would dereference the column at import time, failing
// in files that never read a photo at all (see artist-exhaustion.ts).
export const servableArtistPhotoUrl = (): SQL<string | null> =>
  sql<
    string | null
  >`CASE WHEN ${artists.photoFetchedAt} IS NULL OR ${artists.photoFetchedAt} > now() - ${PHOTO_MAX_AGE_DAYS} * interval '1 day' THEN ${artists.photoUrl} END`;

/**
 * The same 30-day rule for a MusicBrainz-only row's photo, read through a left
 * join on `mb_artist_photos`. No row, no photo, or an aged one all read null.
 * Unlike the artists version a NULL stamp is not servable here: it can only
 * mean the join found no row.
 */
export const servableMbPhotoUrl = (): SQL<string | null> =>
  sql<
    string | null
  >`CASE WHEN ${mbArtistPhotos.photoFetchedAt} > now() - ${PHOTO_MAX_AGE_DAYS} * interval '1 day' THEN ${mbArtistPhotos.photoUrl} END`;
