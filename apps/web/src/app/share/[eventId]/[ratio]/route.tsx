import { ImageResponse } from 'next/og'
import type { EventDetailResponse } from '@concert-crawl/types'
import { PosterCard } from '@/components/consumer/share/PosterCard'
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios'
import { ApiError, publicApiClient } from '@/lib/api'
import { loadShareFonts, type LoadedShareFont } from '@/lib/share/fonts'
import { mintMeta, posterFingerprint, shareCacheKey } from '@/lib/share/mint'
import { toPosterEvent } from '@/lib/share/poster-event'
import {
  parseShareRequest,
  SHARE_CACHE_CONTROL,
} from '@/lib/share/share-request'

// The poster PNG.
//
// Runs on the edge and, critically, WITHOUT a session: the primary consumer is
// an OG crawler following a pasted link, and those carry no cookies. Everything
// the card needs therefore comes from the public event endpoint plus the URL.
//
// The contract this route owns is "never throw". A 500 here renders as a broken
// image icon inside somebody else's post, so every failure path below is an
// explicit status code with a plain-text body.
export const runtime = 'edge'

interface ShareRouteContext {
  params: Promise<{ eventId: string; ratio: string }>
}

const problem = (status: number, message: string): Response =>
  new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })

/**
 * Fetch the fonts from our own origin. `next/font/google` output is not
 * reachable from a route handler and satori bundles no system fonts, so the
 * TTFs under `public/fonts/share/` are the only source. A non-200 throws
 * rather than falling back — a silent fallback renders the card in a font
 * nobody chose, which is worse than a 502.
 */
const originFontLoader = (request: Request) => async (assetPath: string) => {
  const url = new URL(assetPath, request.url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.arrayBuffer()
}

export const GET = async (
  request: Request,
  context: ShareRouteContext,
): Promise<Response> => {
  const { eventId, ratio } = await context.params
  const query = new URL(request.url).searchParams

  const parsed = parseShareRequest({
    eventId,
    ratio,
    theme: query.get('theme') ?? undefined,
    by: query.get('by') ?? undefined,
  })
  if (!parsed.ok) {
    return problem(400, parsed.reason)
  }

  let event: EventDetailResponse
  try {
    event = await publicApiClient.get<EventDetailResponse>(
      `/v1/events/${parsed.eventId}`,
    )
  } catch (err) {
    console.error('[share card] event fetch failed', {
      eventId: parsed.eventId,
      err,
    })
    // Only a real 404 is a 404. An API outage answered with one would be
    // cached as "this show does not exist" for a day by the s-maxage above,
    // long outliving the outage that produced it.
    const missing = err instanceof ApiError && err.status === 404
    return missing
      ? problem(404, 'event not found')
      : problem(502, 'event lookup failed')
  }

  let fonts: LoadedShareFont[]
  try {
    fonts = await loadShareFonts(originFontLoader(request))
  } catch (err) {
    console.error('[share card] font load failed', { err })
    return problem(502, 'share fonts unavailable')
  }

  const poster = toPosterEvent(event)
  // The mint is what makes the ETag content-addressed: change the price status
  // and the hash moves, so a cached card for a now-sold-out show expires on
  // its own rather than on a timer.
  const mint = mintMeta(
    { id: poster.id, state: poster.state },
    parsed.handle !== null
      ? { id: parsed.handle, handle: parsed.handle }
      : { id: 'anon' },
  )
  // The mint alone is too coarse to cache on — see `posterFingerprint`.
  const drawn = posterFingerprint([
    poster.artist,
    poster.venue,
    poster.city,
    poster.dateShort,
    poster.showTime,
    poster.state,
    poster.dropLabel,
  ])
  const etag = `"${shareCacheKey(poster.id, parsed.handle ?? 'anon', mint.contentHash)}:${parsed.ratio}:${parsed.theme}:${drawn}"`

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': SHARE_CACHE_CONTROL },
    })
  }

  return new ImageResponse(
    <PosterCard
      event={poster}
      ratio={parsed.ratio}
      tokens={parsed.tokens}
      handle={parsed.handle}
    />,
    {
      ...SC_RATIOS[parsed.ratio],
      fonts,
      headers: {
        'Cache-Control': SHARE_CACHE_CONTROL,
        ETag: etag,
      },
    },
  )
}
