import { ImageResponse } from 'next/og';
import { PassportCard } from '@/components/consumer/passport/PassportCard';
import {
  PASSPORT_PRINT_MODE,
  PASSPORT_PRINT_SCALE,
} from '@/components/consumer/passport/definitions/modes';
import type {
  HistoryResponse,
  UserProfileResponse,
} from '@concert-crawl/types';
import { auth } from '@/lib/auth';
import { fetchHistory } from '@/lib/history';
import { loadShareFonts, type LoadedShareFont } from '@/lib/share/fonts';
import {
  isPassportRatio,
  PASSPORT_CACHE_CONTROL,
  PASSPORT_DIMENSIONS,
  PASSPORT_VARY,
  passportYear,
  resolvePassportTheme,
} from '@/lib/passport/passport-request';
import {
  matchesEtag,
  passportCacheKey,
  passportEtag,
  peekRendered,
  renderOnce,
} from '@/lib/passport/render-cache';
import { toAttendedShows } from '@/lib/passport/select-shows';
import { fetchMe } from '@/lib/users';

// The passport PNG.
//
// Unlike the poster this is personal data, so it runs WITH a session and is
// deliberately absent from `isAlwaysPublic`: there is no crawler-visible
// variant of somebody's year in shows, and a URL that renders one without a
// cookie is the whole feature's failure mode.
//
// It runs on the Node runtime rather than the edge. The poster is on the edge
// because it is CDN-cached for a day; a `private` card is cached by nobody but
// the requesting browser, so the edge buys nothing here and Clerk session
// resolution stays on the better-trodden path.

// Pinned, not inferred: the sibling poster route pins `edge`, and a default
// that drifted would move Clerk session resolution without anything failing.
export const runtime = 'nodejs';

interface PassportRouteContext {
  params: Promise<{ ratio: string }>;
}

const problem = (status: number, message: string): Response =>
  new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/**
 * Fonts come from our own origin: `next/font/google` output is unreachable
 * from a route handler and satori bundles no system fonts. A non-200 throws
 * rather than falling back — a card in a font nobody chose is worse than a 502.
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
  context: PassportRouteContext,
): Promise<Response> => {
  const { ratio } = await context.params;
  // Rejected before the session lookup and the two API calls: an unknown ratio
  // is unanswerable regardless of who is asking.
  if (!isPassportRatio(ratio)) {
    return problem(400, 'unknown ratio');
  }

  const { getToken } = await auth();
  const token = await getToken();
  if (token === null) {
    return problem(401, 'sign in to render your passport');
  }

  let profile: UserProfileResponse;
  let history: HistoryResponse;
  try {
    [profile, history] = await Promise.all([
      fetchMe(token),
      fetchHistory(token),
    ]);
  } catch (err) {
    console.error('[passport card] data fetch failed', { err });
    return problem(502, 'passport data unavailable');
  }

  const { tokens } = resolvePassportTheme({
    theme: new URL(request.url).searchParams.get('theme') ?? undefined,
    profileTheme: profile.theme,
  });

  const shows = toAttendedShows(history.past);
  const year = passportYear();
  const key = passportCacheKey({
    userId: profile.id,
    ratio,
    handle: profile.handle,
    year,
    tokens,
    shows,
  });
  const etag = passportEtag(key);
  const headers = {
    'Cache-Control': PASSPORT_CACHE_CONTROL,
    Vary: PASSPORT_VARY,
    ETag: etag,
  };

  // The browser already holds this exact card: nothing to render or send.
  if (matchesEtag(request.headers.get('If-None-Match'), etag)) {
    return new Response(null, { status: 304, headers });
  }

  // Fonts and satori are the expensive part, so they run only on a miss, and
  // once for any requests that arrive for the same card together.
  const hit = peekRendered(key);
  if (hit === undefined) {
    let fonts: LoadedShareFont[];
    try {
      fonts = await loadShareFonts(originFontLoader(request));
    } catch (err) {
      console.error('[passport card] font load failed', { err });
      return problem(502, 'share fonts unavailable');
    }
    try {
      const card = await renderOnce(key, () =>
        new ImageResponse(
          <PassportCard
            mode={PASSPORT_PRINT_MODE}
            scale={PASSPORT_PRINT_SCALE}
            shows={shows}
            tokens={tokens}
            handle={profile.handle}
            year={year}
          />,
          { ...PASSPORT_DIMENSIONS[ratio], fonts },
        ).arrayBuffer(),
      );
      return new Response(card.png, {
        headers: { ...headers, 'Content-Type': 'image/png' },
      });
    } catch (err) {
      console.error('[passport card] render failed', { err });
      return problem(502, 'passport render failed');
    }
  }
  return new Response(hit.png, {
    headers: { ...headers, 'Content-Type': 'image/png' },
  });
};
