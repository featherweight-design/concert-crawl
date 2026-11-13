import { ImageResponse } from 'next/og';

import { InviteCard } from '@/components/consumer/share-app/InviteCard';
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios';
import { loadShareFonts, type LoadedShareFont } from '@/lib/share/fonts';

// The card a pasted invite link unfurls into. `/i/<code>` is a 302 to
// `/auth/code`, so a crawler reads that page's Open Graph tags and fetches this
// image. It names nobody and reads nothing user-specific, so one cached image
// serves every code.
//
// A route handler rather than an `opengraph-image` file, for the same reason as
// `/api/og`: the fonts live under `public/` and the only loader proven to reach
// them resolves against the incoming request URL. Edge, and session-free: the
// caller is an unfurl crawler, which carries no cookies and will not retry.
export const runtime = 'edge';

const CARD = SC_RATIOS.link;

const CACHE_CONTROL = 'public, max-age=0, s-maxage=86400, must-revalidate';

const problem = (status: number, message: string): Response =>
  new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/** A non-200 fails the render: satori draws a missing face as nothing. */
const originFontLoader = (request: Request) => async (assetPath: string) => {
  const response = await fetch(new URL(assetPath, request.url));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.arrayBuffer();
};

export const GET = async (request: Request): Promise<Response> => {
  let fonts: LoadedShareFont[];
  try {
    fonts = await loadShareFonts(originFontLoader(request));
  } catch (err) {
    console.error('[invite card] font load failed', { err });
    return problem(502, 'share fonts unavailable');
  }

  return new ImageResponse(
    <InviteCard width={CARD.width} height={CARD.height} />,
    {
      ...CARD,
      fonts,
      headers: { 'Cache-Control': CACHE_CONTROL },
    },
  );
};
