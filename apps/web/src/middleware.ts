import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicBrowseEnabled } from '@/lib/launch-mode'
import {
  DEFAULT_RETURN_PATH,
  isSafeReturnPath,
  sanitizeReturnPath,
} from '@/lib/auth/intent'

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
  // Every crawl request we send advertises `+https://concertcrawl.app/bot`, so
  // this page has to resolve for a venue's sysadmin who has no account and never
  // will. Gating it behind the beta would make our own user agent point at a
  // sign-in wall. Static, no user data, deliberately indexable. See #1228.
  // Both spellings are listed because middleware matches the path as requested:
  // a trailing-slash request would otherwise miss the exact match and redirect
  // to sign-in before Next ever normalized it away. Deliberately not `/bot(.*)`,
  // which would make every future `/bot`-prefixed route public by default.
  '/bot',
  '/bot/',
  // Next generates these from app/robots.ts and app/sitemap.ts, and they are
  // ordinary routes as far as middleware is concerned — the `config.matcher`
  // extension allowlist below covers neither `.txt` nor `.xml`, so both were
  // 307'd to /sign-in the moment they shipped and #1228's discoverability work
  // was inert in prod. A crawler does not carry a session by definition, which
  // makes Clerk the wrong gate here for the same reason it was wrong for
  // `/api/revalidate`. Exact paths: nothing else under the app root should
  // inherit this.
  '/robots.txt',
  '/sitemap.xml',
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
const SAFE_RETURN_FALLBACK = DEFAULT_RETURN_PATH

/**
 * Reduces an attempted path to something that can only ever resolve back to
 * this origin, for use as Clerk's `redirect_url`. The query rides along and is
 * validated with the path rather than appended behind its back — the whole
 * string is what reaches the `Location` header.
 */
const toSafeReturnPath = (pathname: string, search: string): string => {
  const attempted = pathname + search
  return isSafeReturnPath(attempted) ? attempted : SAFE_RETURN_FALLBACK
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
      // Carry the return path into the beta funnel. This branch is reached
      // from `/sign-up(.*)` and, before launch, `/onboarding(.*)` — both are
      // funnel steps rather than destinations, so `toSafeReturnPath` alone
      // would return the visitor to the step they were bounced from (or,
      // once signed in, bounce them on to /events) instead of the crew link
      // they actually tapped. A visitor arriving at
      // `/sign-up?redirect_url=/crew/join/<token>` has their real
      // destination in the querystring, so the INCOMING param wins when
      // present.
      // It arrived from the querystring and is attacker-controllable, hence
      // sanitizeReturnPath before it is reused.
      const incoming = req.nextUrl.searchParams.get('redirect_url')
      const codeUrl = new URL('/auth/code', req.url)
      codeUrl.searchParams.set(
        'redirect_url',
        incoming
          ? sanitizeReturnPath(incoming)
          : toSafeReturnPath(req.nextUrl.pathname, req.nextUrl.search),
      )
      return NextResponse.redirect(codeUrl)
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
