// apps/api/src/routes/billing-nudges.ts
//
// POST /v1/billing/nudges/dismiss + POST /v1/billing/nudges/trial-takeover-shown
// (eng infra spec Part 2 §1.4, §6; execution plan PR 4.2).
//
// Write-side of the lifecycle nudge predicates evaluated by GET /v1/users/me
// (lib/nudges.ts). Sibling router to billing.ts (same /v1/billing mount) —
// no Stripe dependency, kept separate so each file stays reviewable.

import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { db, userBilling } from '@concert-crawl/db'
import { apiLogger } from '../lib/logger.js'

const dismissBodySchema = z.object({
  nudge: z.enum(['day13', 'past-due']),
})

type NudgeColumn =
  | 'dayThirteenBannerDismissedAt'
  | 'pastDueBannerDismissedAt'
  | 'lastTrialEndedShownAt'

// Lazily upserts the user_billing row (spec §3, Decision 13) — mirrors the
// webhook-handler upsert so a nudge write never depends on prior billing
// state existing.
const stampNudgeColumn = async (
  userId: string,
  column: NudgeColumn,
): Promise<void> => {
  const now = new Date()
  const patch =
    column === 'dayThirteenBannerDismissedAt'
      ? { dayThirteenBannerDismissedAt: now }
      : column === 'pastDueBannerDismissedAt'
        ? { pastDueBannerDismissedAt: now }
        : { lastTrialEndedShownAt: now }
  await db
    .insert(userBilling)
    .values({ userId, ...patch })
    .onConflictDoUpdate({
      target: userBilling.userId,
      set: { ...patch, updatedAt: now },
    })
}

export const createBillingNudgesRouter = (): Hono => {
  const nudgesRouter = new Hono()

  nudgesRouter.use('*', clerkMiddleware())

  // Banner dismissals: day-13 is single-fire per trial expiry, past-due is
  // per-session — both predicates live in lib/nudges.ts; this endpoint only
  // stamps the timestamp.
  nudgesRouter.post('/nudges/dismiss', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    let rawBody: unknown = null
    try {
      rawBody = await ctx.req.json()
    } catch (err) {
      apiLogger.warn({ err, userId }, 'nudges/dismiss: unparseable body')
    }
    const parsedBody = dismissBodySchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return ctx.json(
        {
          success: false,
          code: 'invalid_body',
          error: "Body must be { nudge: 'day13' | 'past-due' }",
        },
        400,
      )
    }

    const column: NudgeColumn =
      parsedBody.data.nudge === 'day13'
        ? 'dayThirteenBannerDismissedAt'
        : 'pastDueBannerDismissedAt'

    try {
      await stampNudgeColumn(userId, column)
      return ctx.json({ success: true })
    } catch (err) {
      apiLogger.error(
        { err, userId, nudge: parsedBody.data.nudge },
        'nudges/dismiss: failed',
      )
      return ctx.json({ success: false, error: 'Failed to dismiss nudge' }, 500)
    }
  })

  // Trial-ended takeover shown acknowledgement — single-fire per trial
  // expiry (#780 §2); GET /v1/users/me stops returning the flag once the
  // stamp postdates trialEndsAt.
  nudgesRouter.post('/nudges/trial-takeover-shown', async (ctx) => {
    const authInfo = getAuth(ctx)
    if (!authInfo?.userId) {
      return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    }
    const userId = authInfo.userId

    try {
      await stampNudgeColumn(userId, 'lastTrialEndedShownAt')
      return ctx.json({ success: true })
    } catch (err) {
      apiLogger.error({ err, userId }, 'nudges/trial-takeover-shown: failed')
      return ctx.json(
        { success: false, error: 'Failed to record takeover shown' },
        500,
      )
    }
  })

  return nudgesRouter
}
