import { Hono } from 'hono'
import { db, inviteCodes } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getAuthUser } from '../../middleware/auth.js'
import { randomBytes } from 'crypto'
import type { AdminVariables } from './index.js'
import { sendInviteCodeEmail } from '../../lib/email.js'
import { apiLogger } from '../../lib/logger.js'
import { runBackgroundTask } from '../../lib/background-tasks.js'

function generateCode(): string {
  // Format: BETA-XXXX-XXXX (uppercase hex, URL-safe)
  const part = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
  return `BETA-${part()}-${part()}`
}

const generateCodeSchema = z.object({
  expiresAt: z.string().datetime({ offset: true }).optional(),
  recipientEmail: z.string().email().optional(),
})

export const inviteCodesAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/invite-codes — list all codes
inviteCodesAdminRouter.get('/', async (ctx) => {
  const codes = await db
    .select()
    .from(inviteCodes)
    .orderBy(inviteCodes.createdAt)
  return ctx.json({ success: true, data: codes })
})

// POST /v1/admin/invite-codes — generate a new code
inviteCodesAdminRouter.post(
  '/',
  zValidator('json', generateCodeSchema),
  async (ctx) => {
    const { userId } = getAuthUser(ctx)
    const { expiresAt, recipientEmail } = ctx.req.valid('json')

    const [code] = await db
      .insert(inviteCodes)
      .values({
        code: generateCode(),
        createdBy: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning()

    if (!code) {
      return ctx.json(
        {
          success: false,
          error:
            'Invite code was created but no row was returned by the database',
        },
        500,
      )
    }

    ctx.set('auditAction', 'invite_code.create')
    ctx.set('auditTargetId', code.id)
    ctx.set('auditActorId', userId)

    if (recipientEmail) {
      runBackgroundTask(async () => {
        try {
          await sendInviteCodeEmail(recipientEmail, code.code)
        } catch (err) {
          apiLogger.error({ err }, 'Failed to send invite code email')
        }
      })
    }

    return ctx.json({ success: true, data: code }, 201)
  },
)

// POST /v1/admin/invite-codes/:id/revoke — revoke a code
inviteCodesAdminRouter.post('/:id/revoke', async (ctx) => {
  const { id } = ctx.req.param()
  const { userId } = getAuthUser(ctx)

  const [existing] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.id, id))
  if (!existing) {
    return ctx.json({ success: false, error: 'Invite code not found' }, 404)
  }
  if (existing.revokedAt) {
    return ctx.json(
      { success: false, error: 'Invite code already revoked' },
      400,
    )
  }

  const [updated] = await db
    .update(inviteCodes)
    .set({ revokedAt: new Date(), revokedBy: userId })
    .where(eq(inviteCodes.id, id))
    .returning()

  ctx.set('auditAction', 'invite_code.revoke')
  ctx.set('auditTargetId', id)
  ctx.set('auditActorId', userId)

  return ctx.json({ success: true, data: updated })
})
