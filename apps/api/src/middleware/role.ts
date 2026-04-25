import { getAuth } from '@hono/clerk-auth'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'
import { ROLE_HIERARCHY } from '@concert-crawl/types'
import type { Role } from '@concert-crawl/types'

// Validates the shape of the custom claims added by our Clerk JWT template:
//   { "metadata": "{{user.public_metadata}}" }
// Using Zod here avoids type-casting and catches malformed claims at runtime.
const claimsSchema = z.object({
  metadata: z
    .object({ role: z.enum(['admin', 'sub_admin', 'user']) })
    .optional(),
})

function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role)
}

// requireRole — returns 403 if user's role is below the required level
// Must be used after clerkAuth middleware
export function requireRole(minimumRole: Role): MiddlewareHandler {
  return async (ctx, next) => {
    const auth = getAuth(ctx)

    if (!auth?.userId) {
      console.warn(
        '[requireRole] No userId on auth object — unauthenticated request',
      )
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const claims = claimsSchema.safeParse(auth.sessionClaims)
    const userRole = claims.success ? claims.data.metadata?.role : undefined

    if (!userRole || getRoleLevel(userRole) < getRoleLevel(minimumRole)) {
      console.warn(
        `[requireRole] Forbidden: userId=${auth.userId} role=${userRole ?? 'none'} required=${minimumRole}`,
      )
      return ctx.json({ success: false, error: 'Forbidden' }, 403)
    }

    await next()
  }
}
