import { Hono } from 'hono'
import { db, inviteCodes } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
import { getAuthUser } from '../../middleware/auth.js'
import { randomBytes } from 'crypto'
import type { AdminVariables } from './index.js'

function generateCode(): string {
  // Format: BETA-XXXX-XXXX (uppercase alphanumeric, URL-safe)
  const part = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `BETA-${part()}-${part()}`
}

export const inviteCodesAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/invite-codes — list all codes
inviteCodesAdminRouter.get('/', async (c) => {
  const codes = await db
    .select()
    .from(inviteCodes)
    .orderBy(inviteCodes.createdAt)
  return c.json({ success: true, data: codes })
})

// POST /v1/admin/invite-codes — generate a new code
inviteCodesAdminRouter.post('/', async (c) => {
  const { userId } = getAuthUser(c)
  const body = await c.req.json<{ expiresAt?: string }>().catch(() => ({}))

  const [code] = await db
    .insert(inviteCodes)
    .values({
      code: generateCode(),
      createdBy: userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning()

  c.set('auditAction', 'invite_code.create')
  c.set('auditTargetId', code!.id)
  c.set('auditActorId', userId)

  return c.json({ success: true, data: code }, 201)
})

// POST /v1/admin/invite-codes/:id/revoke — revoke a code
inviteCodesAdminRouter.post('/:id/revoke', async (c) => {
  const { id } = c.req.param()
  const { userId } = getAuthUser(c)

  const [existing] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.id, id))
  if (!existing) {
    return c.json({ success: false, error: 'Invite code not found' }, 404)
  }
  if (existing.revokedAt) {
    return c.json({ success: false, error: 'Invite code already revoked' }, 400)
  }

  const [updated] = await db
    .update(inviteCodes)
    .set({ revokedAt: new Date(), revokedBy: userId })
    .where(eq(inviteCodes.id, id))
    .returning()

  c.set('auditAction', 'invite_code.revoke')
  c.set('auditTargetId', id)
  c.set('auditActorId', userId)

  return c.json({ success: true, data: updated })
})
