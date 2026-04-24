import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import type { Context, MiddlewareHandler, Next } from 'hono'

// Initialize Clerk middleware — verifies JWT from Authorization: Bearer <token>
export const clerkAuth = clerkMiddleware()

// requireAuth — use after clerkAuth on protected routes
// Returns 401 if no valid session is present
export const requireAuth: MiddlewareHandler = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const auth = getAuth(c)

  if (!auth?.userId) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  await next()
}

// getAuthUser — call inside a route handler after requireAuth to get the userId
export function getAuthUser(c: Context): { userId: string } {
  const auth = getAuth(c)
  if (!auth?.userId) throw new Error('getAuthUser called outside of authenticated context')
  return { userId: auth.userId }
}
