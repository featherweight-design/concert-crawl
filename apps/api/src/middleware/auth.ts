import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import type { Context, MiddlewareHandler, Next } from 'hono'
import { setSentryUser } from '../lib/sentry-user.js'

// Initialize Clerk middleware — verifies JWT from Authorization: Bearer <token>
export const clerkAuth = clerkMiddleware()

// serviceOrClerkAuth — allows requests that carry a valid INTERNAL_API_SECRET
// service key header (Next.js SSR calling public endpoints) without requiring a
// user session. All other requests must pass Clerk auth as normal. Once a user
// session is confirmed, tags the request's Sentry scope with the user id.
export const serviceOrClerkAuth: MiddlewareHandler = async (
  ctx: Context,
  next: Next,
) => {
  const serviceKey = process.env['INTERNAL_API_SECRET']
  if (serviceKey && ctx.req.header('x-service-key') === serviceKey) {
    await next()
    return
  }

  // Populate Clerk auth context without advancing to the route handler yet,
  // then check auth ourselves and either 401 or call the real next.
  await clerkAuth(ctx, async () => {})

  const authHeader = ctx.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const auth = getAuth(ctx)
  if (!auth?.userId) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  setSentryUser(auth.userId)
  await next()
}

// requireAuth — use after clerkAuth on protected routes
// Returns 401 if no valid session is present; otherwise tags the request's
// Sentry scope with the user id before advancing.
export const requireAuth: MiddlewareHandler = async (
  ctx: Context,
  next: Next,
) => {
  const authHeader = ctx.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const auth = getAuth(ctx)

  if (!auth?.userId) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  setSentryUser(auth.userId)
  await next()
}

// getAuthUser — call inside a route handler after requireAuth to get the userId
export function getAuthUser(ctx: Context): { userId: string } {
  const auth = getAuth(ctx)
  if (!auth?.userId)
    throw new Error('getAuthUser called outside of authenticated context')
  return { userId: auth.userId }
}

// getAuthOptional — returns userId if authenticated, null if not; for
// optional-auth routes. When authenticated, also tags the request's Sentry
// scope with the user id — these routes never pass through requireAuth, so this
// is the only place a signed-in user on a public endpoint gets attributed.
export function getAuthOptional(ctx: Context): { userId: string } | null {
  const auth = getAuth(ctx)
  if (!auth?.userId) return null
  setSentryUser(auth.userId)
  return { userId: auth.userId }
}
