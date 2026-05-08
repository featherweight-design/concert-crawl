import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, inviteCodes } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
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

  // Already redeemed by someone else
  if (invite.usedBy) {
    return ctx.json({ success: false, error: 'used' }, 409)
  }

  await db
    .update(inviteCodes)
    .set({ usedBy: userId, usedAt: new Date() })
    .where(eq(inviteCodes.id, invite.id))

  return ctx.json({ ok: true })
})
