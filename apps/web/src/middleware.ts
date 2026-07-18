import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Always accessible without any gate
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
])

// Accessible to unauthenticated users IF they have the invite cookie
const isInviteGated = createRouteMatcher(['/onboarding(.*)', '/sign-up(.*)'])

// Pre-auth routes: public pages that authenticated users have no reason to visit
const isPreAuth = createRouteMatcher([
  '/auth/code(.*)',
  '/onboarding(.*)',
  '/sign-up(.*)',
])

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

  // Everything else requires Clerk auth
  await auth.protect({ unauthenticatedUrl: new URL('/', req.url).toString() })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
