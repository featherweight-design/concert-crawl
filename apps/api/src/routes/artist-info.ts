import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  db,
  artists,
  events,
  heldByMbidFollow,
  mbArtists,
} from '@concert-crawl/db';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { ARTIST_SLUG_MAX_LENGTH } from '@concert-crawl/types';
import type {
  ArtistInfoFacts,
  ArtistInfoImage,
  ArtistInfoResponse,
} from '@concert-crawl/types';
import { billsCanonicalName } from '../lib/event-billing.js';
import { servableArtistPhotoUrl } from '../lib/artist-photo.js';
import { markPublicRead } from '../lib/edge-cache.js';
import { resolveWikimediaInfo } from '../lib/artist-info.js';

export const artistInfoRouter = new Hono();

const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(ARTIST_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9-]+$/),
});

const notFound = { success: false, error: 'Artist not found' } as const;

// GET /v1/artists/:slug/info — facts, summary and image for the artist page
// (artist-search plan PR 6). Public and the same for every viewer.
//
// The visibility gate runs before the resolver and before any cache header.
// It is the artist page's own gate (a hidden row, or one that no visible
// event bills and no MBID follow holds) plus a `not_an_artist` check, since
// this route reaches out to Wikimedia. Each answers 404 exactly like an
// unknown slug. A 404 sets no Cache-Control, so the edge never holds
// one; a 200 takes the shared public window (`markPublicRead`, about twelve
// minutes at most), so an artist hidden after a 200 stops answering within it.
artistInfoRouter.get(
  '/:slug/info',
  zValidator('param', slugParamSchema, (result, ctx) => {
    if (!result.success) return ctx.json(notFound, 404);
  }),
  async (ctx) => {
    const { slug } = ctx.req.valid('param');

    const [artist] = await db
      .select({
        id: artists.id,
        canonicalName: artists.canonicalName,
        mbid: artists.mbid,
        spotifyArtistId: artists.spotifyArtistId,
        photoUrl: servableArtistPhotoUrl(),
      })
      .from(artists)
      .where(
        and(
          eq(artists.slug, slug),
          eq(artists.hidden, false),
          ne(artists.matchStatus, 'not_an_artist'),
        ),
      );
    if (!artist) return ctx.json(notFound, 404);

    const [billed] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          billsCanonicalName(artist.canonicalName),
          eq(events.hiddenFromConsumer, false),
          isNull(events.firstMissingAt),
        ),
      )
      .limit(1);
    const [held] = billed
      ? []
      : await db
          .select({ id: artists.id })
          .from(artists)
          .where(and(eq(artists.id, artist.id), heldByMbidFollow));
    if (!billed && !held) return ctx.json(notFound, 404);

    const [slim] = artist.mbid
      ? await db
          .select({
            type: mbArtists.type,
            area: mbArtists.area,
            disambiguation: mbArtists.disambiguation,
            spotifyId: mbArtists.spotifyId,
            wikidataId: mbArtists.wikidataId,
          })
          .from(mbArtists)
          .where(eq(mbArtists.mbid, artist.mbid))
      : [];

    // Ours first: it is the match the page already shows, and plan decision 7
    // never lets MusicBrainz overrule it.
    const spotifyId = artist.spotifyArtistId ?? slim?.spotifyId ?? null;
    const facts: ArtistInfoFacts | null =
      artist.mbid && slim
        ? {
            mbid: artist.mbid,
            type: slim.type,
            area: slim.area,
            disambiguation: slim.disambiguation,
            links: {
              musicbrainz: `https://musicbrainz.org/artist/${artist.mbid}`,
              wikidata: slim.wikidataId
                ? `https://www.wikidata.org/wiki/${slim.wikidataId}`
                : null,
              spotify: spotifyId
                ? `https://open.spotify.com/artist/${spotifyId}`
                : null,
            },
          }
        : null;

    const wikimedia =
      artist.mbid && slim?.wikidataId
        ? await resolveWikimediaInfo(artist.mbid, slim.wikidataId)
        : { summary: null, image: null };

    // Plan decision 5: Spotify, then a free Commons file, then null (the
    // client draws the IdentityArt plate).
    const image: ArtistInfoImage | null = artist.photoUrl
      ? { source: 'spotify', url: artist.photoUrl }
      : wikimedia.image;

    const data: ArtistInfoResponse = {
      image,
      facts,
      summary: wikimedia.summary,
    };
    markPublicRead(ctx);
    return ctx.json({ success: true, data });
  },
);
