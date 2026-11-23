import { sql } from 'drizzle-orm';

/**
 * True when a follow made by MBID (artist-search plan PR 5) points at the
 * `artists` row in scope: the follow's MBID is the row's, or the follow was
 * written against the row by name (the row had no MBID of its own when the
 * user picked the MusicBrainz act) and so carries the same canonical name.
 * The name half applies only while the row still has no MBID: once it gains
 * one that differs, it is another act, and the follow no longer holds it.
 *
 * One predicate for two readers, so they cannot drift: `pruneArtists` keeps
 * such a row even with no event referencing it, and `GET /v1/artists/:slug`
 * serves it with no visible show. Only `POST /v1/artists/follow` writes
 * `user_artist_follows.mbid`, so a follow by slug or a Spotify-synced follow
 * never holds a row here, and until a client calls that route no row is held.
 *
 * Raw table names, because prune runs it inside a hand-written
 * `DELETE FROM artists`; a Drizzle query over the unaliased `artists` table
 * renders the same names.
 */
export const heldByMbidFollow = sql`EXISTS (
  SELECT 1 FROM user_artist_follows held
  WHERE held.mbid IS NOT NULL
    AND (
      held.mbid = artists.mbid
      OR (artists.mbid IS NULL AND held.canonical_name = artists.canonical_name)
    )
)`;
