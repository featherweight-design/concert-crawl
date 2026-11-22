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

import { sql } from 'drizzle-orm';
import { artists } from '@concert-crawl/db';

/** A cached Spotify photo older than this is treated as absent. */
export const PHOTO_MAX_AGE_DAYS = 30;

export const servableArtistPhotoUrl = sql<
  string | null
>`CASE WHEN ${artists.photoFetchedAt} IS NULL OR ${artists.photoFetchedAt} > now() - ${PHOTO_MAX_AGE_DAYS} * interval '1 day' THEN ${artists.photoUrl} END`;
