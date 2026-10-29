import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, inviteCodes } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
import { checkRateLimit } from '../../lib/rate-limit.js'

const codeSchema = z.object({
  code: z
    .string()
    .regex(/^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid code format'),
})

export const validateCodeRouter = new Hono()

validateCodeRouter.post('/', zValidator('json', codeSchema), async (ctx) => {
  const ip =
    ctx.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // Fail closed: this is the brute-force guard on invite codes, and the lookup
  // it protects reads the same database, so closing costs almost nothing.
  const limit = await checkRateLimit(
    `validate-code:${ip}`,
    10,
    60 * 60 * 1000,
    { onStoreError: 'deny' },
  )
  if (!limit.allowed) {
    // Set on every 429, store-error denials included: a client that cannot
    // see the window backs off by guessing.
    ctx.header('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)))
    return ctx.json({ success: false, error: 'ratelimit' }, 429)
  }

  const { code } = ctx.req.valid('json')

  const [invite] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code))

  if (!invite) {
    return ctx.json({ success: false, error: 'notfound' }, 404)
  }
  if (invite.revokedAt) {
    return ctx.json({ success: false, error: 'notfound' }, 404)
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return ctx.json({ success: false, error: 'expired' }, 410)
  }
  if (invite.usedBy) {
    return ctx.json({ success: false, error: 'used' }, 409)
  }

  return ctx.json({ ok: true })
})
