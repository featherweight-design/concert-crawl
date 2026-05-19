import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createClerkClient } from '@clerk/backend'
import type { AdminVariables } from './index.js'
import type { Role } from '@concert-crawl/types'
import { ROLE_HIERARCHY, isRole } from '@concert-crawl/types'

const secretKey = process.env['CLERK_SECRET_KEY'] ?? ''
const clerkClient = createClerkClient({ secretKey })

const ASSIGNABLE_ROLES: readonly Role[] = ['admin', 'promoter', 'beta', 'user']

const patchRoleSchema = z.object({
  role: z.enum(['admin', 'promoter', 'beta', 'user']),
})

export const usersAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/users — list all Clerk users with their current role
usersAdminRouter.get('/', async (ctx) => {
  const limitParam = ctx.req.query('limit')
  const offsetParam = ctx.req.query('offset')
  const query = ctx.req.query('query') ?? ''

  const limit = Math.min(Number(limitParam) || 50, 100)
  const offset = Number(offsetParam) || 0

  const listParams = {
    limit,
    offset,
    orderBy: '-created_at' as const,
    ...(query ? { query } : {}),
  }
  const result = await clerkClient.users.getUserList(listParams)

  const data = result.data.map((user) => {
    const rawRole = (user.publicMetadata as { role?: unknown }).role
    const role: Role = isRole(rawRole) ? rawRole : 'user'
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? '',
      handle:
        (user.publicMetadata as { handle?: unknown }).handle ??
        user.username ??
        null,
      role,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    }
  })

  return ctx.json({ success: true, data, total: result.totalCount })
})

// PATCH /v1/admin/users/:id/role — assign a role to a Clerk user
usersAdminRouter.patch(
  '/:id/role',
  zValidator('json', patchRoleSchema),
  async (ctx) => {
    const auth = getAuth(ctx)
    const targetUserId = ctx.req.param('id')
    const { role } = ctx.req.valid('json')

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return ctx.json({ success: false, error: 'Invalid role' }, 400)
    }

    // Prevent self-demotion from admin (safety guard)
    if (auth?.userId === targetUserId) {
      const self = await clerkClient.users.getUser(targetUserId)
      const currentRole = (self.publicMetadata as { role?: unknown }).role
      if (
        currentRole === 'admin' &&
        ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf('admin')
      ) {
        return ctx.json(
          { success: false, error: 'Cannot demote your own admin account' },
          403,
        )
      }
    }

    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: { role },
    })

    ctx.set('auditAction', 'user.role.update')
    ctx.set('auditTargetId', targetUserId)
    ctx.set('auditActorId', auth?.userId ?? 'unknown')
    ctx.set('auditMeta', { role })

    return ctx.json({ success: true })
  },
)
