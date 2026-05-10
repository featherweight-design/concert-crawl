// apps/api/src/routes/feedback.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { db, feedback } from '@concert-crawl/db'
import { checkRateLimit } from '../lib/rate-limit.js'
import { apiLogger } from '../lib/logger.js'

const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'praise', 'other']),
  message: z.string().min(1, 'Message is required'),
  pageUrl: z.string(),
  metadata: z
    .object({
      theme: z.string().optional(),
      build: z.string().optional(),
      device: z.string().optional(),
    })
    .optional(),
})

export const feedbackRouter = new Hono()

feedbackRouter.use('*', clerkMiddleware())

feedbackRouter.post('/', async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId) {
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const { allowed, retryAfterMs } = checkRateLimit(
    `feedback:${authInfo.userId}`,
    1,
    60 * 60 * 1000, // 1 per hour
  )
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000)
    ctx.header('Retry-After', String(retryAfterSec))
    return ctx.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      429,
    )
  }

  const body = await ctx.req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return ctx.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      422,
    )
  }

  const { category, message, pageUrl, metadata } = parsed.data

  await db.insert(feedback).values({
    userId: authInfo.userId,
    pageUrl,
    category,
    message,
    metadata: metadata ?? null,
  })

  apiLogger.info(
    { userId: authInfo.userId, category, pageUrl },
    'feedback submitted',
  )

  return ctx.json({ success: true }, 201)
})
