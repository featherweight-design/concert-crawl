import { ImageResponse } from 'next/og';
import type { EventDetailResponse } from '@concert-crawl/types';
import { PosterCard } from '@/components/consumer/share/PosterCard';
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios';
import { ApiError, publicApiClient } from '@/lib/api';
import { loadShareFonts, type LoadedShareFont } from '@/lib/share/fonts';
import { mintMeta, posterFingerprint, shareCacheKey } from '@/lib/share/mint';
import { toPosterEvent } from '@/lib/share/poster-event';
import { sharePhotoSources, toShareCard } from '@/lib/share/share-layout';
import { loadSharePhoto } from '@/lib/share/share-photo';
import {
  etagMatches,
  parseShareRequest,
  shareCacheControl,
} from '@/lib/share/share-request';

// The poster PNG.
//
// Runs on the edge and, critically, WITHOUT a session: the primary consumer is
// an OG crawler following a pasted link, and those carry no cookies. Everything
// the card needs therefore comes from the public event endpoint plus the URL.
//
// The contract this route owns is "never throw". A 500 here renders as a broken
// image icon inside somebody else's post, so every failure path below is an
// explicit status code with a plain-text body.
export const runtime = 'edge';

interface ShareRouteContext {
  params: Promise<{ eventId: string; ratio: string }>;
}

// `no-store` is the point: a success here is cached for a day, and an
// intermediary applying its own default to a failure would pin a broken image
// into somebody's post long after the cause was fixed.
const problem = (status: number, message: string): Response =>
  new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/**
 * Fetch the fonts from our own origin. `next/font/google` output is not
 * reachable from a route handler and satori bundles no system fonts, so the
 * TTFs under `public/fonts/share/` are the only source. A non-200 throws
 * rather than falling back — a silent fallback renders the card in a font
 * nobody chose, which is worse than a 502.
 */
const originFontLoader = (request: Request) => async (assetPath: string) => {
  const url = new URL(assetPath, request.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.arrayBuffer();
};

export const GET = async (
  request: Request,
  context: ShareRouteContext,
): Promise<Response> => {
  const { eventId, ratio } = await context.params;
  const query = new URL(request.url).searchParams;

  const parsed = parseShareRequest({
    eventId,
    ratio,
    theme: query.get('theme') ?? undefined,
    by: query.get('by') ?? undefined,
  });
  if (!parsed.ok) {
    return problem(400, parsed.reason);
  }

  let event: EventDetailResponse;
  try {
    event = await publicApiClient.get<EventDetailResponse>(
      `/v1/events/${parsed.eventId}`,
    );
  } catch (err) {
    console.error('[share card] event fetch failed', {
      eventId: parsed.eventId,
      err,
    });
    // Only a real 404 is a 404. An API outage answered with one would be
    // cached as "this show does not exist" for a day by the s-maxage above,
    // long outliving the outage that produced it.
    const missing = err instanceof ApiError && err.status === 404;
    return missing
      ? problem(404, 'event not found')
      : problem(502, 'event lookup failed');
  }

  const poster = toPosterEvent(event);
  const card = toShareCard(event);
  const photoSources = sharePhotoSources(event);
  // A countdown card expires at the venue's midnight, so "4 DAYS AWAY" is
  // never served on the day it reads 3.
  const cacheControl = shareCacheControl(card.countdown, event.venue.timezone);
  // The mint is what makes the ETag content-addressed: change the price status
  // and the hash moves, so a cached card for a now-sold-out show expires on
  // its own rather than on a timer.
  const mint = mintMeta(
    { id: poster.id, state: poster.state },
    parsed.handle !== null
      ? { id: parsed.handle, handle: parsed.handle }
      : { id: 'anon' },
  );
  // The mint alone is too coarse to cache on — see `posterFingerprint`. The
  // countdown is in here, so the tag moves with the day count too.
  const drawn = posterFingerprint([
    card.artist,
    card.venue,
    card.city,
    poster.dateShort,
    card.showTime,
    card.chip?.label ?? null,
    card.countdown,
    photoSources.join(' '),
  ]);
  const etag = `"${shareCacheKey(poster.id, parsed.handle ?? 'anon', mint.contentHash)}:${parsed.ratio}:${parsed.theme}:${drawn}"`;

  if (etagMatches(request.headers.get('if-none-match'), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': cacheControl },
    });
  }

  // The photo never fails the card: a slow or broken host falls through to
  // the next source, then to IdentityArt.
  const photoPromise = loadSharePhoto(photoSources);
  let fonts: LoadedShareFont[];
  try {
    fonts = await loadShareFonts(originFontLoader(request));
  } catch (err) {
    console.error('[share card] font load failed', { err });
    return problem(502, 'share fonts unavailable');
  }
  const photo = await photoPromise;

  return new ImageResponse(
    <PosterCard card={card} ratio={parsed.ratio} photo={photo} />,
    {
      ...SC_RATIOS[parsed.ratio],
      fonts,
      headers: {
        'Cache-Control': cacheControl,
        ETag: etag,
      },
    },
  );
};
