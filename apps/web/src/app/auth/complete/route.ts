import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  verifyInviteCookie,
  INVITE_COOKIE_NAME,
  RETURN_PATH_COOKIE_NAME,
} from '@/lib/invite-cookie';
import {
  appendPendingTier,
  DEFAULT_RETURN_PATH,
  PENDING_TIER_PARAM,
  sanitizeReturnPath,
} from '@/lib/auth/intent';
import { decodePendingTier } from '@/lib/auth/pending-tier';

/**
 * Whether a sanitized destination already points at the tour. Compared as a
 * PATH — `/onboardingxyz` is a different route, and a bare `startsWith` would
 * treat it as one of ours.
 */
const isOnboardingPath = (destination: string): boolean => {
  const { pathname } = new URL(destination, 'https://placeholder.invalid');
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
};

const redirectTo = (path: string, request: NextRequest): NextResponse =>
  NextResponse.redirect(new URL(path, request.url));

/**
 * Where every finished sign-up lands: it redeems the invite, spends the return
 * path, and sends the new account on into the tour.
 *
 * A Route Handler rather than a page because it clears cookies, and Next only
 * lets a Server Action or Route Handler modify them. As a Server Component the
 * first `cookies().delete` threw after the invite had already been redeemed,
 * so every invited sign-up ended on the error screen (Sentry
 * CONCERT-CRAWL-WEB-E). The clears ride on the redirect response instead.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId, getToken } = await auth();
  if (!userId) return redirectTo('/sign-in', request);

  const secret = process.env.INVITE_COOKIE_SECRET;
  if (!secret) return redirectTo(DEFAULT_RETURN_PATH, request);

  const cookieValue = request.cookies.get(INVITE_COOKIE_NAME)?.value;
  const verified = cookieValue ? verifyInviteCookie(cookieValue, secret) : null;

  // Cleared only after a definitive answer (redeemed, or already used), so a
  // failed call leaves the cookie for the next visit to retry.
  let clearInvite = false;
  if (verified) {
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/v1/auth/redeem-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: verified.code }),
      });
      if (res.ok || res.status === 409) {
        clearInvite = true;
      } else {
        // Non-OK, non-409 (e.g. 400 bad JSON, 500 API error) — the fetch
        // resolved so `catch` doesn't fire, but redemption still failed.
        // Logged so it's visible in the server logs / Sentry rather than a
        // silent gap, now that #1113 routes every signup through here.
        console.warn('[auth/complete] redeem-code returned non-OK', {
          status: res.status,
        });
      }
    } catch (err) {
      // Network failure — leave the cookie so the next load can retry.
      console.warn('[auth/complete] redeem-code fetch failed', { err });
    }
  }

  // Where the visitor was headed before the funnel took over (#1226). The
  // cookie is signed, but it is still a redirect target, so it is re-sanitised
  // on read and not only on write. Cleared in the same pass — a return path is
  // spent once. /events stays the fallback, so a visitor with no pending
  // return path is unaffected.
  // Clearing keys off the cookie being PRESENT, not off its value being
  // truthy: `Cookie: invite_return_path=` is a cookie whose value is `''`,
  // which verifies to nothing and would otherwise survive every visit.
  const returnCookie = request.cookies.get(RETURN_PATH_COOKIE_NAME);
  const pendingReturn = returnCookie?.value
    ? verifyInviteCookie(returnCookie.value, secret)
    : null;

  // The launched funnel has no invite step, so nothing writes the cookie and
  // the destination rides a query param forwarded by /sign-up instead. The
  // cookie still wins where both exist: it is signed, and an invite link is a
  // stronger claim on where someone was headed than a param anyone can append.
  const params = request.nextUrl.searchParams;
  const rawReturn = params.get('return');

  // A tier chosen before signing up rides on to the destination, where the
  // picker reopens on it (#1284). Validated against the tier keys rather than
  // forwarded blind: it lands in a `Location` header.
  const rawTier = params.get(PENDING_TIER_PARAM);

  // Every visitor reaching this route has just CREATED an account — Clerk's
  // `SignUp` is the only thing that routes here — so this is the one place that
  // can send a new user into the tour without a "have they seen it" flag.
  // The destination rides along as `?return=`, and the tour's own finish CTA
  // spends it, so the walkthrough is a stop on the way rather than a detour
  // that loses where the visitor was headed.
  const destination = sanitizeReturnPath(pendingReturn?.code ?? rawReturn);

  // A destination that IS the tour is passed through rather than wrapped. The
  // signed-out Watch and Follow buttons build their own
  // `/sign-up?redirect_url=/onboarding?intent=…&label=…` — the tour is where a
  // pending action is handed back, so it has always been their target — and
  // wrapping that in a second `?return=` would walk the visitor through all
  // eight steps twice before replaying the watch they clicked.
  const landing = isOnboardingPath(destination)
    ? destination
    : `/onboarding?${new URLSearchParams({ return: destination }).toString()}`;

  const response = redirectTo(
    appendPendingTier(landing, decodePendingTier(rawTier)),
    request,
  );
  // Same path the code action set them on, or the browser keeps the original.
  if (clearInvite)
    response.cookies.delete({ name: INVITE_COOKIE_NAME, path: '/' });
  if (returnCookie) {
    response.cookies.delete({ name: RETURN_PATH_COOKIE_NAME, path: '/' });
  }
  return response;
}
