// apps/api/src/routes/feedback.ts
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { db, feedback } from '@concert-crawl/db'
import { checkRateLimit } from '../lib/rate-limit.js'
import { apiLogger } from '../lib/logger.js'

const feedbackSchema = z.object({
  category: z.enum(['bug', 'idea', 'praise', 'other']),
  message: z.string().min(1, 'Message is required').max(2000),
  pageUrl: z.string().max(2048),
  metadata: z
    .object({
      theme: z.string().optional(),
      build: z.string().optional(),
      device: z.string().optional(),
      screenshot: z.string().nullish(),
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

  const body: unknown = await ctx.req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(body)
  if (!parsed.success) {
    return ctx.json(
      {
        success: false,
        error: 'Invalid input',
        details: parsed.error.flatten(),
      },
      422,
    )
  }

  // Rate-limit only valid submissions so a malformed body doesn't burn
  // the user's hourly token. Cap at 10/hour per user — beta testers
  // routinely batch-file 2-5 bugs/ideas after a single session, and the
  // earlier 1/hour cap blocked everything after the first submission
  // (issue #828). 10/hour still throttles obvious abuse while leaving
  // real beta-feedback flows headroom.
  const { allowed, retryAfterMs } = checkRateLimit(
    `feedback:${authInfo.userId}`,
    10,
    60 * 60 * 1000,
  )
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000)
    ctx.header('Retry-After', String(retryAfterSec))
    return ctx.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      429,
    )
  }

  const { category, message, pageUrl, metadata } = parsed.data

  try {
    await db.insert(feedback).values({
      userId: authInfo.userId,
      pageUrl,
      category,
      message,
      metadata: metadata ?? null,
    })
  } catch (err) {
    apiLogger.error({ err, userId: authInfo.userId }, 'feedback insert failed')
    return ctx.json({ success: false, error: 'Failed to submit feedback' }, 500)
  }

  apiLogger.info(
    { userId: authInfo.userId, category, pageUrl },
    'feedback submitted',
  )

  return ctx.json({ success: true }, 201)
})
