import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicBrowseEnabled } from '@/lib/launch-mode'

/**
 * Routes any visitor may reach, signed in or out, in either launch mode.
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
  // The crawler cron POSTs here machine-to-machine with an `x-revalidate-token`
  // header and no Clerk session, so gating it 307'd every call to /sign-in and
  // #1442's proactive revalidation never once fired in prod. The route
  // authenticates itself against REVALIDATE_SECRET and fails closed with 401
  // when that is unset — Clerk was simply the wrong gate for a non-browser
  // caller. Exact path, not a prefix.
  '/api/revalidate',
  '/legal(.*)',
  // "What's new" is reachable from the signed-out account menu and renders a
  // static release list with no user data — gating it sent that menu row to
  // sign-up.
  '/changelog(.*)',
])

/**
 * The #794 browse-only shape — public once, and only once, the launch flag is
 * on. Payload gating for these lives in the page components and in apps/api,
 * not here. `/watching` is public as a route and gated as a payload, so its
 * bottom-nav tab is never dead.
 *
 * Until launch these fall through to the same treatment they had before #794:
 * signed-out visitors are sent to sign-in, and the front door is the invite
 * code. Nothing about the vertical is deleted — it is just unreachable.
 */
const isPublicOnceLaunched = createRouteMatcher([
  '/events(.*)',
  '/venues(.*)',
  // Artist pages (#1115) sit exactly where venue pages do: browsable once the
  // product is public, invite-gated until then. Deliberately NOT in
  // `isAlwaysPublic` — putting a browse vertical there is what made a private
  // beta publicly readable in #794.
  '/artists(.*)',
  '/search(.*)',
  '/watching(.*)',
  '/onboarding(.*)',
  // `/sign-up` belongs here for the same reason as the rest: once the product
  // is public, an invite code is no longer the price of an account. #794 left
  // it unconditionally invite-gated, which meant the public landing page's
  // "Sign up" button — and PR-F's signed-out watch → sign-up hand-off — both
  // bounced the visitor to /auth/code. Opening it is what makes the launched
  // shape actually complete.
  '/sign-up(.*)',
  // #72 share loop. `/e/:id` is the read-only public mirror of an event page
  // and `/share/:id/...` renders its poster PNG — both are the landing surface
  // for a link pasted into iMessage or Slack, so they have to resolve without a
  // session once the product is public. They sit HERE and not in
  // `isAlwaysPublic` for the same reason `/artists` does: a share link that
  // leaks event data out of a private beta is the #794 incident again. Before
  // launch a shared link behaves like every other browse URL — sign-in, then
  // straight back to the event.
  '/e/(.*)',
  '/share/(.*)',
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

/**
 * Sign-up requires an invite code before launch. After launch it is public —
 * see the `/sign-up` note in isPublicOnceLaunched, which is checked first.
 */
const isInviteGated = createRouteMatcher(['/sign-up(.*)'])

/**
 * Before launch, onboarding is part of the invite funnel and needs the cookie —
 * the landing page sends a returning code-holder straight there.
 */
const isInviteGatedBeforeLaunch = createRouteMatcher(['/onboarding(.*)'])

/**
 * Signed-in users get bounced off these back to /events. Once launched,
 * `/onboarding` drops out: it becomes a permanent post-auth route reachable
 * from the account menu, so bouncing would make that menu row do nothing.
 */
const isPreAuth = createRouteMatcher(['/auth/code(.*)', '/sign-up(.*)'])
const isPreAuthBeforeLaunch = createRouteMatcher(['/onboarding(.*)'])

/**
 * Only the slice of Clerk's auth helper this middleware actually touches.
 * Clerk's richer object is assignable to it, and tests can pass a small stub.
 */
interface MiddlewareAuth {
  (): Promise<{ userId: string | null }>
  protect(options: { unauthenticatedUrl: string }): Promise<unknown>
}

/**
 * Exported for middleware.test.ts, which needs a callable signature — the
 * default export's opaque type forced a cast at every one of its call sites.
 */
export const middlewareHandler = async (
  auth: MiddlewareAuth,
  req: NextRequest,
): Promise<NextResponse | undefined> => {
  const { userId } = await auth()
  const launched = isPublicBrowseEnabled()

  // Authenticated users skip directly to the app; no reason to see pre-auth pages
  // or the marketing landing. Redirecting from `/` here (rather than in the page
  // server component) keeps the landing route eligible for ISR — calling auth()
  // inside the page would force dynamic rendering. See #842.
  if (userId) {
    if (
      isPreAuth(req) ||
      (!launched && isPreAuthBeforeLaunch(req)) ||
      req.nextUrl.pathname === '/'
    ) {
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
  if (launched && isPublicOnceLaunched(req)) return

  if (isInviteGated(req) || (!launched && isInviteGatedBeforeLaunch(req))) {
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
}

export default clerkMiddleware(middlewareHandler)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
