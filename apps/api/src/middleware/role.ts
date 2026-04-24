import { getAuth } from '@hono/clerk-auth'
import type { MiddlewareHandler } from 'hono'
import { ROLE_HIERARCHY, isRole } from '@concert-crawl/types'
import type { Role } from '@concert-crawl/types'

function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role)
}

// requireRole — returns 403 if user's role is below the required level
// Must be used after clerkAuth middleware
export function requireRole(minimumRole: Role): MiddlewareHandler {
  return async (ctx, next) => {
    const auth = getAuth(ctx)

    if (!auth?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }

    // publicMetadata is typed as {} by Clerk — cast to indexable so we can
    // extract the role key safely before validating it with isRole()
    const metadata = auth.sessionClaims?.publicMetadata as
      | Record<string, unknown>
      | undefined
    const userRole = isRole(metadata?.['role']) ? metadata['role'] : undefined

    if (!userRole || getRoleLevel(userRole) < getRoleLevel(minimumRole)) {
      return ctx.json({ success: false, error: 'Forbidden' }, 403)
    }

    await next()
  }
}
