import { getAuth } from '@hono/clerk-auth'
import type { MiddlewareHandler } from 'hono'
import type { Role } from '@concert-crawl/types'

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: Role[] = ['user', 'sub_admin', 'admin']

function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role)
}

// requireRole — returns 403 if user's role is below the required level
// Must be used after clerkAuth middleware
export function requireRole(minimumRole: Role): MiddlewareHandler {
  return async (c, next) => {
    const auth = getAuth(c)

    if (!auth?.userId) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const userRole = (auth.sessionClaims?.publicMetadata as { role?: Role } | undefined)?.role

    if (!userRole || getRoleLevel(userRole) < getRoleLevel(minimumRole)) {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    await next()
  }
}
