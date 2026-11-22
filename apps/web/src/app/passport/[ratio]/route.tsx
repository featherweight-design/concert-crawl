import type {
  HistoryResponse,
  UserProfileResponse,
} from '@concert-crawl/types';
import { auth } from '@/lib/auth';
import { fetchHistory } from '@/lib/history';
import {
  isPassportRatio,
  PASSPORT_CACHE_CONTROL,
  PASSPORT_VARY,
} from '@/lib/passport/passport-request';
import { matchesEtag, passportEtag } from '@/lib/passport/render-cache';
import { planPassportCard } from '@/lib/passport/render-card';
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

  const plan = planPassportCard({
    ratio,
    userId: profile.id,
    handle: profile.handle,
    profileTheme: profile.theme,
    themeOverride: new URL(request.url).searchParams.get('theme') ?? undefined,
    past: history.past,
  });
  const etag = passportEtag(plan.key);
  const headers = {
    'Cache-Control': PASSPORT_CACHE_CONTROL,
    Vary: PASSPORT_VARY,
    ETag: etag,
  };

  // The browser already holds this exact card: nothing to render or send.
  if (matchesEtag(request.headers.get('If-None-Match'), etag)) {
    return new Response(null, { status: 304, headers });
  }

  try {
    const png = await plan.render(new URL(request.url).origin);
    return new Response(png, {
      headers: { ...headers, 'Content-Type': 'image/png' },
    });
  } catch (err) {
    console.error('[passport card] render failed', { err });
    return problem(502, 'passport render failed');
  }
};
