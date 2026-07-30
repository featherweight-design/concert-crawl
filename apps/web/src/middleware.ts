import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Routes any visitor may reach, signed in or out.
 *
 * ⚠️ Adding a pattern here removes ALL auth from every path underneath it.
 * `/me` and `/admin` must never be reachable from this list, directly or as a
 * prefix. Every addition needs a negative case in middleware.test.ts proving
 * the private neighbours still redirect. See #794.
 */
const isAlwaysPublic = createRouteMatcher([
  '/',
  '/auth/code(.*)',
  '/sign-in(.*)',
  '/api/webhooks(.*)',
  // PWA install icons are fetched by the OS/browser without a session; gating
  // them redirects the fetch to the HTML landing page and the icon renders
  // blank. Scoped to /icon* so future /api/pwa handlers aren't public by default.
  '/api/pwa/icon(.*)',
  '/legal(.*)',
  // #794 — browse-only shape. Payload gating for these lives in the page
  // components and in apps/api, not here. `/watching` is public as a route and
  // gated as a payload, so its bottom-nav tab is never dead.
  '/events(.*)',
  '/venues(.*)',
  '/search(.*)',
  '/watching(.*)',
  '/onboarding(.*)',
])

/** Where a signed-out visitor is returned to when the attempted path is unsafe. */
const SAFE_RETURN_FALLBACK = '/events'

/** Decode passes allowed before a path is treated as hostile. */
const MAX_DECODE_PASSES = 5

/**
 * Reduces an attempted path to something that can only ever resolve back to
 * this origin, for use as Clerk's `redirect_url`.
 *
 * A single leading slash followed by anything other than a slash or backslash
 * is the only accepted shape. `//evil.example` and `/\evil.example` are both
 * browser-resolvable as hosts, and percent-encoding hides either from a naive
 * check — `/%5Cevil.example` decodes to `/\evil.example`.
 *
 * Decoding runs to a fixed point rather than once. A single pass is enough for
 * the browser itself (browsers do not re-decode a path), but the value is
 * handed to Clerk and then to whatever consumes the `redirect_url` after it, and
 * `/%255Cevil.example` survives one pass to become `/%5Cevil.example`. Deciding
 * this is safe requires knowing how many times every downstream consumer will
 * decode; validating the fully-decoded form requires knowing nothing. A path
 * still unstable after MAX_DECODE_PASSES, or one whose escapes are malformed, is
 * rejected — both are far more likely to be an attack than a real route.
 */
const toSafeReturnPath = (pathname: string, search: string): string => {
  let decoded = pathname

  for (let i = 0; i < MAX_DECODE_PASSES; i++) {
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch (err) {
      console.warn('middleware: undecodable path, dropping redirect_url', err)
      return SAFE_RETURN_FALLBACK
    }

    // Every intermediate form has to be safe too, not just the final one — a
    // consumer that stops decoding early must not be handed a hostile value.
    if (!/^\/[^/\\]/.test(next)) return SAFE_RETURN_FALLBACK

    if (next === decoded) return pathname + search
    decoded = next
  }

  console.warn(
    'middleware: path still decoding after %d passes, dropping redirect_url',
    MAX_DECODE_PASSES,
  )
  return SAFE_RETURN_FALLBACK
}

/** Sign-up still requires an invite code during private beta. */
const isInviteGated = createRouteMatcher(['/sign-up(.*)'])

/**
 * Signed-in users get bounced off these back to /events. `/onboarding` is
 * absent deliberately: it is a permanent post-auth route reachable from the
 * account menu, so bouncing would make that menu row appear to do nothing.
 */
const isPreAuth = createRouteMatcher(['/auth/code(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // Authenticated users skip directly to the app; no reason to see pre-auth pages
  // or the marketing landing. Redirecting from `/` here (rather than in the page
  // server component) keeps the landing route eligible for ISR — calling auth()
  // inside the page would force dynamic rendering. See #842.
  if (userId) {
    if (isPreAuth(req) || req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/events', req.url))
    }
    return
  }

  // Returning users: redeemed code but never completed sign-up.
  // invite_verified cookie is set but no Clerk session → send to onboarding.
  if (req.nextUrl.pathname === '/') {
    const inviteCookie = req.cookies.get('invite_verified')?.value
    if (inviteCookie) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  if (isAlwaysPublic(req)) return

  if (isInviteGated(req)) {
    const cookieValue = req.cookies.get('invite_verified')?.value
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/auth/code', req.url))
    }
    return
  }

  // Everything else requires Clerk auth. Signed-out visitors now have somewhere
  // to be, so a private route sends them to sign-in and back rather than
  // dropping them on marketing with their place lost. `redirect_url` is built
  // from pathname + search — never `req.url` — and then narrowed to a
  // same-origin shape, so no absolute or protocol-relative target can be
  // smuggled through it.
  const signInUrl = new URL('/sign-in', req.url)
  signInUrl.searchParams.set(
    'redirect_url',
    toSafeReturnPath(req.nextUrl.pathname, req.nextUrl.search),
  )
  await auth.protect({ unauthenticatedUrl: signInUrl.toString() })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
