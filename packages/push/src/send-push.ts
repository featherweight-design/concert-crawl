import webpush, { WebPushError } from 'web-push'
import { and, eq, isNull } from 'drizzle-orm'
import {
  db,
  pushSubscriptions,
  userNotificationPreferences,
} from '@concert-crawl/db'
import { createLogger } from '@concert-crawl/logger'
import {
  PUSH_ELIGIBLE_CATEGORIES,
  PRICE_DROP_CATEGORY,
  WATCH_UPDATE_CATEGORIES,
  type UserNotificationCategory,
} from './notification-categories.js'

const pushLogger = createLogger('push')

let configured = false

// Read VAPID vars directly from process.env rather than a validated `env`
// object so this module doesn't couple to any app's env.ts evaluation on
// import (apps/api's env.ts calls process.exit(1) on invalid parse — vitest
// unit tests import route registries without a populated .env).
//
// VAPID_SUBJECT is the standard name from RFC 8292; its value becomes the
// JWT `sub` claim on each push request. RFC 8292 permits either a `mailto:`
// URI or an `https://` URL, so bare emails get the `mailto:` prefix but any
// value that already carries a URI scheme (e.g. `mailto:`, `https://`) is
// passed through untouched.
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i
const configure = () => {
  if (configured) return true
  const publicKey = process.env['VAPID_PUBLIC_KEY']
  const privateKey = process.env['VAPID_PRIVATE_KEY']
  const rawSubject = process.env['VAPID_SUBJECT']
  if (!publicKey || !privateKey || !rawSubject) return false
  const vapidSubject = SCHEME_RE.test(rawSubject)
    ? rawSubject
    : `mailto:${rawSubject}`
  webpush.setVapidDetails(vapidSubject, publicKey, privateKey)
  configured = true
  return true
}

export interface SendPushInput {
  userId: string
  category: UserNotificationCategory
  title: string
  body: string
  actionUrl?: string
  /**
   * Optional stable identifier so repeated pushes for the same target coalesce
   * into a single OS notification (e.g. same watched event's status changing
   * twice — the second push replaces the first). Passed through to the SW as
   * `payload.tag`.
   */
  tag?: string
}

/**
 * Fires web push for a notification whose row was just written to the
 * `notifications` table. Fan-out targets the user's active push_subscriptions
 * (disabled_at IS NULL). Respects per-user preferences:
 *
 * - `masterEnabled` gates everything.
 * - `watchUpdatesEnabled` gates watch.cancelled/postponed/soldout/backonsale.
 * - `priceDropsEnabled` gates watch.pricedrop.
 * - `artist.new_show` has no sub-toggle here — its per-connection
 *   `pushEnabled` + premium entitlement gates live at the fan-out call site.
 * - Non-push-eligible categories (contest.*) return without firing.
 *
 * Preferences default to `master_enabled=false` when no row exists, so a user
 * who's never opted in never receives push. Sub-toggle defaults are true so
 * once they flip master on both categories fire unless the user toggles the
 * sub-toggles off.
 *
 * On 404 / 410 responses, the subscription is soft-disabled (disabled_at =
 * now) matching the existing spotify-sync convention. The next successful
 * subscribe on a fresh endpoint effectively re-enables push for that device.
 *
 * Best-effort: any error is caught and logged. Notification writers call this
 * after their transactional row insert so a push failure never rolls back the
 * bell/inbox side.
 */
export async function sendPushForNotification(input: SendPushInput): Promise<{
  delivered: number
  skipped:
    | 'not_configured'
    | 'not_eligible'
    | 'category_off'
    | 'master_off'
    | 'no_subscriptions'
    | 'db_error'
    | null
}> {
  if (!PUSH_ELIGIBLE_CATEGORIES.has(input.category)) {
    return { delivered: 0, skipped: 'not_eligible' }
  }
  if (!configure()) {
    return { delivered: 0, skipped: 'not_configured' }
  }

  // Best-effort: catch DB errors from both prefs and subscriptions queries.
  // Bubbling would break the caller's docstring contract (never throw) and
  // could roll back the transactional row insert on the writer side.
  let prefs: typeof userNotificationPreferences.$inferSelect | undefined
  try {
    ;[prefs] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, input.userId))
  } catch (readPrefsErr) {
    pushLogger.warn(
      { userId: input.userId, err: readPrefsErr },
      'send-push: prefs read failed',
    )
    return { delivered: 0, skipped: 'db_error' }
  }

  const masterOn = prefs?.masterEnabled ?? false
  if (!masterOn) return { delivered: 0, skipped: 'master_off' }

  const watchUpdatesOn = prefs?.watchUpdatesEnabled ?? true
  const priceDropsOn = prefs?.priceDropsEnabled ?? true
  const isWatchUpdate = WATCH_UPDATE_CATEGORIES.has(input.category)
  const isPriceDrop = input.category === PRICE_DROP_CATEGORY
  if (isWatchUpdate && !watchUpdatesOn) {
    return { delivered: 0, skipped: 'category_off' }
  }
  if (isPriceDrop && !priceDropsOn) {
    return { delivered: 0, skipped: 'category_off' }
  }

  let subscriptions: (typeof pushSubscriptions.$inferSelect)[]
  try {
    subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, input.userId),
          isNull(pushSubscriptions.disabledAt),
        ),
      )
  } catch (readSubsErr) {
    pushLogger.warn(
      { userId: input.userId, err: readSubsErr },
      'send-push: subscriptions read failed',
    )
    return { delivered: 0, skipped: 'db_error' }
  }

  if (subscriptions.length === 0) {
    return { delivered: 0, skipped: 'no_subscriptions' }
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? '/',
    ...(input.tag && { tag: input.tag }),
  })

  let delivered = 0
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        )
        delivered += 1
      } catch (sendErr) {
        if (sendErr instanceof WebPushError) {
          if (sendErr.statusCode === 404 || sendErr.statusCode === 410) {
            // Endpoint gone — soft-disable so we don't retry forever.
            try {
              await db
                .update(pushSubscriptions)
                .set({ disabledAt: new Date() })
                .where(eq(pushSubscriptions.id, sub.id))
            } catch (disableErr) {
              pushLogger.warn(
                { subscriptionId: sub.id, err: disableErr },
                'send-push: failed to soft-disable stale endpoint',
              )
            }
            return
          }
        }
        pushLogger.warn(
          {
            subscriptionId: sub.id,
            userId: input.userId,
            category: input.category,
            err: sendErr,
          },
          'send-push: delivery failed',
        )
      }
    }),
  )

  return { delivered, skipped: null }
}
