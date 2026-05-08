import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, inviteCodes } from '@concert-crawl/db'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { clerkAuth, requireAuth, getAuthUser } from '../../middleware/auth.js'

const redeemSchema = z.object({
  code: z.string().regex(/^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
})

export const redeemCodeRouter = new Hono().use(clerkAuth).use(requireAuth)

redeemCodeRouter.post('/', zValidator('json', redeemSchema), async (ctx) => {
  const { userId } = getAuthUser(ctx)
  const { code } = ctx.req.valid('json')

  const [invite] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code))

  if (!invite) {
    return ctx.json({ success: false, error: 'notfound' }, 404)
  }

  // Idempotent: already redeemed by this user
  if (invite.usedBy === userId) {
    return ctx.json({ ok: true })
  }

  // Already used by someone else
  if (invite.usedBy) {
    return ctx.json({ success: false, error: 'used' }, 409)
  }

  if (invite.revokedAt) {
    return ctx.json({ success: false, error: 'revoked' }, 410)
  }

  const now = new Date()
  if (invite.expiresAt && invite.expiresAt < now) {
    return ctx.json({ success: false, error: 'expired' }, 410)
  }

  // Atomic conditional update — prevents double-redemption under concurrent requests
  const updated = await db
    .update(inviteCodes)
    .set({ usedBy: userId, usedAt: now })
    .where(
      and(
        eq(inviteCodes.id, invite.id),
        isNull(inviteCodes.usedBy),
        isNull(inviteCodes.revokedAt),
        or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
      ),
    )
    .returning({ id: inviteCodes.id })

  if (updated.length === 0) {
    return ctx.json({ success: false, error: 'used' }, 409)
  }

  return ctx.json({ ok: true })
})
