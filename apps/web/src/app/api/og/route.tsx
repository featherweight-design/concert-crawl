import { ImageResponse } from 'next/og'

import { SiteCard } from '@/components/brand/SiteCard'
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios'
import { loadShareFonts, type LoadedShareFont } from '@/lib/share/fonts'

// The site-level social card — what a bare `concertcrawl.app` link unfurls
// into, and the default image for every route that does not build its own.
//
// A route handler rather than Next's `opengraph-image` file convention, for
// one reason: satori ships no fonts, the TTFs live under `public/`, and the
// only loader proven to reach them in this app resolves against the incoming
// request URL (see the share card route). The file convention hands the
// renderer no request to resolve against.
//
// Edge, and session-free: the caller is an unfurl crawler, which carries no
// cookies and will not retry.
export const runtime = 'edge'

const CARD = SC_RATIOS.link

// A day, matching the share card. The art only changes when we ship, and a
// crawler that re-fetches is cheap; a failure is never cached.
const CACHE_CONTROL = 'public, max-age=0, s-maxage=86400, must-revalidate'

const problem = (status: number, message: string): Response =>
  new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })

/**
 * Fetch the faces from our own origin. A non-200 fails the render rather than
 * falling back: satori draws a missing face as nothing at all, so the fallback
 * would be a wordmark-shaped hole in somebody else's post.
 */
const originFontLoader = (request: Request) => async (assetPath: string) => {
  const url = new URL(assetPath, request.url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.arrayBuffer()
}

export const GET = async (request: Request): Promise<Response> => {
  let fonts: LoadedShareFont[]
  try {
    fonts = await loadShareFonts(originFontLoader(request))
  } catch (err) {
    console.error('[site card] font load failed', { err })
    return problem(502, 'share fonts unavailable')
  }

  return new ImageResponse(
    <SiteCard width={CARD.width} height={CARD.height} />,
    {
      ...CARD,
      fonts,
      headers: { 'Cache-Control': CACHE_CONTROL },
    },
  )
}
