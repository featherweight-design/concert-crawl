import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, waitlistEntries } from '@concert-crawl/db'
import { checkRateLimit } from '../lib/rate-limit.js'

const waitlistSchema = z.object({
  email: z.string().email(),
})

export const waitlistRouter = new Hono()

waitlistRouter.post('/', zValidator('json', waitlistSchema), async (ctx) => {
  const ip =
    ctx.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limit = checkRateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000)
  if (!limit.allowed) {
    return ctx.json({ success: false, error: 'Too many requests' }, 429)
  }

  const { email } = ctx.req.valid('json')

  await db.insert(waitlistEntries).values({ email, ip }).onConflictDoNothing()

  // Always return 200 — no email enumeration
  return ctx.json({ success: true })
})
