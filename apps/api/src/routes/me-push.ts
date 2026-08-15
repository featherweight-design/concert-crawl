// apps/api/src/routes/me-push.ts
// Web push (#971): subscribe / unsubscribe / preferences endpoints.
import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  pushSubscriptions,
  userNotificationPreferences,
} from '@concert-crawl/db'
import { apiLogger } from '../lib/logger.js'

export const mePushRouter = new Hono()

mePushRouter.use('*', clerkMiddleware())

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
})

// `.strict()`, like the sibling toggle PATCH in routes/spotify.ts. Without it
// a misspelled key is stripped and the request 200s having changed nothing,
// which is the hardest kind of no-op to notice from the client.
const preferencesSchema = z
  .object({
    masterEnabled: z.boolean().optional(),
    watchUpdatesEnabled: z.boolean().optional(),
    priceDropsEnabled: z.boolean().optional(),
    // Artist following (migration 0078). Same partial-PATCH shape as the three
    // above: an absent key means "leave it alone", never "reset it".
    artistAlertsEnabled: z.boolean().optional(),
    artistAutoWatch: z.boolean().optional(),
    weeklyDigestEnabled: z.boolean().optional(),
    // The only field here that is not a push preference. It gates the
    // 'product' email family and has a second writer: the signed one-click
    // link in routes/email-unsubscribe.ts. Whichever wrote last wins, and
    // this endpoint is the read of record, so a user who unsubscribed by
    // link sees the switch already off.
    productEmailsEnabled: z.boolean().optional(),
  })
  .strict()

// Read VAPID vars directly from process.env rather than the validated
// `env` object so this route module doesn't trigger env.ts evaluation on
// import — vitest unit tests import routes without a populated .env, and
// env.ts calls process.exit(1) on invalid parse. When any of the three are
// unset or empty, subscribe returns 503.
const requireVapid = () => {
  const publicKey = process.env['VAPID_PUBLIC_KEY']
  const privateKey = process.env['VAPID_PRIVATE_KEY']
  // VAPID_SUBJECT is the standard name from RFC 8292 — its value becomes
  // the JWT `sub` claim on each push request. web-push libraries expect
  // exactly this env key.
  const subject = process.env['VAPID_SUBJECT']
  if (!publicKey || !privateKey || !subject) return false
  return true
}

// POST /v1/me/push/subscriptions — upsert on endpoint. Returns { id }.
mePushRouter.post(
  '/push/subscriptions',
  zValidator('json', subscribeSchema),
  async (ctx) => {
    const authInfo = getAuth(ctx)
    const userId = authInfo?.userId ?? null
    if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    if (!requireVapid()) {
      return ctx.json(
        { success: false, error: 'Push notifications not configured' },
        503,
      )
    }
    const body = ctx.req.valid('json')
    try {
      const [row] = await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: body.userAgent,
          lastUsedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            userId,
            p256dh: body.keys.p256dh,
            auth: body.keys.auth,
            userAgent: body.userAgent,
            // Clear any prior soft-disable so a fresh subscribe on the same
            // endpoint re-enables push for that device.
            disabledAt: null,
            lastUsedAt: new Date(),
          },
        })
        .returning({ id: pushSubscriptions.id })
      return ctx.json({ success: true, data: { id: row?.id } })
    } catch (insertErr) {
      apiLogger.warn(
        { userId, err: insertErr },
        'me-push: failed to upsert subscription',
      )
      return ctx.json({ success: false, error: 'Insert failed' }, 500)
    }
  },
)

// DELETE /v1/me/push/subscriptions/:id — remove by row UUID + ownership check.
// Chosen over `/subscriptions/:endpoint` because push endpoint URLs contain /
// and ?, and over a DELETE-with-body pattern because DELETE bodies aren't
// idiomatic REST + some intermediaries strip them.
mePushRouter.delete('/push/subscriptions/:id', async (ctx) => {
  const authInfo = getAuth(ctx)
  const userId = authInfo?.userId ?? null
  if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  const idParam = z.string().uuid().safeParse(ctx.req.param('id'))
  if (!idParam.success) {
    return ctx.json({ success: false, error: 'Invalid subscription id' }, 400)
  }
  try {
    const result = await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.id, idParam.data),
          eq(pushSubscriptions.userId, userId),
        ),
      )
      .returning({ id: pushSubscriptions.id })
    if (result.length === 0) {
      return ctx.json({ success: false, error: 'Not found' }, 404)
    }
    return ctx.json({ success: true, data: null })
  } catch (deleteErr) {
    apiLogger.warn(
      { userId, err: deleteErr },
      'me-push: failed to delete subscription',
    )
    return ctx.json({ success: false, error: 'Delete failed' }, 500)
  }
})

// Mirrors the column defaults in migration 0078. The artist defaults are
// asymmetric on purpose: following is the opt-in, so alerts default on;
// following must never silently mutate Watching, so auto-watch defaults off.
const DEFAULT_PREFS = {
  masterEnabled: false,
  watchUpdatesEnabled: true,
  priceDropsEnabled: true,
  artistAlertsEnabled: true,
  artistAutoWatch: false,
  weeklyDigestEnabled: true,
  // Defaults true to match the column: signing up is the opt-in, and the
  // one-click link is how it goes off.
  productEmailsEnabled: true,
} as const

// GET /v1/me/notification-preferences — side-effect-free. Returns defaults
// when no row exists; first write happens on PATCH (upsert).
mePushRouter.get('/notification-preferences', async (ctx) => {
  const authInfo = getAuth(ctx)
  const userId = authInfo?.userId ?? null
  if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)
  try {
    const [row] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
    const data = row
      ? {
          masterEnabled: row.masterEnabled,
          watchUpdatesEnabled: row.watchUpdatesEnabled,
          priceDropsEnabled: row.priceDropsEnabled,
          artistAlertsEnabled: row.artistAlertsEnabled,
          artistAutoWatch: row.artistAutoWatch,
          weeklyDigestEnabled: row.weeklyDigestEnabled,
          productEmailsEnabled: row.productEmailsEnabled,
        }
      : DEFAULT_PREFS
    return ctx.json({ success: true, data })
  } catch (readErr) {
    apiLogger.warn({ userId, err: readErr }, 'me-push: prefs read failed')
    return ctx.json({ success: false, error: 'Read failed' }, 500)
  }
})

// PATCH /v1/me/notification-preferences — upsert partial flags.
mePushRouter.patch(
  '/notification-preferences',
  zValidator('json', preferencesSchema),
  async (ctx) => {
    const authInfo = getAuth(ctx)
    const userId = authInfo?.userId ?? null
    if (!userId) return ctx.json({ success: false, error: 'Unauthorized' }, 401)
    const body = ctx.req.valid('json')
    if (Object.keys(body).length === 0) {
      return ctx.json({ success: false, error: 'No fields provided' }, 400)
    }
    try {
      // Write ONLY the keys the caller sent, and let Postgres supply the rest
      // from the row it already holds. The obvious alternative — SELECT, merge
      // in JS, write all seven — loses updates: productEmailsEnabled has a
      // second writer (the signed one-click link in routes/email-unsubscribe),
      // so a PATCH of an unrelated switch that read the row before that link
      // landed would write the pre-unsubscribe value back over it. Absent keys
      // never appear in the UPDATE at all, which removes the window entirely.
      const [row] = await db
        .insert(userNotificationPreferences)
        .values({ ...DEFAULT_PREFS, userId, ...body })
        .onConflictDoUpdate({
          target: userNotificationPreferences.userId,
          set: { ...body, updatedAt: sql`now()` },
        })
        .returning()
      if (!row) {
        apiLogger.warn({ userId }, 'me-push: prefs upsert returned no row')
        return ctx.json({ success: false, error: 'Write failed' }, 500)
      }
      return ctx.json({
        success: true,
        data: {
          masterEnabled: row.masterEnabled,
          watchUpdatesEnabled: row.watchUpdatesEnabled,
          priceDropsEnabled: row.priceDropsEnabled,
          artistAlertsEnabled: row.artistAlertsEnabled,
          artistAutoWatch: row.artistAutoWatch,
          weeklyDigestEnabled: row.weeklyDigestEnabled,
          productEmailsEnabled: row.productEmailsEnabled,
        },
      })
    } catch (writeErr) {
      apiLogger.warn({ userId, err: writeErr }, 'me-push: prefs write failed')
      return ctx.json({ success: false, error: 'Write failed' }, 500)
    }
  },
)
