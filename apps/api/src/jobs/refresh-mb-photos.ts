// apps/api/src/jobs/refresh-mb-photos.ts
//
// The photo pass for MusicBrainz-only search rows. Artist search shows a
// MusicBrainz act that none of our `artists` rows holds; when MusicBrainz links
// it to both Spotify and Wikidata (the notable band search ranks first), this
// fills its photo so the row shows a real picture instead of the generated art.
//
// Never called from a search request: Spotify's rate limit is account-wide, and
// one call per search would spend it on whoever types. It runs at the end of
// the match-artists cron, after our own artists' photos and on a budget of its
// own, so it can neither starve them nor be starved by them.
//
// Photos live in `mb_artist_photos`, not on `mb_artists`: the weekly loader
// replaces `mb_artists` whole. Rows are looked up by the Spotify id MusicBrainz
// carries, oldest first (never fetched, then least recently fetched). A lookup
// that finds no image is stamped too, with a null URL, so an act with no photo
// waits a full cycle instead of costing a call every night.

import * as Sentry from '@sentry/hono/node';
import {
  and,
  count,
  eq,
  isNotNull,
  isNull,
  lt,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
import { artists, db, mbArtistPhotos, mbArtists } from '@concert-crawl/db';
import { apiLogger } from '../lib/logger.js';
import type { SpotifyAppClient } from '../lib/spotify-app-client.js';
import {
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifyTimeoutError,
} from '../lib/spotify.js';

export interface MbPhotoSummary {
  refreshed: number;
  /** Lookups that found no photo (Spotify has no image, or no longer has the id). */
  empty: number;
  failures: number;
  abortedReason: 'rate_limit' | 'auth' | 'timeout' | null;
}

export interface RefreshMbPhotosOptions {
  client: SpotifyAppClient;
  /** Most lookups this run. Sized by the caller from the catalogue. */
  budgetFor: (eligible: number) => number;
  /** Photos fetched before this instant are due again. */
  staleBefore: Date;
  now: () => Date;
}

export const refreshMbPhotos = async ({
  client,
  budgetFor,
  staleBefore,
  now,
}: RefreshMbPhotosOptions): Promise<MbPhotoSummary> => {
  const summary: MbPhotoSummary = {
    refreshed: 0,
    empty: 0,
    failures: 0,
    abortedReason: null,
  };

  // Notable rows only (both links), and not an act an `artists` row already
  // holds: search leaves those out of the MusicBrainz half, and our own photo
  // pass owns them.
  const eligible = and(
    isNotNull(mbArtists.spotifyId),
    isNotNull(mbArtists.wikidataId),
    notExists(
      db
        .select({ mbid: artists.mbid })
        .from(artists)
        .where(eq(artists.mbid, mbArtists.mbid)),
    ),
  );

  const eligibleCount =
    (await db.select({ total: count() }).from(mbArtists).where(eligible))[0]
      ?.total ?? 0;

  const due = await db
    .select({ mbid: mbArtists.mbid, spotifyId: mbArtists.spotifyId })
    .from(mbArtists)
    .leftJoin(mbArtistPhotos, eq(mbArtistPhotos.mbid, mbArtists.mbid))
    .where(
      and(
        eligible,
        or(
          isNull(mbArtistPhotos.mbid),
          lt(mbArtistPhotos.photoFetchedAt, staleBefore),
        ),
      ),
    )
    .orderBy(
      sql`${mbArtistPhotos.photoFetchedAt} asc nulls first`,
      mbArtists.mbid,
    )
    .limit(budgetFor(eligibleCount));

  for (const row of due) {
    // The eligibility filter guarantees an id; this narrows the type.
    if (row.spotifyId === null) continue;
    try {
      const lookup = await client.fetchArtistPhoto(row.spotifyId);
      const photoUrl = lookup.found ? lookup.imageUrl : null;
      const fetchedAt = now();
      await db
        .insert(mbArtistPhotos)
        .values({ mbid: row.mbid, photoUrl, photoFetchedAt: fetchedAt })
        .onConflictDoUpdate({
          target: mbArtistPhotos.mbid,
          set: { photoUrl, photoFetchedAt: fetchedAt },
        });
      if (photoUrl === null) {
        summary.empty += 1;
      } else {
        summary.refreshed += 1;
      }
    } catch (err) {
      // A rate limit, a stalled Spotify or a rejected token is a whole-run
      // condition: stop, and the untouched rows are first in line tomorrow.
      if (err instanceof SpotifyRateLimitError) {
        summary.abortedReason = 'rate_limit';
        apiLogger.warn(
          { err, mbid: row.mbid },
          'refresh-mb-photos: rate limited, aborting',
        );
        break;
      }
      if (err instanceof SpotifyTimeoutError) {
        summary.abortedReason = 'timeout';
        apiLogger.error(
          { err, mbid: row.mbid },
          'refresh-mb-photos: Spotify timed out, aborting',
        );
        Sentry.captureException(err, { tags: { job: 'refresh-mb-photos' } });
        break;
      }
      if (err instanceof SpotifyAuthError) {
        summary.abortedReason = 'auth';
        apiLogger.error(
          { err, mbid: row.mbid },
          'refresh-mb-photos: app token rejected, aborting',
        );
        Sentry.captureException(err, { tags: { job: 'refresh-mb-photos' } });
        break;
      }
      summary.failures += 1;
      apiLogger.error(
        { err, mbid: row.mbid },
        'refresh-mb-photos: lookup failed',
      );
      Sentry.captureException(err, {
        tags: { job: 'refresh-mb-photos' },
        extra: { mbid: row.mbid },
      });
      // Stamp a row that has none, so a persistently bad Spotify id (a
      // malformed or retired one) waits a cycle instead of leading the queue
      // every night and eating the budget. A row that already has a photo is
      // left alone: it stays due, and keeps its picture until it ages out.
      await db
        .insert(mbArtistPhotos)
        .values({ mbid: row.mbid, photoUrl: null, photoFetchedAt: now() })
        .onConflictDoNothing();
    }
  }
  return summary;
};
