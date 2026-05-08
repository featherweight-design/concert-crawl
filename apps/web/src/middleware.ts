import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Always accessible without any gate
const isAlwaysPublic = createRouteMatcher([
  '/',
  '/auth/code(.*)',
  '/sign-in(.*)',
  '/api/webhooks(.*)',
])

// Accessible to unauthenticated users IF they have the invite cookie
const isInviteGated = createRouteMatcher(['/onboarding(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Authenticated users bypass all invite gates
  const { userId } = await auth()
  if (userId) return

  if (isAlwaysPublic(req)) return

  if (isInviteGated(req)) {
    const cookieValue = req.cookies.get('invite_verified')?.value
    if (!cookieValue) {
      return NextResponse.redirect(new URL('/auth/code', req.url))
    }
    return
  }

  // Everything else requires Clerk auth
  await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
